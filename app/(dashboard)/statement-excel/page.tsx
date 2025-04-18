'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileUp, Table as TableIcon, Loader2, ChevronDown, ChevronRight, Phone, MapPin, Clock, Building2, Trash2, Edit2, Check, X, Camera, CameraOff, Upload, Download, Save, FileDown, Eye } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
// Import moment-timezone instead of date-fns
import moment from 'moment-timezone';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import StatementPDF from './statement-pdf';
import { FileUpload } from '@/components/file-upload';
import { TakeImage } from '@/components/take-image';
import { compressImage, convertImage, uploadFileToS3, getS3BucketUrl } from '@/lib/helper';
import { useSession } from 'next-auth/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExcelData {
  [key: string]: string | number;
}

interface PartySection {
  partyName: string;
  partyCode: string;
  location: string;
  contact: string;
  creditDays: string;
  data: ExcelData[];
}

interface SavedData {
  images : string[];
  location: { lat: number; lng: number } | null;
  timestamp: Date | null;
  address: string | null;
  visitedBy: string | null;
}

interface StatementFile {
  id: string;
  name: string;
  uploadDate: Date;     // Actual date when file was uploaded
  statementDate: Date;  // Selected date for which statement belongs to
  partySections: PartySection[];
  headers: string[];
  savedParties?: Record<string, SavedData>;
}

