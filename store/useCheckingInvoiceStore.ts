import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { CheckStatus } from '@prisma/client'
import moment from 'moment'
import { InvoiceData } from './useInvoiceStore'

export interface CheckInvoiceData extends InvoiceData {
  checkUsername: string | null
  checkTimestamp: Date | null
  checkStatus: CheckStatus
  regionalCode: string
}

interface CheckingInvoiceState {
  // Separate lists for unchecked and checked invoices
  uncheckedInvoices: CheckInvoiceData[]
  checkedInvoices: CheckInvoiceData[]
  isLoading: boolean
  error: string | null
  
  // Pagination for unchecked invoices
  uncheckedCurrentPage: number
  uncheckedTotalPages: number
  
  // Pagination for checked invoices
  checkedCurrentPage: number
  checkedTotalPages: number
  
  // Common pagination settings
  itemsPerPage: number
  
  // Search terms
  uncheckedSearchTerm: string
  checkedSearchTerm: string

  // Date
  uncheckedSelectedDate: Date | undefined
  checkedSelectedDate: Date | undefined

  // Regional code filters
  uncheckedSelectedRegionalCodes: string[]
  checkedSelectedRegionalCodes: string[]
  availableRegionalCodes: string[]

  // Actions
  setUncheckedInvoices: (invoices: CheckInvoiceData[]) => void
  setCheckedInvoices: (invoices: CheckInvoiceData[]) => void
  
  setUncheckedSelectedDate: (date: Date | undefined) => void
  setCheckedSelectedDate: (date: Date | undefined) => void
  
  // Actions
  fetchUncheckedInvoices: () => Promise<void>
  fetchCheckedInvoices: () => Promise<void>
  checkInvoice: (invoiceNumber: number) => Promise<void>
  
  // Pagination actions
  setUncheckedCurrentPage: (page: number) => void
  setCheckedCurrentPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  
  // Search actions
  setUncheckedSearchTerm: (term: string) => void
  setCheckedSearchTerm: (term: string) => void

  // Regional code filter actions
  setUncheckedSelectedRegionalCodes: (codes: string[]) => void
  setCheckedSelectedRegionalCodes: (codes: string[]) => void
  fetchAvailableRegionalCodes: () => Promise<void>
  
  clearAllFilters: () => void
}

