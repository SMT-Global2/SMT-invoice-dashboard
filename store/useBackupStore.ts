import { create } from 'zustand';
import { DateRange } from 'react-day-picker';
import moment from 'moment';

export type BackupSection = 
  | 'all'
  | 'invoice'
  | 'receipt'
  | 'inventory'
  | 'deliveryMemo'
  | 'expiry'
  | 'agency'
  | 'party'
  | 'transportation';

export interface BackupHistory {
  id: string;
  filename: string;
  createdAt: Date;
  sections: BackupSection[];
  size: number;
  fileCount: number;
  downloadUrl: string;
  createdBy: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface BackupProgress {
  id?: string;
  status: 'idle' | 'PENDING' | 'INPROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  section?: BackupSection;
  progress: number;
  message?: string;
  error?: string;
  estimatedTimeRemaining?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  currentSize?: number; // in bytes
  currentFileCount?: number;
}

export interface BackupState {
  isLoading: boolean;
  error: string | null;
  backupHistory: BackupHistory[];
  currentBackup: BackupProgress;
  selectedSections: BackupSection[];
  dateRange: DateRange | undefined;
  compressionType: 'zip' | 'targz';
  
  // Actions
  fetchBackupHistory: () => Promise<void>;
  createBackup: (options: {
    sections: BackupSection[];
    dateRange: DateRange;
    compressionType: 'zip' | 'targz';
  }) => Promise<(() => void) | void>;
  downloadBackup: (id: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
  setSelectedSections: (sections: BackupSection[]) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
  setCompressionType: (type: 'zip' | 'targz') => void;
  cancelBackup: () => Promise<void>;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  isLoading: false,
  error: null,
  backupHistory: [],
  currentBackup: {
    status: 'idle',
    progress: 0
  },
  selectedSections: ['all'],
  dateRange: {
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  },
  compressionType: 'zip',
  
  // Fetch backup history
  fetchBackupHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/backup');
      
      if (response.status === 401) {
        throw new Error('Please sign in to view backup history');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to view backup history');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch backup history');
      }
      
      const data = await response.json();
      set({
        backupHistory: data.backups || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching backup history:', error);
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      });
    }
  },
  
  // Create a new backup
  createBackup: async (options) => {
    try {
      // Early return if backup is already in progress
      if (get().currentBackup.status !== 'idle' && get().currentBackup.status !== 'COMPLETED' && get().currentBackup.status !== 'FAILED') {
        throw new Error('A backup is already in progress');
      }
      
      set({
        currentBackup: {
          status: 'PENDING',
          progress: 0,
          startTime: new Date(),
          message: 'Preparing backup process'
        },
        error: null
      });
      
      // Format the date range
      const { sections, dateRange, compressionType } = options;
      const fromDate = dateRange?.from ? moment(dateRange.from).format('YYYY-MM-DD') : '';
      const toDate = dateRange?.to ? moment(dateRange.to).format('YYYY-MM-DD') : '';
      
      // Start the backup process
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          departments: sections,
          dateRange: { from: fromDate, to: toDate },
          compressionType
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create backup');
      }
      
      // Get the backup task ID and start polling for progress updates
      const { id } = await response.json();
      
      // Store the id in the current backup
      set(state => ({
        currentBackup: {
          ...state.currentBackup,
          id
        }
      }));
      
      // Setup polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/backup/${id}`);
          const progressData = await progressResponse.json();
          
          // Update the progress state
          set({
            currentBackup: {
              ...progressData,
              progress: progressData.progress || 0
            }
          });
          
          // If complete or error, stop polling and update history
          if (
            progressData.status === 'COMPLETED' || 
            progressData.status === 'FAILED'
          ) {
            clearInterval(pollInterval);
            
            // If completed successfully, refresh backup history
            if (progressData.status === 'COMPLETED') {
              await get().fetchBackupHistory();
            }
          }
        } catch (pollError) {
          console.error('Error polling backup status:', pollError);
          clearInterval(pollInterval);
          set({
            currentBackup: {
              status: 'FAILED',
              progress: 0,
              error: pollError instanceof Error ? pollError.message : 'Failed to retrieve backup status',
              endTime: new Date()
            }
          });
        }
      }, 1000); // Poll every second
      
      // Return a cleanup function
      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Error creating backup:', error);
      set({
        currentBackup: {
          status: 'FAILED',
          progress: 0,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          endTime: new Date()
        }
      });
    }
  },
  
  // Download a backup
  downloadBackup: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      // First prepare for download with a PATCH request
      const prepareResponse = await fetch('/api/backup', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      
      if (!prepareResponse.ok) {
        throw new Error('Failed to prepare backup for download');
      }
      
      // Now get the download URL and perform the actual download
      const { url } = await prepareResponse.json();
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      // Create a blob and trigger download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `backup-${id}.${get().compressionType}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error downloading backup:', error);
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      });
    }
  },
  
  // Delete a backup
  deleteBackup: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/backup?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }
      
      // Update the history after successful deletion
      await get().fetchBackupHistory();
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error deleting backup:', error);
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false
      });
    }
  },
  
  // Cancel an in-progress backup
  cancelBackup: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Only attempt to cancel if a backup is in progress
      if (
        get().currentBackup.status !== 'idle' && 
        get().currentBackup.status !== 'COMPLETED' && 
        get().currentBackup.status !== 'FAILED'
      ) {
        const response = await fetch('/api/backup', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: get().currentBackup.id })
        });
        
        if (!response.ok) {
          throw new Error('Failed to cancel backup');
        }
        
        set({
          currentBackup: {
            status: 'CANCELED',
            progress: 0
          },
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error canceling backup:', error);
      set({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
        currentBackup: {
          ...get().currentBackup,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          endTime: new Date()
        }
      });
    }
  },
  
  // State setters
  setSelectedSections: (sections) => set({ selectedSections: sections }),
  setDateRange: (dateRange) => set({ dateRange }),
  setCompressionType: (type) => set({ compressionType: type })
}));

export default useBackupStore; 