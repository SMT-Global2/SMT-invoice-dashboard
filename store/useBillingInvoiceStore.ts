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
  // Unbilled invoices
  unbilledInvoices: BillInvoiceData[]
  isUnbilledLoading: boolean
  unbilledError: string | null
  
  // Billed invoices
  billedInvoices: BillInvoiceData[]
  isBilledLoading: boolean
  billedError: string | null
  
  // Unbilled pagination
  unbilledCurrentPage: number
  unbilledTotalPages: number
  unbilledItemsPerPage: number
  
  // Billed pagination
  billedCurrentPage: number
  billedTotalPages: number
  billedItemsPerPage: number
  
  // Unbilled search and filter
  unbilledSearchTerm: string
  unbilledSelectedDate: Date | undefined
  
  // Billed search and filter
  billedSearchTerm: string
  billedSelectedDate: Date | undefined
  
  // Actions for unbilled invoices
  fetchUnbilledInvoices: () => Promise<void>
  updateUnbilledInvoiceImage: (invoiceNumber: number, image: string) => void
  billInvoice: (invoiceNumber: number) => Promise<void>
  
  // Actions for billed invoices
  fetchBilledInvoices: () => Promise<void>
  resetBilledInvoice: (invoiceNumber: number) => Promise<void>
  
  // Unbilled pagination actions
  setUnbilledCurrentPage: (page: number) => void
  setUnbilledItemsPerPage: (count: number) => void
  
  // Billed pagination actions
  setBilledCurrentPage: (page: number) => void
  setBilledItemsPerPage: (count: number) => void
  
  // Unbilled search and filter actions
  setUnbilledSearchTerm: (term: string) => void
  setUnbilledSelectedDate: (date: Date | undefined) => void
  
  // Billed search and filter actions
  setBilledSearchTerm: (term: string) => void
  setBilledSelectedDate: (date: Date | undefined) => void
}

