import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'
import { PartyCode } from '@prisma/client'

export interface ExpiryData {
  id: string
  generatedDate: Date
  voucherNumber: string
  image: string[]
  partyCode: string
  party?: PartyCode
  expiryDate: Date
  expiryUsername?: string | null
  expiryTimestamp?: Date | null
  creditNoteNumber?: string | null
  creditNoteUsername?: string | null
  creditNoteTimestamp?: Date | null
  createdAt: Date
  updatedAt: Date
}

interface ExpiryState {
  // Data
  expiryItems: ExpiryData[]
  importedExpiryItems: ExpiryData[]
  isLoading: boolean
  error: string | null
  
  // Dialog state
  isDialogOpen: boolean
  dialogType: 'create' | 'edit'
  currentExpiryItem: ExpiryData | undefined
  
  // Pagination for record table (not imported)
  currentPage: number
  totalPages: number
  itemsPerPage: number
  
  // Pagination for internal operator table (imported)
  importedCurrentPage: number
  importedTotalPages: number
  importedItemsPerPage: number
  
  // Actions
  fetchExpiryItems: (params: {
    page: number;
    limit: number;
    search?: string;
    date?: Date;
  }) => Promise<void>
  fetchImportedExpiryItems: (params: {
    page: number;
    limit: number;
    search?: string;
    date?: Date;
  }) => Promise<void>
  fetchExpiryItemById: (id: string) => Promise<ExpiryData | null>
  createExpiryItem: (data: Partial<ExpiryData>) => Promise<void>
  updateExpiryItem: (id: string, data: Partial<ExpiryData>) => Promise<void>
  deleteExpiryItem: (id: string) => Promise<void>
  updateExpiryItemImage: (id: string, image: string) => void
  
  // Credit note actions
  addCreditNote: (id: string, creditNoteNumber: string) => Promise<void>
  resetCreditNote: (id: string) => Promise<void>
  
  // Dialog actions
  setIsDialogOpen: (isOpen: boolean) => void
  setDialogType: (type: 'create' | 'edit') => void
  setCurrentExpiryItem: (expiry: ExpiryData | undefined) => void
  
  // Pagination actions
  setCurrentPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  setImportedCurrentPage: (page: number) => void
  setImportedItemsPerPage: (count: number) => void
}

export const useExpiryStore = create<ExpiryState>()(
  devtools(
    (set, get) => ({
      // Data
      expiryItems: [],
      importedExpiryItems: [],
      isLoading: false,
      error: null,
      
      // Dialog state
      isDialogOpen: false,
      dialogType: 'create',
      currentExpiryItem: undefined,
      
      // Pagination for record table
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      
      // Pagination for internal operator table
      importedCurrentPage: 1,
      importedTotalPages: 1,
      importedItemsPerPage: 10,
      
      // Dialog actions
      setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),
      setDialogType: (type) => set({ dialogType: type }),
      setCurrentExpiryItem: (expiry) => set({ currentExpiryItem: expiry }),
      
      // Pagination actions
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
      setImportedCurrentPage: (page) => set({ importedCurrentPage: page }),
      setImportedItemsPerPage: (count) => set({ importedItemsPerPage: count, importedCurrentPage: 1 }),
      
      // API calls
      fetchExpiryItems: async ({ page, limit, search, date }) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry', window.location.origin);
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', limit.toString());
          
          if (search) {
            url.searchParams.set('search', search);
          }
          
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }

          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch expiry items');
          }
          
          const { data, totalPages } = await response.json();
          
          set({ 
            expiryItems: data,
            totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch expiry items', isLoading: false });
          console.error(error);
        }
      },
      
      fetchImportedExpiryItems: async ({ page, limit, search, date }) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry', window.location.origin);
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', limit.toString());
          url.searchParams.set('imported', 'true');
          
          if (search) {
            url.searchParams.set('search', search);
          }
          
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch imported expiry items');
          }
          
          const { data, totalPages } = await response.json();
          
          set({ 
            importedExpiryItems: data,
            importedTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch imported expiry items', isLoading: false });
          console.error(error);
        }
      },
      
      fetchExpiryItemById: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch expiry item');
          }
          
          const { data } = await response.json();
          set({ isLoading: false });
          
          return data;
        } catch (error) {
          set({ error: 'Failed to fetch expiry item', isLoading: false });
          console.error(error);
          return null;
        }
      },
      
      createExpiryItem: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await fetch('/api/expiry', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create expiry item');
          }
          
          // Refresh the list
          const { currentPage, itemsPerPage } = get();
          await get().fetchExpiryItems({ page: currentPage, limit: itemsPerPage });
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create expiry item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateExpiryItem: async (id, data) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update expiry item');
          }
          
          // Refresh the lists
          const { currentPage, itemsPerPage, importedCurrentPage, importedItemsPerPage } = get();
          await get().fetchExpiryItems({ page: currentPage, limit: itemsPerPage });
          await get().fetchImportedExpiryItems({ page: importedCurrentPage, limit: importedItemsPerPage });
          
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update expiry item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      deleteExpiryItem: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete expiry item');
          }
          
          // Refresh the lists
          const { currentPage, itemsPerPage } = get();
          await get().fetchExpiryItems({ page: currentPage, limit: itemsPerPage });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete expiry item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateExpiryItemImage: (id, image) => {
        const items = [...get().expiryItems];
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
          items[index].image.push(image);
          set({ expiryItems: items });
        }
      },
      
      addCreditNote: async (id, creditNoteNumber) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry/credit-note', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ creditNoteNumber })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add credit note');
          }
          
          // Refresh the lists
          const { importedCurrentPage, importedItemsPerPage } = get();
          await get().fetchImportedExpiryItems({ page: importedCurrentPage, limit: importedItemsPerPage });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add credit note', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      resetCreditNote: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/expiry/credit-note', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset credit note');
          }
          
          // Refresh the lists
          const { importedCurrentPage, importedItemsPerPage } = get();
          await get().fetchImportedExpiryItems({ page: importedCurrentPage, limit: importedItemsPerPage });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to reset credit note', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'expiry-store'
    }
  )
);