export const useCheckingInvoiceStore = create<CheckingInvoiceState>()(
  devtools(
    (set, get) => ({
      uncheckedInvoices: [],
      checkedInvoices: [],
      isLoading: false,
      error: null,
      
      // Pagination
      uncheckedCurrentPage: 1,
      uncheckedTotalPages: 1,
      checkedCurrentPage: 1,
      checkedTotalPages: 1,
      itemsPerPage: 10,
      
      // Search
      uncheckedSearchTerm: '',
      checkedSearchTerm: '',

      // Date
      uncheckedSelectedDate: undefined,
      checkedSelectedDate: undefined,
      
      // Regional code filters
      uncheckedSelectedRegionalCodes: [],
      checkedSelectedRegionalCodes: [],
      availableRegionalCodes: [],
      
      // Actions
      setUncheckedInvoices: (invoices) => {
        set({ uncheckedInvoices: invoices });
      },
      
      setCheckedInvoices: (invoices) => {
        set({ checkedInvoices: invoices });
      },
      
      setUncheckedCurrentPage: (page) => {
        set({ uncheckedCurrentPage: page });
        get().fetchUncheckedInvoices();
      },
      
      setCheckedCurrentPage: (page) => {
        set({ checkedCurrentPage: page });
        get().fetchCheckedInvoices();
      },
      
      setItemsPerPage: (count) => {
        set({ 
          itemsPerPage: count, 
          uncheckedCurrentPage: 1,
          checkedCurrentPage: 1 
        });
        get().fetchUncheckedInvoices();
        get().fetchCheckedInvoices();
      },
      
      setUncheckedSearchTerm: (term) => {
        set({ uncheckedSearchTerm: term, uncheckedCurrentPage: 1 });
        get().fetchUncheckedInvoices();
      },
      
      setCheckedSearchTerm: (term) => {
        set({ checkedSearchTerm: term, checkedCurrentPage: 1 });
        get().fetchCheckedInvoices();
      },

      setUncheckedSelectedRegionalCodes: (codes) => {
        set({ uncheckedSelectedRegionalCodes: codes, uncheckedCurrentPage: 1 });
        get().fetchUncheckedInvoices();
      },

      setCheckedSelectedRegionalCodes: (codes) => {
        set({ checkedSelectedRegionalCodes: codes, checkedCurrentPage: 1 });
        get().fetchCheckedInvoices();
      },

      setUncheckedSelectedDate: (date) => {
        if (moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ uncheckedSelectedDate: date });
        get().fetchUncheckedInvoices();
      },

      setCheckedSelectedDate: (date) => {
        if (moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ checkedSelectedDate: date });
        get().fetchCheckedInvoices();
      },

      fetchAvailableRegionalCodes: async () => {
        try {
          const response = await fetch('/api/party/regionalCodes');
          if (!response.ok) {
            throw new Error('Failed to fetch regional codes');
          }
          const data = await response.json();
          set({ availableRegionalCodes: data.regionalCodes || [] });
        } catch (error) {
          console.error('Error fetching regional codes:', error);
        }
      },

      clearAllFilters: () => {
        set({
          uncheckedSearchTerm: '',
          checkedSearchTerm: '',
          uncheckedSelectedRegionalCodes: [],
          checkedSelectedRegionalCodes: [],
          uncheckedSelectedDate: undefined,
          checkedSelectedDate: undefined,
          uncheckedCurrentPage: 1,
          checkedCurrentPage: 1
        });
        get().fetchUncheckedInvoices();
        get().fetchCheckedInvoices();
      },
      
      fetchUncheckedInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { uncheckedCurrentPage, itemsPerPage, uncheckedSearchTerm, uncheckedSelectedDate, uncheckedSelectedRegionalCodes } = get();
          
          const url = new URL('/api/invoice/check/unchecked', window.location.origin);
          url.searchParams.set('page', uncheckedCurrentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          if (uncheckedSearchTerm) {
            url.searchParams.set('search', uncheckedSearchTerm);
          }

          if (uncheckedSelectedDate) {
            url.searchParams.set('date', moment(uncheckedSelectedDate).format('YYYY-MM-DD'));
          }

          if (uncheckedSelectedRegionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', uncheckedSelectedRegionalCodes.join(','));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            uncheckedInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
              paymodeMode: undefined,
            })),
            uncheckedTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch unchecked invoices', isLoading: false });
        }
      },
      
      fetchCheckedInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { checkedCurrentPage, itemsPerPage, checkedSearchTerm, checkedSelectedDate, checkedSelectedRegionalCodes } = get();
          
          const url = new URL('/api/invoice/check/checked', window.location.origin);
          url.searchParams.set('page', checkedCurrentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          if (checkedSearchTerm) {
            url.searchParams.set('search', checkedSearchTerm);
          }

          if (checkedSelectedDate) {
            url.searchParams.set('date', moment(checkedSelectedDate).format('YYYY-MM-DD'));
          }

          if (checkedSelectedRegionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', checkedSelectedRegionalCodes.join(','));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            checkedInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
            })),
            checkedTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch checked invoices', isLoading: false });
        }
      },
      
      checkInvoice: async (invoiceNumber) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().uncheckedInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const response = await fetch('/api/invoice/check?invoiceNumber=' + invoiceNumber + '&paymodeMode=' + invoice.paymodeMode, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to check invoice');
          }

          // Refresh both lists
          await Promise.all([
            get().fetchUncheckedInvoices(),
            get().fetchCheckedInvoices()
          ]);

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to check invoice', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'checking-invoice-store'
    }
  )
) 