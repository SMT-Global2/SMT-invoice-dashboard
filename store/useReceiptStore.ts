import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'
import 'moment-timezone'
import { PartyCode } from '@prisma/client'
import { PaymentMethodFilter } from 'app/(dashboard)/receipt/record-table'

export type Cheque = {
  number: string;
  bank: string;
  date: Date;
  amount: number;
}

export type CurrencyBills = {
  '500': number;
  '200': number;
  '100': number;
  '50': number;
  '20': number;
  '10': number;
}

export type PaymentMethod = 'NONE' | 'CASH' | 'CHEQUE';

export interface ReceiptData {
  id: string;
  receiptNumber: number;
  generatedDate: Date;
  amount: number;
  remarks?: string | null;
  receiptUsername?: string | null;
  receiptTimestamp?: Date | null;
  paymentMethod: PaymentMethod;
  currencyBills?: CurrencyBills | null;
  cheque?: Cheque | null;
  partyCode: string;
  party?: PartyCode;
  createdAt: Date;
  updatedAt: Date;
}

interface ReceiptState {
  // Data
  receiptItems: ReceiptData[];
  isLoading: boolean;
  error: string | null;
  
  // Dialog state
  isDialogOpen: boolean;
  dialogType: 'create' | 'edit';
  currentReceiptItem: ReceiptData | undefined;
  
  // Pagination for record table
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  // Actions
  fetchReceiptItems: (params?: Record<string, string>) => Promise<void>;
  
  fetchReceiptItemById: (id: string) => Promise<ReceiptData | null>;
  createReceiptItem: (data: Partial<ReceiptData>) => Promise<void>;
  updateReceiptItem: (id: string, data: Partial<ReceiptData>) => Promise<void>;
  deleteReceiptItem: (id: string) => Promise<void>;
  
  // Dialog actions
  setIsDialogOpen: (isOpen: boolean) => void;
  setDialogType: (type: 'create' | 'edit') => void;
  setCurrentReceiptItem: (receipt: ReceiptData | undefined) => void;
  
  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;

  // Search and filter
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedPaymentMethod: PaymentMethodFilter | undefined;
  setSelectedPaymentMethod: (method: PaymentMethodFilter | undefined) => void;
}

export const useReceiptStore = create<ReceiptState>()(
  devtools(
    (set, get) => ({
      // Data
      receiptItems: [],
      isLoading: false,
      error: null,
      
      // Dialog state
      isDialogOpen: false,
      dialogType: 'create',
      currentReceiptItem: undefined,
      
      // Pagination for record table
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      

      // Search and filter
      searchTerm: '',
      setSearchTerm: (term) => set({ searchTerm: term }),
      selectedDate: moment().tz('Asia/Kolkata').toDate(), // Set to today's date in IST
      setSelectedDate: (date) => set({ selectedDate: date }),
      selectedPaymentMethod: 'ALL',
      setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
      
      // Dialog actions
      setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),
      setDialogType: (type) => set({ dialogType: type }),
      setCurrentReceiptItem: (receipt) => set({ currentReceiptItem: receipt }),
      
      // Pagination actions
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
      
      // API calls
      fetchReceiptItems: async (params?: Record<string, string>) => {
        set({ isLoading: true, error: null });
        try {
          const { currentPage, itemsPerPage, searchTerm, selectedDate, selectedPaymentMethod } = get();
          
          // Construct URL with query parameters
          const url = new URL('/api/receipt', window.location.origin);
          url.searchParams.set('page', currentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          // Add search term if present
          if (searchTerm) {
            url.searchParams.set('search', searchTerm);
          }
          
          // Add date filter if present
          if (selectedDate) {
            const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
            url.searchParams.set('date', formattedDate);
          }
          
          // Add payment method filter if present and not 'ALL'
          if (selectedPaymentMethod && selectedPaymentMethod !== 'ALL') {
            url.searchParams.set('paymentMethod', selectedPaymentMethod);
          }
          
          // Add any additional params that were passed in
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              url.searchParams.set(key, value);
            });
          }
          
          // Fetch data from API
          const response = await fetch(url);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch receipt items');
          }
          
          const data = await response.json();
          set({ 
            receiptItems: data.data, 
            totalPages: data.totalPages,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error fetching receipt items:', error);
          set({ 
            error: error instanceof Error ? error.message : 'An unknown error occurred',
            isLoading: false 
          });
        }
      },
      
      fetchReceiptItemById: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/receipt', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch receipt item');
          }
          
          const { data } = await response.json();
          set({ isLoading: false });
          
          return data;
        } catch (error) {
          set({ error: 'Failed to fetch receipt item', isLoading: false });
          console.error(error);
          return null;
        }
      },
      
      createReceiptItem: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await fetch('/api/receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create receipt item');
          }
          
          // Refresh the list
          await get().fetchReceiptItems();
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create receipt item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateReceiptItem: async (id, data) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/receipt', window.location.origin);
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
            throw new Error(errorData.message || 'Failed to update receipt item');
          }
          
          // Refresh the list
          await get().fetchReceiptItems();
            
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update receipt item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      deleteReceiptItem: async (id) => {
        try {
          set({ isLoading: true, error: null });

          const url = new URL('/api/receipt', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete receipt item');
          }
          
          // Refresh the list
          await get().fetchReceiptItems();
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete receipt item', 
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'receipt-store'
    }
  )
);

