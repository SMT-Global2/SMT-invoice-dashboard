import { create } from 'zustand';
import { Statement, Party, statementService } from '@/lib/statement-service';
import { toast } from '@/components/ui/use-toast';

interface StatementState {
  statements: Statement[];
  isLoading: boolean;
  expandedParties: Record<string, string[]>;
  capturedImages: Record<string, string>;
  savedParties: Record<string, { timestamp: string, location: string | null }>;
  
  // Actions
  loadStatements: (file: File) => Promise<void>;
  clearStatements: () => void;
  togglePartyExpand: (statementId: string, partyCode: string) => void;
  isPartyExpanded: (statementId: string, partyCode: string) => boolean;
  downloadPartyPDF: (party: Party, statement: Statement) => Promise<void>;
  captureStatementImage: (partyCode: string) => void;
  savePartyImage: (partyCode: string) => void;
  hasPartyImage: (partyCode: string) => boolean;
  isPartySaved: (partyCode: string) => boolean;
  searchParties: (parties: Party[], searchTerm: string) => Party[];
  updateStatementName: (statementId: string, newName: string) => void;
}

export const useStatements = create<StatementState>((set, get) => ({
  statements: [],
  isLoading: false,
  expandedParties: {},
  capturedImages: {},
  savedParties: {},
  
  loadStatements: async (file: File) => {
    set({ isLoading: true });
    try {
      const loadedStatements = await statementService.loadStatements(file);
      
      // Add new statements to existing ones instead of replacing
      set((state) => ({ 
        statements: [...state.statements, ...loadedStatements],
        isLoading: false
      }));
      
      toast({
        title: "Statements Loaded",
        description: `Successfully loaded ${file.name}`,
      });
    } catch (error) {
      console.error('Error loading statements:', error);
      set({ isLoading: false });
      toast({
        title: "Error Loading Statement",
        description: `Failed to load ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    }
  },
  
  clearStatements: () => {
    set({ 
      statements: [],
      expandedParties: {},
      capturedImages: {},
      savedParties: {} 
    });
    toast({
      title: "Statements Cleared",
      description: "All statements have been removed",
    });
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
  
  downloadPartyPDF: async (party: Party, statement: Statement) => {
    try {
      // For Zustand store, we'll use a dynamic import of the PDF generation function
      // This avoids TypeScript errors when dealing with React components
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
  
  captureStatementImage: (partyCode: string) => {
    // In a real app, this would open the camera
    // For this implementation, we'll simulate by opening a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // This will open the camera on supported mobile devices
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        set((state) => ({
          capturedImages: {
            ...state.capturedImages,
            [partyCode]: imageUrl
          }
        }));
        
        toast({
          title: "Image Captured",
          description: `Image captured for ${partyCode}. Please save it to add location data.`,
        });
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  },
  
  savePartyImage: (partyCode: string) => {
    const state = get();
    if (!state.capturedImages[partyCode]) {
      toast({
        title: "No Image Found",
        description: "Please capture an image first.",
        variant: "destructive",
      });
      return;
    }
    
    const timestamp = new Date().toLocaleString();
    
    // Try to get location if supported
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `Lat: ${position.coords.latitude.toFixed(4)}, Long: ${position.coords.longitude.toFixed(4)}`;
          set((state) => ({
            savedParties: {
              ...state.savedParties,
              [partyCode]: { timestamp, location }
            }
          }));
          
          toast({
            title: "Party Saved",
            description: `Party ${partyCode} saved with image and location data.`,
          });
        },
        () => {
          // Error getting location
          set((state) => ({
            savedParties: {
              ...state.savedParties,
              [partyCode]: { timestamp, location: null }
            }
          }));
          
          toast({
            title: "Party Saved",
            description: `Party ${partyCode} saved with image. Location access denied.`,
          });
        }
      );
    } else {
      // Geolocation not supported
      set((state) => ({
        savedParties: {
          ...state.savedParties,
          [partyCode]: { timestamp, location: null }
        }
      }));
      
      toast({
        title: "Party Saved",
        description: `Party ${partyCode} saved with image. Location not available.`,
      });
    }
  },
  
  hasPartyImage: (partyCode: string) => {
    return !!get().capturedImages[partyCode];
  },
  
  isPartySaved: (partyCode: string) => {
    return !!get().savedParties[partyCode];
  },
  
  searchParties: (parties: Party[], searchTerm: string) => {
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
  }
}));
