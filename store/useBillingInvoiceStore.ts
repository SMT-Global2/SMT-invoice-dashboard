import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { BilledStatus } from '@prisma/client'
import moment from 'moment'
import { InvoiceData } from './useInvoiceStore'

export interface BillInvoiceData extends InvoiceData {
  billedUsername: string | null
  billedTimestamp: Date | null
  billedStatus: BilledStatus
  billImage: string[]
}

interface BillingInvoiceState {
  billInvoices: BillInvoiceData[]
  isLoading: boolean
  error: string | null
  
  // Pagination
  currentPage: number
  totalPages: number
  itemsPerPage: number
  
  // Search and filter
  searchTerm: string
  selectedDate: Date | undefined
  
  // Actions
  fetchBillInvoices: () => Promise<void>
  updateBillInvoiceImage: (invoiceNumber: number, image: string) => void
  billInvoice: (invoiceNumber: number) => Promise<void>
  
  // Pagination actions
  setCurrentPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  
  // Search and filter actions
  setSearchTerm: (term: string) => void
  setSelectedDate: (date: Date | undefined) => void
}

export const useBillingInvoiceStore = create<BillingInvoiceState>()(
  devtools(
    (set, get) => ({
      billInvoices: [],
      isLoading: false,
      error: null,
      
      // Pagination
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      
      // Search and filter
      searchTerm: '',
      selectedDate: undefined,
      
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => {
        set({ itemsPerPage: count, currentPage: 1 });
        get().fetchBillInvoices();
      },
      
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
        get().fetchBillInvoices();
      },
      
      setSelectedDate: (date) => {
        set({ selectedDate: date, currentPage: 1 });
        get().fetchBillInvoices();
      },
      
      updateBillInvoiceImage: (invoiceNumber, image) => {
        const invoices = [...get().billInvoices];
        const index = invoices.findIndex(item => item.invoiceNumber === invoiceNumber);
        if (index !== -1) {
          invoices[index].billImage.push(image);
          set({ billInvoices: invoices });
        }
      },
      
      fetchBillInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { currentPage, itemsPerPage, searchTerm, selectedDate } = get();
          
          const url = new URL('/api/invoice/bill', window.location.origin);
          url.searchParams.set('page', currentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          if (searchTerm) {
            url.searchParams.set('search', searchTerm);
          }
          
          if (selectedDate) {
            url.searchParams.set('date', moment(selectedDate).format('YYYY-MM-DD'));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            billInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              billImage: [],
            })),
            totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch bill invoices', isLoading: false });
        }
      },
      
      billInvoice: async (invoiceNumber) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().billInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          if (invoice.billImage.length === 0) {
            throw new Error('At least one billing image is required');
          } 

          const response = await fetch('/api/invoice/bill?invoiceNumber=' + invoiceNumber, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: [...invoice.image , ...invoice.billImage]
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to bill invoice');
          }

          await get().fetchBillInvoices();
          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to bill invoice', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'billing-invoice-store'
    }
  )
) 