export const useBillingInvoiceStore = create<BillingInvoiceState>()(
  devtools(
    (set, get) => ({
      // Unbilled invoices
      unbilledInvoices: [],
      isUnbilledLoading: false,
      unbilledError: null,
      
      // Billed invoices
      billedInvoices: [],
      isBilledLoading: false,
      billedError: null,
      
      // Unbilled pagination
      unbilledCurrentPage: 1,
      unbilledTotalPages: 1,
      unbilledItemsPerPage: 10,
      
      // Billed pagination
      billedCurrentPage: 1,
      billedTotalPages: 1,
      billedItemsPerPage: 10,
      
      // Unbilled search and filter
      unbilledSearchTerm: '',
      unbilledSelectedDate: undefined,
      
      // Billed search and filter
      billedSearchTerm: '',
      billedSelectedDate: undefined,
      
      // Unbilled pagination actions
      setUnbilledCurrentPage: (page) => {
        set({ unbilledCurrentPage: page });
        get().fetchUnbilledInvoices();
      },
      
      setUnbilledItemsPerPage: (count) => {
        set({ unbilledItemsPerPage: count, unbilledCurrentPage: 1 });
        get().fetchUnbilledInvoices();
      },
      
      // Billed pagination actions
      setBilledCurrentPage: (page) => {
        set({ billedCurrentPage: page });
        get().fetchBilledInvoices();
      },
      
      setBilledItemsPerPage: (count) => {
        set({ billedItemsPerPage: count, billedCurrentPage: 1 });
        get().fetchBilledInvoices();
      },
      
      // Unbilled search and filter actions
      setUnbilledSearchTerm: (term) => {
        set({ unbilledSearchTerm: term, unbilledCurrentPage: 1 });
        get().fetchUnbilledInvoices();
      },
      
      setUnbilledSelectedDate: (date) => {
        set({ unbilledSelectedDate: date, unbilledCurrentPage: 1 });
        get().fetchUnbilledInvoices();
      },
      
      // Billed search and filter actions
      setBilledSearchTerm: (term) => {
        set({ billedSearchTerm: term, billedCurrentPage: 1 });
        get().fetchBilledInvoices();
      },
      
      setBilledSelectedDate: (date) => {
        set({ billedSelectedDate: date, billedCurrentPage: 1 });
        get().fetchBilledInvoices();
      },
      
      // Update unbilled invoice image
      updateUnbilledInvoiceImage: (invoiceNumber, image) => {
        const invoices = [...get().unbilledInvoices];
        const index = invoices.findIndex(item => item.invoiceNumber === invoiceNumber);
        if (index !== -1) {
          invoices[index].billImage.push(image);
          set({ unbilledInvoices: invoices });
        }
      },
      
      // Fetch unbilled invoices
      fetchUnbilledInvoices: async () => {
        try {
          set({ isUnbilledLoading: true, unbilledError: null });
          
          const { unbilledCurrentPage, unbilledItemsPerPage, unbilledSearchTerm, unbilledSelectedDate } = get();
          
          const url = new URL('/api/invoice/bill/unbilled', window.location.origin);
          url.searchParams.set('page', unbilledCurrentPage.toString());
          url.searchParams.set('limit', unbilledItemsPerPage.toString());
          
          if (unbilledSearchTerm) {
            url.searchParams.set('search', unbilledSearchTerm);
          }
          
          if (unbilledSelectedDate) {
            url.searchParams.set('date', moment(unbilledSelectedDate).format('YYYY-MM-DD'));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            unbilledInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              billImage: [],
            })),
            unbilledTotalPages: totalPages,
            isUnbilledLoading: false 
          });
        } catch (error) {
          set({ unbilledError: 'Failed to fetch unbilled invoices', isUnbilledLoading: false });
        }
      },
      
      // Fetch billed invoices
      fetchBilledInvoices: async () => {
        try {
          set({ isBilledLoading: true, billedError: null });
          
          const { billedCurrentPage, billedItemsPerPage, billedSearchTerm, billedSelectedDate } = get();
          
          const url = new URL('/api/invoice/bill/billed', window.location.origin);
          url.searchParams.set('page', billedCurrentPage.toString());
          url.searchParams.set('limit', billedItemsPerPage.toString());
          
          if (billedSearchTerm) {
            url.searchParams.set('search', billedSearchTerm);
          }
          
          if (billedSelectedDate) {
            url.searchParams.set('date', moment(billedSelectedDate).format('YYYY-MM-DD'));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            billedInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              billImage: [],
            })),
            billedTotalPages: totalPages,
            isBilledLoading: false 
          });
        } catch (error) {
          set({ billedError: 'Failed to fetch billed invoices', isBilledLoading: false });
        }
      },
      
      // Bill an invoice
      billInvoice: async (invoiceNumber) => {
        try {
          set({ isUnbilledLoading: true });
          
          const invoice = get().unbilledInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          if (invoice.billImage.length === 0) {
            throw new Error('At least one billing image is required');
          } 

          const response = await fetch('/api/invoice/bill/unbilled?invoiceNumber=' + invoiceNumber, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: [...invoice.image, ...invoice.billImage]
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to bill invoice');
          }

          // Refresh both unbilled and billed invoices
          await Promise.all([
            get().fetchUnbilledInvoices(),
            get().fetchBilledInvoices()
          ]);
          
          set({ isUnbilledLoading: false });
        } catch (error) {
          set({ 
            unbilledError: error instanceof Error ? error.message : 'Failed to bill invoice', 
            isUnbilledLoading: false 
          });
          throw error;
        }
      },
      
      // Reset a billed invoice
      resetBilledInvoice: async (invoiceNumber) => {
        try {
          set({ isBilledLoading: true });
          
          const invoice = get().billedInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const response = await fetch('/api/invoice/bill/billed?invoiceNumber=' + invoiceNumber, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset invoice');
          }

          // Refresh both unbilled and billed invoices
          await Promise.all([
            get().fetchUnbilledInvoices(),
            get().fetchBilledInvoices()
          ]);
          
          set({ isBilledLoading: false });
        } catch (error) {
          set({ 
            billedError: error instanceof Error ? error.message : 'Failed to reset invoice', 
            isBilledLoading: false 
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