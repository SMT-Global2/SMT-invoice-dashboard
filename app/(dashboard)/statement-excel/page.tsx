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
  const [isRecentStatementsExpanded, setIsRecentStatementsExpanded] = useState(false);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [isLoadingStatements, setIsLoadingStatements] = useState(true);
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [imageKeys, setImageKeys] = useState<Record<string, string[]>>({});

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

      if (!result.partySections || !Array.isArray(result.partySections) || result.partySections.length === 0) {
        toast({
          title: "Warning",
          description: "No party statements found in the file. Please check if this is the correct Excel file.",
        });
        return;
      }

      // Create a new file object from the response
      const newFile: StatementFile = {
        id: result.id,
        name: result.name,
        uploadDate: new Date(result.uploadDate),
        statementDate: new Date(result.statementDate),
        partySections: result.partySections,
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
      try {
        const response = await fetch(`/api/statement-excel/oper?id=${statementId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch statement details');
        }

        // Create a complete statement file with all data
        const completeFile: StatementFile = {
          id: data.id,
          name: data.name,
          uploadDate: new Date(data.uploadDate),
          statementDate: new Date(data.statementDate),
          partySections: data.partySections,
          headers: data.headers || [],
          savedParties: data.savedParties || {}
        };

        // Clear search term and filters when changing files
        setSearchTerm('');
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
      }
    };

    fetchStatementDetails(file.id);
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/statement-excel/oper?id=${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete statement');
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

  const filteredSections = useMemo(() => {
    if (!selectedFile || !selectedFile.partySections) {
      return [];
    }

    let filtered = [...selectedFile.partySections];

    // Apply search filter if there's a search term
    if (searchTerm) {
      filtered = filtered.filter(section => {
        if (!section) return false;

        const searchLower = searchTerm.toLowerCase();

        // Check party details
        const matchesPartyDetails =
          section.partyCode?.toLowerCase().includes(searchLower) ||
          section.partyName?.toLowerCase().includes(searchLower) ||
          section.location?.toLowerCase().includes(searchLower);

        if (matchesPartyDetails) return true;

        // Check transaction data
        return section.data?.some(row =>
          Object.values(row || {}).some(value =>
            String(value || '').toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Apply saved filter if enabled
    if (showSavedOnly) {
      filtered = filtered.filter(section =>
        selectedFile.savedParties &&
        selectedFile.savedParties[section.partyCode]
      );
    }

    return filtered;
  }, [selectedFile, searchTerm, showSavedOnly]);

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
    if (!selectedFile) return;

    setIsSaving(partyCode);

    try {
      // Get current location
      const locationData = await getCurrentLocation();

      // Prepare data for API call
      const saveData = {
        statementId: selectedFile.id,
        partyCode: partyCode,
        images : capturedImages[partyCode] || [],
        location: locationData,
        address: await getAddressFromCoordinates(locationData.lat, locationData.lng)
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
        ...(selectedFile.savedParties || {}), // Ensure savedParties exists
        [partyCode]: {
          images: capturedImages[partyCode] || [],
          location: locationData,
          timestamp: new Date(),
          address: saveData.address
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
            section={section}
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
  useEffect(() => {
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
        const formattedFiles: StatementFile[] = data.map((statement: any) => ({
          id: statement.id,
          name: statement.name,
          uploadDate: new Date(statement.uploadDate),
          statementDate: new Date(statement.statementDate),
          partySections: statement.partySections.map((section: any) => ({
            partyCode: section.partyCode,
            partyName: section.partyName,
            location: section.location || '',
            contact: section.contact || '',
            creditDays: section.creditDays || '',
            data: [] // Data will be fetched when statement is selected
          })),
          headers: [],
          savedParties: statement.savedParties || {}
        }));

        setFiles(formattedFiles);
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

    fetchStatements();
  }, [selectedDate, toast]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Statement Management</CardTitle>
              <CardDescription className="text-sm">Upload and view party statements from Excel files</CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "mt-2 sm:mt-0 justify-start text-left font-normal min-w-[170px]",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {/* Use moment for date formatting */}
                  {selectedDate ? moment(selectedDate).format("LL") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      // Clear selected file and expanded parties when changing date
                      setSelectedFile(null);
                      setExpandedParties(new Set());
                      // Reset other states
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
                      No statements uploaded on {moment(selectedDate).format("LL")}
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
            {/* Only show these elements if there is a selected file, regardless of search results */}
            {selectedFile && (
              <>
                <div className="relative">
                  <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                    <span className="text-base font-medium">
                      Current Statements : {selectedFile.name} ({filteredSections.length} of {selectedFile.partySections.length})
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search party name, code..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 pr-8"
                        />
                        {searchTerm && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1.5 h-5 w-5"
                            onClick={() => setSearchTerm('')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        className={cn(
                          "whitespace-nowrap w-full sm:w-auto",
                          showSavedOnly && "bg-primary/10"
                        )}
                        onClick={() => setShowSavedOnly(!showSavedOnly)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {showSavedOnly ? "Show All" : "Show Saved Only"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedFile && (
              <div className="space-y-4 sm:space-y-6">
                {filteredSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg">
                    <TableIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {showSavedOnly
                        ? searchTerm
                          ? 'No saved statements match your search.'
                          : 'No saved statements found.'
                        : searchTerm
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

                                {/* PDF Button */}
                                {savedPartyData && (
                                  <div>
                                    <PDFDownloadLink
                                      document={
                                        <StatementPDF
                                          section={section}
                                          fileName={`${section.partyCode}-${moment().format('YYYY-MM-DD')}`}
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
    </div>
  );
}