export default function StatementExcelPage() {
  const [files, setFiles] = useState<StatementFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<StatementFile | null>(null);
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState<string>('');
  const [selectedPDFSection, setSelectedPDFSection] = useState<PartySection | null>(null);
  const [capturedImages, setCapturedImages] = useState<Record<string, string[]>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StatementFile | null>(null);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState<boolean>(false);
  const [isRecentStatementsExpanded, setIsRecentStatementsExpanded] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [isLoadingStatements, setIsLoadingStatements] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [visitFilter, setVisitFilter] = useState<'all' | 'visited' | 'unvisited'>('all');
  const [userFilter, setUserFilter] = useState<string>(() => {
    // Initialize from localStorage if available, otherwise default to 'all'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('statementUserFilter') || 'all';
    }
    return 'all';
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [imageKeys, setImageKeys] = useState<Record<string, string[]>>({});
  const { data: session } = useSession();
  const isAdmin = session?.user?.type === 'ADMIN';
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [failedDownloads, setFailedDownloads] = useState<Array<{partyCode: string, partyName: string}>>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Update localStorage when userFilter changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('statementUserFilter', userFilter);
    }
  }, [userFilter]);

  // Memoize filtered files to prevent unnecessary re-renders
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      try {
        const statementDate = new Date(file.statementDate);
        const selectedDateValue = new Date(selectedDate);

        // Check if dates are valid
        if (isNaN(statementDate.getTime()) || isNaN(selectedDateValue.getTime())) {
          console.warn('Invalid date encountered:', { statementDate, selectedDate });
          return false;
        }

        // Use moment for comparison
        return moment(statementDate).format('YYYY-MM-DD') === moment(selectedDateValue).format('YYYY-MM-DD');
      } catch (error) {
        console.error('Error comparing dates:', error);
        return false;
      }
    });
  }, [files, selectedDate]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setSelectedFile(null);
    setExpandedParties(new Set());

    // Handle multiple files
    selectedFiles.forEach(file => {
      handleUpload(file);
    });
  };

  const handleUpload = async (file: File) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('selectedDate', selectedDate.toISOString());

    try {
      const response = await fetch('/api/statement-excel/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Check if partySections is properly defined and not empty
      if (!result.partySections || !Array.isArray(result.partySections) || result.partySections.length === 0) {
        console.error('No party sections found in the response:', result);
        toast({
          title: "Warning",
          description: "No party statements found in the file. Please check if this is the correct Excel file.",
        });
        setIsLoading(false);
        return;
      }

      // Log the first few party sections to debug
      console.log('Upload response first sections:', result.partySections.slice(0, 3));

      // Create a new file object from the response
      const newFile: StatementFile = {
        id: result.id,
        name: result.name,
        uploadDate: new Date(result.uploadDate),
        statementDate: new Date(result.statementDate),
        partySections: result.partySections || [],
        headers: result.headers || [],
        savedParties: {},
      };

      setFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile);

      // All party statements collapsed by default
      setExpandedParties(new Set());

      toast({
        title: "Success",
        description: `Loaded ${result.partySections.length} party statements`,
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: StatementFile) => {
    // Check if we're actually changing files
    if (selectedFile?.id === file.id) {
      return; // No need to do anything if clicking the same file
    }

    const fetchStatementDetails = async (statementId: string) => {
      setIsLoadingDetails(true); // Start loading
      try {
        const response = await fetch(`/api/statement-excel/oper?id=${statementId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch statement details');
        }
        
        const data = await response.json();

        console.log('Statement details loaded:', {
          id: data.id,
          name: data.name,
          sectionsCount: data.partySections?.length || 0,
          partySectionsType: data.partySections ? typeof data.partySections : 'undefined',
          isArray: Array.isArray(data.partySections),
          firstSection: data.partySections?.[0],
        });

        // Validate partySections before proceeding
        if (!data.partySections || !Array.isArray(data.partySections) || data.partySections.length === 0) {
          console.error('No party sections found in the response:', data);
          toast({
            title: "Warning",
            description: "No party statements found in the file. The data might be corrupted. Please try re-uploading the file.",
            variant: "destructive",
          });
          setIsLoadingDetails(false);
          return;
        }

        // Create a complete statement file with all data
        const completeFile: StatementFile = {
          id: data.id,
          name: data.name,
          uploadDate: new Date(data.uploadDate),
          statementDate: new Date(data.statementDate),
          partySections: data.partySections.map((section: any) => ({
            partyCode: section.partyCode || '',
            partyName: section.partyName || '',
            location: section.location || '',
            contact: section.contact || '',
            creditDays: section.creditDays || '',
            data: Array.isArray(section.data) ? section.data : []
          })),
          headers: data.headers || [],
          savedParties: data.savedParties || {}
        };

        console.log('Party sections processed:', completeFile.partySections.length);

        // Clear search term and filters when changing files
        setSearchTerm('');
        setVisitFilter('all');
        setUserFilter('all');
        setShowSavedOnly(false);
        setSelectedFile(completeFile);

        // All party statements collapsed by default
        setExpandedParties(new Set());

        // Reset pagination when changing files
        setCurrentPage(1);
      } catch (error) {
        console.error('Error fetching statement details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch statement details.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDetails(false); // End loading
      }
    };

    fetchStatementDetails(file.id);
  };

  const handleFileDelete = async (fileId: string) => {
    // Client-side check for admin privileges
    if (!session?.user?.type || session.user.type !== 'ADMIN') {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete statements.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/statement-excel/oper?id=${fileId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 403) {
          throw new Error('Only administrators can delete statements');
        }
        throw new Error(result.error || 'Failed to delete statement');
      }

      // Update local state after successful deletion
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      setFileToDelete(null);

      toast({
        title: "Success",
        description: "Statement deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting statement:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete statement",
        variant: "destructive",
      });
    }
  };

  const handleFileRename = async (fileId: string) => {
    try {
      // Remove any extension from the new name if user added one
      const newName = removeFileExtension(editingFileName);

      //backend call 
      const response = await fetch(`/api/statement-excel/oper?id=${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });


      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, name: newName } : f
      ));

      setEditingFileId(null);

      // Update selected file if it's being renamed
      if (selectedFile?.id === fileId) {
        setSelectedFile(prev => prev ? { ...prev, name: newName } : null);
      }
      toast({
        title: "Success",
        description: "File renamed successfully",
      });
    } catch (error) {
      console.error('Error renaming file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename file",
        variant: "destructive",
    });
  }
};

  // Get unique users who have visited any party - only for the currently selected statement
  const uniqueUsers = useMemo(() => {
    if (!selectedFile?.savedParties) return [];
    
    const users = new Set<string>();
    
    // Only check the currently selected file
    Object.entries(selectedFile.savedParties).forEach(([partyCode, data]) => {
      // Include all usernames including "admin" but exclude "Unknown User"
      if (data.visitedBy && data.visitedBy !== "Unknown User") {
        users.add(data.visitedBy);
      }
    });
    
    // Debug log
    console.log(`Found ${users.size} unique users in the current statement: ${Array.from(users).join(', ')}`);
    
    return Array.from(users).sort();
  }, [selectedFile?.savedParties]);

  // Get statistics for each user - only for the currently selected statement
  const userStats = useMemo(() => {
    if (!selectedFile?.savedParties) return {};
    
    const stats: Record<string, number> = {};
    
    // Initialize all users with 0
    uniqueUsers.forEach(user => {
      stats[user] = 0;
    });
    
    // Track unique parties visited by each user in the current statement
    const userParties = new Map<string, Set<string>>();
    uniqueUsers.forEach(user => {
      userParties.set(user, new Set());
    });
    
    // Count visits only from the currently selected statement
    Object.entries(selectedFile.savedParties).forEach(([partyCode, data]) => {
      // Count visits from all users except "Unknown User"
      if (data.visitedBy && data.visitedBy !== "Unknown User") {
        // Only count each unique party code once per user
        const partySet = userParties.get(data.visitedBy);
        if (partySet && !partySet.has(partyCode)) {
          partySet.add(partyCode);
          stats[data.visitedBy] = (stats[data.visitedBy] || 0) + 1;
        }
      }
    });
    
    // Debug log
    console.log('User visit counts in current statement:', stats);
    
    return stats;
  }, [selectedFile?.savedParties, uniqueUsers]);

  const filteredSections = useMemo(() => {
    if (!selectedFile?.partySections) {
      console.log('No party sections available in selectedFile', selectedFile);
      return [];
    }

    console.log('Filtering sections:', {
      totalSections: selectedFile.partySections.length,
      searchTerm,
      visitFilter,
      userFilter
    });
    
    const filtered = selectedFile.partySections.filter(section => {
      if (!section) {
        console.log('Empty section found');
        return false;
      }
      
      // Check search term match
      const matchesSearch = !searchTerm ? true : (() => {
        const searchTermLower = searchTerm.toLowerCase();
        const partyName = section.partyName?.toLowerCase() || '';
        const location = section.location?.toLowerCase() || '';
        const contact = section.contact?.toLowerCase() || '';
        const partyCode = section.partyCode?.toLowerCase() || '';
        
        return partyName.includes(searchTermLower) ||
               location.includes(searchTermLower) ||
               contact.includes(searchTermLower) ||
               partyCode.includes(searchTermLower);
      })();

      // Check visit filter match
      const matchesVisitFilter = visitFilter === 'all' ? true :
        visitFilter === 'visited' ? (selectedFile.savedParties?.[section.partyCode] ?? false) :
        !(selectedFile.savedParties?.[section.partyCode] ?? false);

      // Check user filter match
      const savedData = selectedFile.savedParties?.[section.partyCode];
      const matchesUserFilter = userFilter === 'all' ? true :
        savedData?.visitedBy === userFilter;

      return matchesSearch && matchesVisitFilter && matchesUserFilter;
    });
    
    console.log('Filtered sections result:', {
      filteredCount: filtered.length,
      firstFiltered: filtered[0]
    });

    return filtered;
  }, [selectedFile, searchTerm, visitFilter, userFilter]);

  const handlePartyExpand = (partyCode: string) => {
    setExpandedParties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partyCode)) {
        newSet.delete(partyCode);
      } else {
        newSet.add(partyCode);
      }
      return newSet;
    });
  };

  // Update the handleImageUpload function
  const handleImageUpload = (imageKey: number | string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const partyCode = imageKey.toString();

      // Set uploading state for the specific party
      setUploadingImage(partyCode);

      // Convert and compress the image
      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      
      // Create a unique key for S3 upload
      const prefixKeyId = `statement/${selectedFile?.id}/party#${partyCode}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      
      // Upload the file to S3
      const uploadedImage = await uploadFileToS3(compressedFile, prefixKeyId);

      // Update UI state to show the uploaded image URL
      setCapturedImages(prev => {
        // Ensure currentImages is always an array using type assertion
        const currentImages = prev[partyCode] as string[] || [];
        return {
          ...prev,
          [partyCode]: [...currentImages, uploadedImage.key]
        };
      });

      // Save image reference to local state to be used when saving
      setImageKeys(prev => {
        const currentKeys = prev[partyCode] || [];
        return {
          ...prev,
          [partyCode]: [...currentKeys, uploadedImage.key]
        };
      });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        duration: 2000,
      });
    } finally {
      setUploadingImage(null);
      e.target.value = '';
    }
  };

  // Function to get current location
  const getCurrentLocation = (): Promise<{lat: number, lng: number, address: string}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Get address using reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name || "Unknown location";
            resolve({ lat, lng, address });
          } catch (error) {
            // If geocoding fails, still return coords
            resolve({ lat, lng, address: "Location found" });
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  // Function to handle save
  const handleSave = async (partyCode: string) => {
    if (!selectedFile || !session?.user) return;

    setIsSaving(partyCode);

    try {
      // Get current location
      const locationData = await getCurrentLocation();

      // Get the user's name from the session - use full name when available
      const userName = session.user.name || session.user.username || 'Unknown User';
      console.log("Saving statement with userName:", userName);

      // Prepare data for API call
      const saveData = {
        statementId: selectedFile.id,
        partyCode: partyCode,
        images: capturedImages[partyCode] || [],
        location: locationData,
        address: await getAddressFromCoordinates(locationData.lat, locationData.lng),
        visitedBy: userName
      };

      // Send data to API
      const response = await fetch('/api/statement-excel/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Save failed');
      }

      // Update local state
      const updatedSavedParties = {
        ...(selectedFile.savedParties || {}),
        [partyCode]: {
          images: capturedImages[partyCode] || [],
          location: locationData,
          timestamp: new Date(),
          address: saveData.address,
          visitedBy: userName
        }
      };

      // Update files list with proper state management
      setFiles(prev =>
        prev.map(file => {
          if (file.id === selectedFile.id) {
            return {
              ...file,
              savedParties: updatedSavedParties
            };
          }
          return file;
        })
      );

      // Update selected file
      setSelectedFile(prevFile => {
        if (!prevFile) return prevFile;
        return {
          ...prevFile,
          savedParties: updatedSavedParties
        };
      });

      toast({
        title: "Success",
        description: "Statement saved successfully",
      });
      
      // Refresh the statements list to ensure all statements are visible
      // but wait a moment to ensure server has processed the save
      setTimeout(() => {
        fetchStatements();
      }, 500);
      
    } catch (error) {
      console.error('Error saving statement:', error);
      toast({
        title: "Error",
        description: "Failed to save statement",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  // Function to reset saved data
  const handleReset = async (partyCode: string) => {
    if (!selectedFile) return;

    try {
      // Call reset API
      const response = await fetch(`/api/statement-excel/save?statementId=${selectedFile.id}&partyCode=${partyCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Reset failed');
      }

      // Remove captured image
      setCapturedImages(prev => {
        const newImages = { ...prev };
        delete newImages[partyCode];
        return newImages;
      });

      // Remove image keys
      setImageKeys(prev => {
        const newKeys = { ...prev };
        delete newKeys[partyCode];
        return newKeys;
      });

      // Update local state with proper null checks
      const newSavedParties = { ...(selectedFile.savedParties || {}) };
      delete newSavedParties[partyCode];

      // Update files list with proper state management
      setFiles(prev => prev.map(file => {
        if (file.id === selectedFile.id) {
          return {
            ...file,
            savedParties: newSavedParties
          };
        }
        return file;
      }));

      // Update selected file reference with proper state management
      setSelectedFile(prevFile => {
        if (!prevFile) return prevFile;
        return {
          ...prevFile,
          savedParties: newSavedParties
        };
      });

      toast({
        title: "Success",
        description: "Statement reset successfully",
      });
    } catch (error) {
      console.error('Error resetting statement:', error);
      toast({
        title: "Error",
        description: "Failed to reset statement",
        variant: "destructive",
      });
    }
  };

  // Function to open location in Google Maps
  const openLocation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Function to format time in 12-hour format using moment
  const formatTime = (date: Date) => {
    // Use moment for formatting
    return moment(date).format('h:mm A');
  };

  // Function to generate PDF
  const generatePDF = (section: PartySection) => {
    try {
      if (!selectedFile) return;

      // Check if this party data has been saved
      const savedData = selectedFile.savedParties?.[section.partyCode];

      setSelectedPDFSection(section);

      return (
        <PDFViewer width="100%" height="600px">
          <StatementPDF
            section={{
              ...section,
              data: section.data,
            }}
            fileName={selectedFile.name}
            totalDebits={calculateTotal(section.data, 'col5')}
            totalAdjustments={calculateTotal(section.data, 'col6')}
            outstandingBalance={calculateTotal(section.data, 'col7')}
            totalDiscount={calculateTotal(section.data, 'col10')}
          />
        </PDFViewer>
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to calculate totals
  const calculateTotal = (data: ExcelData[], column: string): number => {
    if (!data || !Array.isArray(data)) return 0;

    return data.reduce((sum, row) => {
      if (row[column] === undefined || row[column] === null) return sum;
      const value = parseFloat(String(row[column]).replace(/,/g, ''));
      return isNaN(value) ? sum : sum + value;
    }, 0);
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Add a helper function to remove file extension
  const removeFileExtension = (filename: string): string => {
    return filename.replace(/\.[^/.]+$/, '');
  };

  // Add the getAddressFromCoordinates function
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || 'Location not found';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Location not found';
    }
  };

  // Add helper function to count saved parties with proper null check
  const getSavedPartiesCount = (file: StatementFile) => {
    if (!file || !file.savedParties) return 0;
    return Object.keys(file.savedParties).length;
  };

  const renderTransactionTable = (data: any[], headers?: string[]) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
            <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No transaction data available.
            </p>
          </div>
        );
      }

      // Format date from Excel serial number to DD-MMM-YY
      const formatExcelDate = (serialDate: number) => {
        if (!serialDate) return '';
        const date = new Date((serialDate - 25569) * 86400 * 1000);
        // Using native toLocaleDateString for this specific Excel conversion is fine
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        }).replace(/ /g, '-');
      };

      // Format number to always show 2 decimal places for specific columns
      const formatNumber = (value: any, columnIndex: number) => {
        if (value === undefined || value === null || value === '') return '';
        const num = parseFloat(value);
        if (isNaN(num)) return value;

        // Always show 2 decimal places for numeric columns
        if ([5, 6, 7, 8, 9, 10].includes(columnIndex)) {
          return num.toFixed(2);
        }
        return String(value);
      };

      // These are the exact Excel header titles in correct order
      const excelHeaders = [
        "DC", "Voucher Date", "*", "Voucherser", "Voucher No.",
        "Debits", "Part Adj.", "Balance", "Balance C/f",
        "Days", "Disc.", "Narration", "Adj"
      ];

      // Format cell value based on column type and row type
      const formatCellValue = (value: any, columnIndex: number, row: any) => {
        if (value === undefined || value === null) return '';

        // Handle date column (index 1)
        if (columnIndex === 1 && !isNaN(value)) {
          return formatExcelDate(value);
        }

        // Handle special case for "*" column
        if (columnIndex === 2 && row.col0 === 'I') {
          return '*';
        }

        // Handle special case for "Voucherser" column
        if (columnIndex === 3 && row.col0 === 'I') {
          return 'INV';
        }

        // Handle numeric columns with proper decimal places
        return formatNumber(value, columnIndex);
      };

      // Filter out the Total row if it exists in the data
      const regularRows = data.filter(row => !String(row.col4 || '').toLowerCase().includes('total'));

      // Calculate totals
      const debitsTotal = regularRows.reduce((sum, row) => sum + (parseFloat(row.col5) || 0), 0);
      const partAdjTotal = regularRows.reduce((sum, row) => sum + (parseFloat(row.col6) || 0), 0);
      const balanceTotal = regularRows.reduce((sum, row) => sum + (parseFloat(row.col7) || 0), 0);
      const discTotal = regularRows.reduce((sum, row) => {
        // Get the Disc. value from col10 (Disc. column)
        const discValue = parseFloat(row.col10) || 0;
        return sum + discValue;
      }, 0);

      return (
        <div className="border rounded-md overflow-auto max-h-[500px]">
          <table className="w-full border-collapse min-w-full">
            <thead className="bg-muted/50">
              <tr>
                {excelHeaders.map((header, index) => (
                  <th
                    key={index}
                    className="text-left p-2 text-sm font-medium border-b border-r border-border/40 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Regular rows */}
              {regularRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? "bg-muted/5" : ""}
                >
                  {excelHeaders.map((_, colIndex) => {
                    const dataKey = `col${colIndex}`;
                    let value = row[dataKey];

                    // Special handling for Disc. column
                    if (colIndex === 10) {
                      return (
                        <td
                          key={colIndex}
                          className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0"
                        >
                          {formatNumber(value, colIndex)}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={colIndex}
                        className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0"
                      >
                        {formatCellValue(value, colIndex, row)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Total row */}
              <tr className="bg-muted/30 font-medium border-t">
                {excelHeaders.map((_, colIndex) => {
                  // Handle each column in the total row
                  if (colIndex === 4) return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0">Total</td>;
                  if (colIndex === 5) return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0">{debitsTotal.toFixed(2)}</td>;
                  if (colIndex === 6) return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0">{partAdjTotal.toFixed(2)}</td>;
                  if (colIndex === 7) return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0">{balanceTotal.toFixed(2)}</td>;
                  if (colIndex === 10) return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0">{discTotal.toFixed(2)}</td>;
                  return <td key={colIndex} className="p-2 text-sm border-r border-border/30 whitespace-nowrap border-l first:border-l-0"></td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      );
    } catch (error) {
      console.error('Error rendering transaction table:', error);
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
          <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Error rendering transaction data. Please check console for details.
          </p>
        </div>
      );
    }
  };

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showSavedOnly]);

  // Paginate the filtered sections
  const paginatedSections = useMemo(() => {
    if (itemsPerPage === 'all') {
      return filteredSections;
    }

    const startIndex = (currentPage - 1) * Number(itemsPerPage);
    const endIndex = startIndex + Number(itemsPerPage);
    return filteredSections.slice(startIndex, endIndex);
  }, [filteredSections, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all') return 1;
    return Math.ceil(filteredSections.length / Number(itemsPerPage));
  }, [filteredSections.length, itemsPerPage]);

  // Fetch statements for the selected date
    const fetchStatements = async () => {
      setIsLoadingStatements(true);
      try {
        console.log(`Fetching statements for date: ${selectedDate.toISOString()}`);
        const response = await fetch(`/api/statement-excel/get-by-date?date=${selectedDate.toISOString()}`);
        const data = await response.json();

        if (response.status === 401) {
          // Handle unauthorized access
          window.location.href = '/login';
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch statements');
        }

        console.log(`Received ${data.length} statements for date: ${selectedDate.toISOString()}`);

        // Convert API response to StatementFile format
        const formattedFiles: StatementFile[] = data.map((statement: any) => {
          // Log the first savedParty to check if visitedBy is included
          if (statement.savedParties && Object.keys(statement.savedParties).length > 0) {
            const firstPartyCode = Object.keys(statement.savedParties)[0];
            console.log(`First saved party for ${statement.name}:`, {
              partyCode: firstPartyCode,
              visitedBy: statement.savedParties[firstPartyCode]?.visitedBy
            });
          }

          return {
          id: statement.id,
          name: statement.name,
          uploadDate: new Date(statement.uploadDate),
          statementDate: new Date(statement.statementDate),
            partySections: Array.isArray(statement.partySections) ? statement.partySections.map((section: any) => ({
            partyCode: section.partyCode,
            partyName: section.partyName,
            location: section.location || '',
            contact: section.contact || '',
            creditDays: section.creditDays || '',
              data: section.data || [] // Ensure data is set to empty array if missing
            })) : [],
          headers: [],
          savedParties: statement.savedParties || {}
          };
        });

        console.log('Formatted files:', formattedFiles);
        
        // If we have a currently selected file, make sure to keep it selected
        let currentSelectedFileId = selectedFile?.id;

        setFiles(formattedFiles);
        
        // If we had a selected file, find it in the new list and select it again
        if (currentSelectedFileId) {
          const fileToSelect = formattedFiles.find(f => f.id === currentSelectedFileId);
          if (fileToSelect) {
            handleFileSelect(fileToSelect);
          }
        }
      } catch (error) {
        console.error('Error fetching statements:', error);
        // Don't show error toast if it's just that there are no statements yet
        if (error instanceof Error && error.message.includes('Failed to fetch statements')) {
          console.log('No statements found for the selected date');
          setFiles([]);
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch statements for the selected date.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoadingStatements(false);
      }
    };

  // Fetch statements when date changes
  useEffect(() => {
    fetchStatements();
  }, [selectedDate]);

  // Add validation for userFilter when files change
  useEffect(() => {
    // If user filter is set to a specific user, make sure that user exists in the current files
    if (userFilter !== 'all') {
      const users = new Set<string>();
      files.forEach(file => {
        if (file.savedParties) {
          Object.values(file.savedParties).forEach(data => {
            if (data.visitedBy) {
              users.add(data.visitedBy);
            }
          });
        }
      });
      
      // If the current filter is not in the users list, reset to 'all'
      if (!users.has(userFilter)) {
        console.log('Selected user filter no longer exists in current files, resetting to "all"');
        setUserFilter('all');
        if (typeof window !== 'undefined') {
          localStorage.setItem('statementUserFilter', 'all');
        }
      }
    }
  }, [files, userFilter]);

  // Helper function to format numbers safely with a maximum limit
  const formatNumberSafely = (value: number | string): number => {
    if (typeof value === 'string') {
      // Remove commas and convert to number
      value = value.replace(/,/g, '');
    }
    const num = Number(value);
    
    // Check if the number is invalid
    if (isNaN(num) || !isFinite(num)) {
      return 0;
    }

    // Set a reasonable maximum limit to prevent overflow
    const MAX_SAFE_VALUE = 999999; // 6 digits
    const MIN_SAFE_VALUE = -999999; // 6 digits

    // Handle extremely large numbers
    if (num > MAX_SAFE_VALUE) {
      console.warn(`Number ${num} exceeds maximum safe value, truncating to ${MAX_SAFE_VALUE}`);
      return MAX_SAFE_VALUE;
    }
    if (num < MIN_SAFE_VALUE) {
      console.warn(`Number ${num} exceeds minimum safe value, truncating to ${MIN_SAFE_VALUE}`);
      return MIN_SAFE_VALUE;
    }

    // Round to 2 decimal places to prevent floating point issues
    return Math.round(num * 100) / 100;
  };

  // Function to generate and download all PDFs
  const handleDownloadAllPDFs = async () => {
    if (!selectedFile || !selectedFile.partySections) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setFailedDownloads([]);
    setShowSuccessMessage(false);
    const zip = new JSZip();
    const BATCH_SIZE = 10; // Increased batch size for faster processing
    const totalSections = selectedFile.partySections.length;
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Create PDF folder only once
      const pdfFolder = zip.folder(selectedFile.name.replace(/\.[^/.]+$/, ''));
      if (!pdfFolder) throw new Error("Failed to create zip folder");
      
      // Pre-process all data once to avoid redundant calculations
      console.time('Pre-processing');
      const processedSections = selectedFile.partySections.map(section => {
        // Process each row in the data to ensure numbers are safe
        const safeData = section.data.map(row => {
          // Create a new row with safe numbers
          const safeRow = { ...row };
          // Format all numeric columns
          ['col5', 'col6', 'col7', 'col8', 'col10'].forEach(col => {
            if (safeRow[col] !== undefined) {
              safeRow[col] = formatNumberSafely(safeRow[col]);
            }
          });
          return safeRow;
        });

        return {
          section: section,
          data: safeData,
          totals: {
            debits: formatNumberSafely(calculateTotal(safeData, 'col5')),
            adjustments: formatNumberSafely(calculateTotal(safeData, 'col6')),
            balance: formatNumberSafely(calculateTotal(safeData, 'col7')),
            discount: formatNumberSafely(calculateTotal(safeData, 'col10'))
          }
        };
      });
      console.timeEnd('Pre-processing');

      // Process all sections in parallel batches
      console.time('PDF Generation');
      for (let i = 0; i < processedSections.length; i += BATCH_SIZE) {
        const batch = processedSections.slice(i, i + BATCH_SIZE);
        
        // Process a batch in parallel
        const results = await Promise.all(batch.map(async ({ section, data, totals }) => {
          try {
            const pdfDoc = (
              <StatementPDF
                section={{
                  ...section,
                  data: data,
                }}
                fileName={selectedFile.name}
                totalDebits={totals.debits}
                totalAdjustments={totals.adjustments}
                outstandingBalance={totals.balance}
                totalDiscount={totals.discount}
              />
            );

            const pdfBlob = await pdf(pdfDoc).toBlob();
            
            // Add file to zip
            if (pdfFolder) {
              const sanitizedPartyName = section.partyName.replace(/[^a-zA-Z0-9-_]/g, '_');
              pdfFolder.file(`${section.partyCode}-${sanitizedPartyName}.pdf`, pdfBlob);
            }
            
            processedCount++;
            setDownloadProgress(Math.round((processedCount / totalSections) * 100));
            
            return { success: true, section };
          } catch (error) {
            console.error(`Error generating PDF for ${section.partyCode}:`, error);
            return { 
              success: false, 
              section,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }));
        
        // Process results
        for (const result of results) {
          if (!result.success) {
            errorCount++;
            setFailedDownloads(prev => [...prev, {
              partyCode: result.section.partyCode,
              partyName: result.section.partyName,
              error: 'error' in result ? result.error : 'Failed to generate PDF'
            }]);
          }
        }

        // No delay between batches - process as fast as possible
        // Force UI update by yielding to event loop
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      console.timeEnd('PDF Generation');

      if (processedCount === 0) {
        throw new Error("Failed to generate any PDFs");
      }

      // Generate zip file efficiently
      console.time('Zip Generation');
      const zipContent = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 3  // Lower compression level for faster processing
        }
      });
      console.timeEnd('Zip Generation');
      
      const zipFileName = `${selectedFile.name.replace(/\.[^/.]+$/, '')}-statements.zip`;
      saveAs(zipContent, zipFileName);

      if (errorCount > 0) {
        toast({
          title: "Partial Success",
          description: `Generated ${processedCount} PDFs. ${errorCount} failed.`,
          variant: "destructive",
          duration: Infinity
        });
      } else {
        setSuccessMessage(`All ${processedCount} party statements downloaded successfully`);
        setShowSuccessMessage(true);
        toast({
          title: "Success",
          description: `Generated all ${processedCount} PDFs successfully.`,
        });
      }
    } catch (error) {
      console.error('Error generating PDFs:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDFs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadExcel = async (file: StatementFile) => {
    if (!session?.user?.type || session.user.type !== 'ADMIN') {
      toast({
        title: "Access Denied",
        description: "Only administrators can download Excel reports.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();

      // Create header rows with statistics on the right
      const headerRows = [
        ['SANJIVAN MEDICO TRADERS', '', '', '', '', '', '', ''],
        ['STATEMENT TRACKING REPORT', '', '', '', '', '', '', ''],
        [''],
        ['Statement Name:', file.name, '', '', 'STATISTICS:', '', '', ''],
        ['Upload Date:', moment(file.uploadDate).format('DD MMM YYYY, hh:mm A'), '', '', 'Total Parties:', file.partySections.length, '', ''],
        ['Download Date:', moment().format('DD MMM YYYY, hh:mm A'), '', '', 'Visited Parties:', Object.keys(file.savedParties || {}).length, '', ''],
        ['', '', '', '', 'Not Visited Parties:', file.partySections.length - Object.keys(file.savedParties || {}).length, '', ''],
        [''],
        [''],
        // Column headers - all caps for better visibility
        ['SR.NO.', 'STATUS', 'PARTY CODE', 'PARTY NAME', 'LOCATION', 'VISIT TIME', 'VISITED BY', 'MAP LOCATION'], //center align the headers
        // Add a separator line
        ['---', '---', '---', '---', '---', '---', '---', '---']
      ];

      // Create worksheet from header rows
      const ws = XLSX.utils.aoa_to_sheet(headerRows);

      // Merge cells for company name, report title, and info fields
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },  // Company name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },  // Report title
        { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } },  // Statement name value
        { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },  // Upload date value
        { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },  // Download date value
      ];

      // Prepare and sort data rows
      const visitedRows: any[] = [];
      const unvisitedRows: any[] = [];
      
      file.partySections.forEach((section) => {
        const savedData = file.savedParties?.[section.partyCode];
        const isVisited = !!savedData;
        const visitTime = savedData?.timestamp ? moment(savedData.timestamp).format('DD MMM YYYY, hh:mm A') : '';
        
        // Check for valid username (allow "admin" but exclude empty/Unknown User)
        let visitedBy = 'Not Visited';
        if (isVisited) {
          if (savedData?.visitedBy && savedData.visitedBy !== 'Unknown User') {
            visitedBy = savedData.visitedBy;
          }
        }
        
        // Create a clickable map link
        const mapLink = savedData?.location ? 
          {
            v: `maps.google.com/?q=${savedData.location.lat},${savedData.location.lng}`,
            l: { Target: `https://maps.google.com/?q=${savedData.location.lat},${savedData.location.lng}` }
          } : '';

        const row = [
          0, // Placeholder for S.No., will be filled after sorting
          isVisited ? 'Visited' : 'Not Visited',
          section.partyCode,
          section.partyName,
          section.location,
          visitTime,
          visitedBy,
          mapLink
        ];

        if (isVisited) {
          // For visited rows, store additional metadata for sorting
          visitedRows.push({
            row,
            user: visitedBy,
            timestamp: savedData?.timestamp ? new Date(savedData.timestamp) : new Date(0)
          });
        } else {
          unvisitedRows.push(row);
        }
      });

      // Sort visited rows by user first, then by visit time
      visitedRows.sort((a, b) => {
        // First compare by user
        if (a.user !== b.user) {
          return a.user.localeCompare(b.user);
        }
        // If same user, sort by timestamp (most recent first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      // Log how many rows were processed to help with debugging
      console.log(`Excel Report: Processing ${visitedRows.length} visited parties and ${unvisitedRows.length} unvisited parties`);
      
      // Log the first few visited rows for debugging
      if (visitedRows.length > 0) {
        console.log('First visited row:', {
          user: visitedRows[0].user,
          time: visitedRows[0].timestamp,
          partyCode: visitedRows[0].row[2]
        });
      }

      // Extract just the row data from the sorted visited rows
      const sortedVisitedRows = visitedRows.map(item => item.row);

      // Combine sorted rows and add proper S.No.
      const sortedRows = [
        ...sortedVisitedRows,
        ...unvisitedRows
      ].map((row, index) => {
        row[0] = index + 1; // Set proper S.No.
        return row;
      });

      // Add data rows to worksheet
      XLSX.utils.sheet_add_aoa(ws, sortedRows, { origin: 'A11' }); // Changed from A10 to A11 to accommodate the separator line

      // Set column widths
      ws['!cols'] = [
        { wch: 15 },     // SR.NO.
        { wch: 15 },    // STATUS (Visited/Not Visited)
        { wch: 12 },    // PARTY CODE
        { wch: 45 },    // PARTY NAME
        { wch: 38 },    // LOCATION (reduced by 15% from 45)
        { wch: 25 },    // VISIT TIME
        { wch: 25 },    // VISITED BY
        { wch: 80 }     // MAP LOCATION
      ];

      // Set row heights for better spacing
      ws['!rows'] = [
        { hpt: 30 },  // Company name
        { hpt: 25 },  // Report title
        { hpt: 15 },  // Empty row
        { hpt: 25 },  // Statement name row
        { hpt: 25 },  // Upload date row
        { hpt: 25 },  // Download date row
        { hpt: 25 },  // Not visited parties row
        { hpt: 15 },  // Empty row
        { hpt: 15 },  // Empty row
        { hpt: 35 },  // Column headers
        { hpt: 25 },  // Separator line
      ];

      // Style the worksheet
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

      // Company name and report title styling
      ws['A1'].s = { 
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
      ws['A2'].s = { 
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Column headers styling (including the separator line)
      for (let c = 0; c <= 7; c++) {
        // Style the column headers
        const headerCell = XLSX.utils.encode_cell({ r: 9, c });
        ws[headerCell].s = {
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: "E0E0E0" } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };

        // Style the separator line
        const separatorCell = XLSX.utils.encode_cell({ r: 10, c });
        ws[separatorCell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F0F0F0" } },
          alignment: { horizontal: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Center align S.No. column
      for (let r = 11; r <= range.e.r; r++) {
        const cell = XLSX.utils.encode_cell({ r, c: 0 });
        if (!ws[cell]) ws[cell] = {};
        if (!ws[cell].s) ws[cell].s = {};
        ws[cell].s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Statement Report');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Download file with formatted name
      const fileName = `${file.name.replace(/\.[^/.]+$/, '')}-tracking-report.xlsx`;
      saveAs(blob, fileName);

      toast({
        title: "Success",
        description: "Excel report downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating Excel report:', error);
      toast({
        title: "Error",
        description: "Failed to generate Excel report.",
        variant: "destructive",
      });
    }
  };

  // Function to handle when user selects different filter
  const handleUserFilterChange = (value: string) => {
    setUserFilter(value);
    // Store in localStorage as well
    if (typeof window !== 'undefined') {
      localStorage.setItem('statementUserFilter', value);
    }
    
    // If there are no users yet, reset to "all" to prevent empty results
    if (value !== 'all' && uniqueUsers.length === 0) {
      console.log('No users have visited any medical stores yet');
      toast({
        title: "No visited stores",
        description: "No users have visited any medical stores yet. Showing all parties.",
        duration: 3000,
      });
      setUserFilter('all');
      localStorage.setItem('statementUserFilter', 'all');
    }
  };

  // Function to format date as YYYY-MM-DD
  const formatDateForAPI = (date: Date): string => {
    return format(date, 'yyyy-MM-dd'); // Use date-fns for internal consistency
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Statement Management</CardTitle>
              <CardDescription className="text-sm">Upload and view party statements from Excel files</CardDescription>
            </div>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto">
              {isAdmin && selectedFile && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadExcel(selectedFile)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Download Excel Report</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAllPDFs}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto relative"
                  >
                    {isDownloading ? (
                      <>
                        <div className="relative w-4 h-4">
                          <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span className="ml-2">{downloadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        <span>Download All PDFs</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatements}
                  disabled={isLoadingStatements}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isLoadingStatements ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="h-4 w-4"
                      >
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                        <path d="M8 16H3v5"/>
                      </svg>
                    </>
                  )}
                  <span className="sm:inline">Refresh</span>
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full sm:w-auto justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "d MMM yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setSelectedFile(null);
                          setExpandedParties(new Set());
                          setSearchTerm('');
                          setShowSavedOnly(false);
                          setCurrentPage(1);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-4 h-full border rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer md:cursor-default"
                onClick={() => {
                  // Only trigger on mobile
                  if (window.innerWidth < 768) {
                    setIsUploadExpanded(!isUploadExpanded);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Upload New Statement</h3>
                </div>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 md:hidden transition-transform duration-200",
                    isUploadExpanded ? "transform rotate-180" : ""
                  )}
                />
              </div>

              <div className={cn(
                "md:block",
                isUploadExpanded ? "block" : "hidden"
              )}>
                <div className="flex-grow flex flex-col">
                  <FileUpload
                    onFilesSelected={handleFilesSelected}
                    isLoading={isLoading}
                    acceptTypes=".xlsx,.xls"
                    multiple={true}
                    className="w-full h-full"
                    buttonText="Upload Statements"
                    iconSize="lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 h-full border rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer md:cursor-default"
                onClick={() => {
                  // Only trigger on mobile
                  if (window.innerWidth < 768) {
                    setIsRecentStatementsExpanded(!isRecentStatementsExpanded);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Recent Statements</h3>
                  <span className="text-sm text-muted-foreground">
                    ({filteredFiles.length})
                  </span>
                </div>

                <ChevronDown
                  className={cn(
                    "h-4 w-4 md:hidden transition-transform duration-200",
                    isRecentStatementsExpanded ? "transform rotate-180" : ""
                  )}
                />
              </div>

              <div className={cn(
                "md:block",
                isRecentStatementsExpanded ? "block" : "hidden"
              )}>
                {isLoadingStatements ? (
                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-auto pr-1 min-h-[230px]">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex flex-col p-3 rounded-lg border animate-pulse"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-3.5 w-3.5 bg-muted-foreground/15 rounded" />
                            <div className="h-4 w-32 bg-muted-foreground/15 rounded" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="h-3 w-24 bg-muted-foreground/15 rounded" />
                          <div className="h-3 w-32 bg-muted-foreground/15 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-8 text-center bg-muted/5">
                    <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {/* Use moment for date formatting */}
                      No statements uploaded on {selectedDate ? format(selectedDate, "d MMM yyyy") : 'this date'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-auto pr-1 min-h-[230px]">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          "flex flex-col p-3 rounded-lg border transition-colors cursor-pointer",
                          selectedFile?.id === file.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        )}
                        onClick={() => handleFileSelect(file)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TableIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {editingFileId === file.id ? (
                                <Input
                                  value={editingFileName}
                                  onChange={(e) => setEditingFileName(e.target.value)}
                                  className="h-6 w-28"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                removeFileExtension(file.name)
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 ml-1">
                            {editingFileId === file.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileRename(file.id);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFileId(null);
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFileId(file.id);
                                    setEditingFileName(file.name);
                                  }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                {!isAdmin ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowAccessDeniedDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFileToDelete(file);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{file.partySections.length} parties</span>
                            <span className="text-primary">
                              ({getSavedPartiesCount(file)} saved)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            {/* Use moment for date formatting */}
                            <span>{moment(file.uploadDate).format('DD MMM YYYY, h:mm A')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            {selectedFile && (
              <>
                <div className="relative">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-base font-medium">
                      Current Statements : {selectedFile.name} ({filteredSections.length} of {selectedFile.partySections.length})
                    </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Label htmlFor="search" className="text-sm font-medium mb-1.5 block">Search</Label>
                        <Input
                          id="search"
                          type="text"
                          placeholder="Search by party name, location, or contact..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="visitFilter" className="text-sm font-medium mb-1.5 block">Visit Status</Label>
                        <Select
                          value={visitFilter}
                          onValueChange={(value: 'all' | 'visited' | 'unvisited') => setVisitFilter(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Filter by visit status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Parties</SelectItem>
                            <SelectItem value="visited">Visited Parties</SelectItem>
                            <SelectItem value="unvisited">Unvisited Parties</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="userFilter" className="text-sm font-medium mb-1.5 block">Visited By</Label>
                        <Select
                          value={userFilter}
                          onValueChange={handleUserFilterChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Filter by user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {uniqueUsers.length > 0 ? (
                              uniqueUsers.map(user => {
                                // Calculate count from currently selected file only
                                const partyCount = userStats[user] || 0;
                                
                                return (
                                  <SelectItem key={user} value={user}>
                                    {user} ({partyCount} visits)
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <div className="text-xs text-muted-foreground px-2 py-1.5">
                                No users have visited any medical stores in this statement
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedFile && (
              <div className="space-y-4 sm:space-y-6">
                {isLoadingDetails ? (
                  // Loading skeleton UI
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="w-full">
                              <div className="flex items-center space-x-2">
                                <div className="h-4 w-4 bg-muted rounded" />
                                <div className="h-4 w-48 bg-muted rounded" />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <div className="h-3 w-24 bg-muted rounded" />
                                <div className="h-3 w-32 bg-muted rounded" />
                                <div className="h-3 w-28 bg-muted rounded" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-12 bg-muted rounded" />
                              <div className="h-8 w-12 bg-muted rounded" />
                              <div className="h-8 w-12 bg-muted rounded" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : filteredSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
                    <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm
                          ? 'No matching party statements found. Try adjusting your search.'
                          : 'No party statements found.'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Statement listing */}
                    {paginatedSections.map((section) => {
                      const savedPartyData = selectedFile.savedParties?.[section.partyCode];
                      const hasSavedTimestamp = savedPartyData?.timestamp;

                      console.log({savedPartyData})

                      return (
                        <Card key={section.partyCode} className={cn(
                          "mb-4 overflow-hidden",
                          expandedParties.has(section.partyCode) && "border-primary/50 shadow-md"
                        )}>
                          <CardHeader className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <button
                                className="w-full text-left focus:outline-none p-2 sm:p-3 bg-muted/20 rounded-md hover:bg-muted/40 transition-colors duration-200"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePartyExpand(section.partyCode);
                                }}
                                aria-expanded={expandedParties.has(section.partyCode)}
                                type="button"
                              >
                                <div className="flex flex-row items-center justify-between">
                                  <div className="flex flex-col space-y-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <CardTitle className="text-sm font-medium truncate">
                                        {section.partyCode} - {section.partyName}
                                      </CardTitle>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{section.location}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 flex-shrink-0" />
                                        <span>{section.contact}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 flex-shrink-0" />
                                        <span>{section.creditDays} days credit</span>
                                      </div>

                                      {/* Show timestamp if saved */}
                                      {hasSavedTimestamp && (
                                        <div className="flex items-center gap-1 text-green-600 font-medium">
                                          <Clock className="h-3 w-3 flex-shrink-0" />
                                          {/* Use formatTime which now uses moment */}
                                          <span>{formatTime(new Date(savedPartyData.timestamp!))}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <Badge variant="outline" className="text-xs mr-2 hidden sm:inline-flex">
                                      {/* Filter out potential total row before counting */}
                                      {section.data.filter(row => !String(row.col4 || '').toLowerCase().includes('total')).length} transactions
                                    </Badge>
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      <ChevronDown
                                        className={cn(
                                          "h-5 w-5 text-primary transition-transform duration-300 ease-in-out",
                                          expandedParties.has(section.partyCode) ? "transform rotate-180" : ""
                                        )}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {/* Action buttons in the header */}
                              <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 justify-start sm:justify-end w-full sm:w-auto">

                                {/* Image Capture/View */}
                                <div>
                                  <TakeImage
                                    imageKey={section.partyCode}
                                    handleImageUpload={handleImageUpload}
                                    isUploading={uploadingImage === section.partyCode}
                                    isDisabled={uploadingImage === section.partyCode || savedPartyData !== undefined}
                                    showImages={
                                      Array.from(new Set([...(capturedImages[section.partyCode] || []), ...(savedPartyData?.images || [])]))
                                    }
                                    takeType="BOTH"
                                  />
                                </div>

                                {/* Save/Reset Button */}
                                <div>
                                  {savedPartyData ? (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-[4.5rem] flex items-center justify-center"
                                        >
                                          <X className="h-3.5 w-3.5 mr-1" />
                                          Reset
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="w-[90%] max-w-md">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reset Statement Data</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to reset this statement data for {section.partyName}? This will clear the captured image and location data.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                          <AlertDialogCancel className="mt-2 sm:mt-0 w-full sm:w-auto">Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleReset(section.partyCode)}
                                            className="w-full sm:w-auto"
                                          >
                                            Reset
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  ) : capturedImages[section.partyCode] ? (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 w-[4.5rem] flex items-center justify-center"
                                      disabled={isSaving === section.partyCode}
                                      onClick={() => handleSave(section.partyCode)}
                                    >
                                      {isSaving === section.partyCode ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                          Save
                                        </>
                                      ) : (
                                        <>
                                          <Save className="h-3.5 w-3.5 mr-1" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                  ) : null}
                                </div>

                                {/* Location Button */}
                                {savedPartyData?.location && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-[4.5rem] flex items-center justify-center"
                                    onClick={() => openLocation(
                                      savedPartyData.location!.lat,
                                      savedPartyData.location!.lng
                                    )}
                                  >
                                  <MapPin className="h-3.5 w-3.5 mr-1" />
                                    Map
                                  </Button>
                                )}

                                {/* PDF Button */}
                                {savedPartyData && (
                                  <div>
                                    <PDFDownloadLink
                                      document={
                                        <StatementPDF
                                          section={{
                                            ...section,
                                            data: section.data,
                                          }}
                                          fileName={selectedFile.name}
                                          totalDebits={calculateTotal(section.data, 'col5')}
                                          totalAdjustments={calculateTotal(section.data, 'col6')}
                                          outstandingBalance={calculateTotal(section.data, 'col7')}
                                          totalDiscount={calculateTotal(section.data, 'col10')}
                                        />
                                      }
                                      fileName={`${section.partyCode}-${moment().format('YYYY-MM-DD')}.pdf`}
                                    >
                                      {({ loading }) => (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-[4.5rem] flex items-center justify-center"
                                          disabled={loading}
                                        >
                                          {loading ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <>
                                              <FileDown className="h-3.5 w-3.5 mr-1" />
                                              PDF
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </PDFDownloadLink>
                                  </div>
                                )}
                              </div>
                              
                            </div>
                          </CardHeader>

                          {expandedParties.has(section.partyCode) && (
                            <CardContent className="p-0">
                              <div className="p-4 border-t border-border/40">
                                {section.data && (Array.isArray(section.data) || typeof section.data === 'object') ? (
                                  renderTransactionTable(
                                    Array.isArray(section.data) ? section.data : [section.data],
                                    selectedFile?.headers
                                  )
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
                                    <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                      No transaction data available for this party.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}

                    {/* Centralized pagination controls at the bottom */}
                    {totalPages > 1 && (
                      <div className="flex flex-col items-center gap-4 py-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Page {currentPage} of {totalPages}</span>
                          <select
                            className="h-8 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            value={String(itemsPerPage)}
                            onChange={(e) => {
                              const value = e.target.value;
                              setItemsPerPage(value === 'all' ? 'all' : Number(value));
                              setCurrentPage(1);
                            }}
                          >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                            <option value="all">All</option>
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="flex items-center rounded-md border">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-4"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            <div className="border-l h-8"></div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-4"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                            >
                              1
                            </Button>

                            {currentPage > 3 && (
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                                ...
                              </Button>
                            )}

                            {currentPage > 2 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(currentPage - 1)}
                              >
                                {currentPage - 1}
                              </Button>
                            )}

                            {currentPage !== 1 && currentPage !== totalPages && (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                {currentPage}
                              </Button>
                            )}

                            {currentPage < totalPages - 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(currentPage + 1)}
                              >
                                {currentPage + 1}
                              </Button>
                            )}

                            {currentPage < totalPages - 2 && (
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                                ...
                              </Button>
                            )}

                            {totalPages > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                              >
                                {totalPages}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Statement</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this statement? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => fileToDelete && handleFileDelete(fileToDelete.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Success Message */}
      {showSuccessMessage && (
        <Card className="mt-4 border-green-500">
          <CardHeader className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <CardTitle className="text-green-500">Success</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-green-500 font-medium">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Failed Downloads List */}
      {failedDownloads.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-destructive">Failed Downloads</CardTitle>
            <CardDescription>These statements could not be generated:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedDownloads.map((failed, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-destructive/10 rounded-md">
                  <div>
                    <span className="font-medium">{failed.partyCode}</span>
                    <span className="text-muted-foreground ml-2">- {failed.partyName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFailedDownloads(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Denied Dialog */}
      <AlertDialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Access Denied</AlertDialogTitle>
            <AlertDialogDescription>
              Only administrators can delete statements. Please contact an administrator if you need to delete a statement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}