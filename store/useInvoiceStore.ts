import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'
import { CheckStatus, PackageStatus } from '@prisma/client'

export interface InvoiceData {
  date: Date
  invoiceNumber: number
  partyCode: string
  medicalName: string
  city: string
  image: string[]
  timestamp: string
  generatedDate: Date | null
}

export interface CheckInvoiceData extends InvoiceData {
  checkUsername : string | null
  checkTimestamp : Date | null
  checkStatus : CheckStatus
}

export interface PackInvoiceData extends InvoiceData {
  packUsername : string | null
  packTimestamp : Date | null
  packStatus : PackageStatus
}

interface InvoiceState {
  invoices: InvoiceData[]
  checkInvoices: CheckInvoiceData[]
  packInvoices: PackInvoiceData[]
  selectedDate: Date | null
  currentPage: number
  itemsPerPage: number
  isLoading: boolean
  error: string | null
  invoiceStartNo: number
  // Actions
  setInvoices: (invoices: InvoiceData[]) => void
  setSelectedDate: (date: Date | null) => void
  setCurrentPage: (page: number) => void
  updateInvoiceImage: (sr: number, image: string) => void
  fetchInvoices: (date?: Date | null) => Promise<void>
  fetchCheckInvoices: () => Promise<void>
  fetchPackInvoices: () => Promise<void>
  handleInvoices: () => Promise<void>
}

export const useInvoiceStore = create<InvoiceState>()(
  devtools(
    (set, get) => ({
      invoices: [],
      invoiceStartNo: -1,
      selectedDate: null,
      currentPage: 1,
      itemsPerPage: 100,
      isLoading: false,
      error: null,

      setInvoices: (invoices) => set({ invoices }),
      setSelectedDate: (date) => {
        set({ selectedDate: date });
        get().fetchInvoices(date);
      },
      setCurrentPage: (page) => set({ currentPage: page }),
      
      updateInvoiceImage: (sr, image) => {
        const invoices = [...get().invoices]
        const index = invoices.findIndex(item => item.invoiceNumber === sr)
        if (index !== -1) {
          invoices[index].image.push(image)
          set({ invoices })
        }
      },

      fetchInvoices: async (date = get().selectedDate) => {
        try {
          set({ isLoading: true, error: null });
          const url = new URL('/api/invoice/getToday', window.location.origin);
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          const response = await fetch(url.toString());
          const { data } = await response.json();
          set({ invoices: data, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch invoices', isLoading: false });
        }
      },

      handleInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const HANDLE_LIMIT = 300;

          // Get invoice start number
          const startNoResponse = await fetch('/api/invoice/startNo');
          const { data: startNoData } = await startNoResponse.json();
          
          if (!startNoData) {
            set({ error: 'Failed to get invoice start number', isLoading: false });
            return;
          }

          set({ invoiceStartNo: startNoData });

          // Get today's invoices
          const todayResponse = await fetch('/api/invoice/getToday');
          const { data: todayInvoices } = await todayResponse.json();

          const finalInvoices: InvoiceData[] = [];
          let currentNo = startNoData;

          for (let i = 0; i < HANDLE_LIMIT; i++) {
            const existingInvoice = todayInvoices.find(
              (item: any) => item.invoiceNumber === currentNo
            );

            if (existingInvoice) {
              finalInvoices.push(existingInvoice);
            } else {
              finalInvoices.push({
                invoiceNumber: currentNo,
                date: moment().startOf('day').toDate(),
                partyCode: '',
                medicalName: '-',
                city: '-',
                image: [],
                timestamp: moment().toISOString(),
                generatedDate: null
              });
            }
            currentNo++;
          }

          set({ invoices: finalInvoices, isLoading: false });
        } catch (error) {
          console.error('Error handling invoices:', error);
          set({ 
            error: 'Failed to process invoices', 
            isLoading: false 
          });
        }
      },

      fetchCheckInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await fetch('/api/invoice/check');
          const { data } = await response.json();
          set({ checkInvoices: data, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch check invoices', isLoading: false });
        }
      },

      fetchPackInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await fetch('/api/invoice/pack');
          const { data } = await response.json();
          set({ packInvoices: data, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch pack invoices', isLoading: false });
        }
      },


      
    }),
    {
      name: 'invoice-store'
    }
  )
)