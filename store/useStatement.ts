import { create } from 'zustand';
import { Statement, Report, statementService } from '@/lib/statement-service';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import axios from 'axios';
import { convertImage, compressImage } from '@/lib/helper';
import { LucideIcon } from 'lucide-react';

// Component types
export interface SavedPartyInfo {
  timestamp: string;
  location?: string | null;
  coordinates?: { lat: number; lng: number } | null;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  buttonText?: string;
  buttonAction?: () => void;
  showUpload?: boolean;
  handleFileUpload?: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export interface PartyRowProps {
  party: Report;
  statement: Statement;
}

export interface PartyActionsProps {
  party: Report;
  statement: Statement;
}

export interface PartyDetailsProps {
  party: Report;
}

// Store interface
interface StatementState {
  statements: Statement[];
  isLoading: boolean;
  expandedParties: Record<string, string[]>;
  capturedImages: Record<string, string>;
  savedParties: Record<string, SavedPartyInfo>;
  
  // Actions
  fetchStatements: (date?: Date) => Promise<void>;
  togglePartyExpand: (statementId: string, partyCode: string) => void;
  isPartyExpanded: (statementId: string, partyCode: string) => boolean;
  downloadPartyPDF: (party: Report, statement: Statement) => Promise<void>;
  captureStatementImage: (partyCode: string, reportId: string) => void;
  savePartyImage: (partyCode: string, reportId: string, images: string[]) => Promise<void>;
  updatePartyImage: (partyCode: string, imageUrl: string) => void;
  hasPartyImage: (partyCode: string) => boolean;
  isPartySaved: (partyCode: string) => boolean;
  searchParties: (parties: Report[], searchTerm: string) => Report[];
  updateStatementName: (statementId: string, newName: string) => void;
  resetParty: (partyCode: string) => void;
}

export const useStatements = create<StatementState>((set, get) => ({
  statements: [],
  isLoading: false,
  expandedParties: {},
  capturedImages: {},
  savedParties: {},
  
  fetchStatements: async (date?: Date) => {
    set({ isLoading: true });
    try {
      // Build query parameter for date if provided
      let url = '/api/statement';
      if (date) {
        url += `?date=${format(date, 'yyyy-MM-dd')}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data && response.data.statements) {
        const dbStatements = response.data.statements;
        
        // Convert database statements to our application format
        const appStatements: Statement[] = dbStatements.map((dbStatement: any) => {
          const statement: Statement = {
            id: dbStatement.id,
            name: dbStatement.fileUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown',
            reportDate: format(new Date(dbStatement.createdAt), 'dd/MM/yyyy'),
            reports: []
          };
          
          // Convert reports to parties
          if (dbStatement.reports && dbStatement.reports.length > 0) {
            dbStatement.reports.forEach((report: any) => {
              if (report.tableData) {
                const partyData = report.tableData as Report;
                statement.reports.push(partyData);
                
                // If report is saved, update savedParties state
                if (report.saved && report.savedTimestamp) {
                  set((state) => ({
                    savedParties: {
                      ...state.savedParties,
                      [partyData.partyCode]: { 
                        timestamp: report.savedTimestamp,
                        location: null,
                        coordinates: null
                      }
                    }
                  }));
                }
                
                // If report has images, update capturedImages state
                if (report.images && report.images.length > 0) {
                  set((state) => ({
                    capturedImages: {
                      ...state.capturedImages,
                      [partyData.partyCode]: report.images[0]
                    }
                  }));
                }
              }
            });
          }
          
          return statement;
        });
        
        set({ 
          statements: appStatements,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
      set({ isLoading: false });
      toast({
        title: "Error Loading Statements",
        description: error instanceof Error ? error.message : "Failed to load statements",
        variant: "destructive",
      });
    }
  },
  
  togglePartyExpand: (statementId: string, partyCode: string) => {
    set((state) => {
      const expandedPartiesForStatement = state.expandedParties[statementId] || [];
      
      if (expandedPartiesForStatement.includes(partyCode)) {
        // Remove the party from expanded list
        return {
          expandedParties: {
            ...state.expandedParties,
            [statementId]: expandedPartiesForStatement.filter(code => code !== partyCode)
          }
        };
      } else {
        // Add the party to expanded list
        return {
          expandedParties: {
            ...state.expandedParties,
            [statementId]: [...expandedPartiesForStatement, partyCode]
          }
        };
      }
    });
  },
  
  isPartyExpanded: (statementId: string, partyCode: string) => {
    return (get().expandedParties[statementId] || []).includes(partyCode);
  },
  
  downloadPartyPDF: async (party: Report, statement: Statement) => {
    try {
      // For Zustand store, we'll use a dynamic import of the PDF generation function
      const { generatePDF } = await import('@/lib/pdf-generator');
      await generatePDF(party, statement);
      
      toast({
        title: "PDF Generated",
        description: "Statement PDF has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    }
  },
  
  captureStatementImage: (partyCode: string, reportId: string) => {
    // In a real app, this would open the camera
    // For this implementation, we'll simulate by opening a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // This will open the camera on supported mobile devices
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        set({ isLoading: true });
        
        // Convert and compress the image before uploading
        const changedFile = await convertImage(file);
        const compressedFile = await compressImage(changedFile);
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('reportId', reportId);
        
        // Upload to backend
        const response = await axios.post('/api/statement/report', formData);
        
        if (response.data && response.data.imageUrl) {
          set((state) => ({
            capturedImages: {
              ...state.capturedImages,
              [partyCode]: response.data.imageUrl
            },
            isLoading: false
          }));
          
          toast({
            title: "Image Captured",
            description: `Image captured for ${partyCode}. Please save it to finalize.`,
          });
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        set({ isLoading: false });
        toast({
          title: "Error",
          description: "Failed to upload image.",
          variant: "destructive",
        });
      } finally {
        input.value = ''; // Clear the input
      }
    };
    
    input.click();
  },
  
  savePartyImage: async (partyCode: string, reportId: string, images: string[]) => {
    const state = get();
    if (images.length === 0) {
      toast({
        title: "No Images Found",
        description: "Please capture images first.",
        variant: "destructive",
      });
      return;
    }
    
    set({ isLoading: true });
    
    try {
      // Save the report as finalized in the database
      const response = await axios.patch('/api/statement/report', {
        reportId,
        saved: true,
        images
      });
      
      if (response.data && response.data.report) {
        const timestamp = new Date().toISOString();
        let coordinates = null;
        
        // Try to get location if supported
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          } catch (err) {
            console.error('Error getting location:', err);
          }
        }
        
        set((state) => ({
          savedParties: {
            ...state.savedParties,
            [partyCode]: { 
              timestamp, 
              location: coordinates ? `Lat: ${coordinates.lat.toFixed(4)}, Long: ${coordinates.lng.toFixed(4)}` : null,
              coordinates
            }
          },
          isLoading: false
        }));
        
        toast({
          title: "Party Saved",
          description: coordinates 
            ? `Party ${partyCode} saved with image and location data.`
            : `Party ${partyCode} saved with image. Location data unavailable.`,
        });
      }
    } catch (error) {
      console.error('Error saving party:', error);
      set({ isLoading: false });
      toast({
        title: "Error",
        description: "Failed to save party data.",
        variant: "destructive",
      });
    }
  },
  
  updatePartyImage: (partyCode: string, imageUrl: string) => {
    set((state) => ({
      capturedImages: {
        ...state.capturedImages,
        [partyCode]: imageUrl
      }
    }));
  },
  
  hasPartyImage: (partyCode: string) => {
    return !!get().capturedImages[partyCode];
  },
  
  isPartySaved: (partyCode: string) => {
    return !!get().savedParties[partyCode];
  },
  
  searchParties: (parties: Report[], searchTerm: string) => {
    if (!searchTerm.trim()) {
      return parties;
    }
    
    const term = searchTerm.toLowerCase();
    return parties.filter(party => 
      party.partyCode.toLowerCase().includes(term) || 
      party.partyName.toLowerCase().includes(term)
    );
  },
  
  updateStatementName: (statementId: string, newName: string) => {
    set((state) => ({
      statements: state.statements.map(statement => 
        statement.id === statementId 
          ? { ...statement, name: newName } 
          : statement
      )
    }));
    
    toast({
      title: "Statement name updated",
      description: `Statement name has been changed to "${newName}"`,
    });
  },
  
  resetParty: (partyCode: string) => {
    set((state) => {
      // Create new objects without the specified party
      const newCapturedImages = { ...state.capturedImages };
      const newSavedParties = { ...state.savedParties };
      
      // Delete the specific party entries
      delete newCapturedImages[partyCode];
      delete newSavedParties[partyCode];
      
      return {
        capturedImages: newCapturedImages,
        savedParties: newSavedParties
      };
    });
    
    toast({
      title: "Reset Complete",
      description: `Party ${partyCode} has been reset.`,
    });
  }
}));
