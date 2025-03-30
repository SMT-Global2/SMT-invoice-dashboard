import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'
import { PaymodeMode } from '@prisma/client'

export interface InvoiceData {
  invoiceNumber: number
  partyCode: string
  medicalName: string
  isOtc: boolean
  city: string
  image: string[]
  paymodeMode : PaymodeMode | null
  generatedDate: Date | null
  invoiceTimestamp: Date | null
  isDisabled: boolean   
}

interface InvoiceState {
  invoices: InvoiceData[]
  selectedDate: Date | undefined
  currentPage: number
  itemsPerPage: number
  isLoading: boolean
  error: string | null
  invoiceStartNo: number
  invoiceEndNo: number | null

  // Actions
  setInvoices: (invoices: InvoiceData[]) => void
  setSelectedDate: (date: Date | undefined) => void
  setCurrentPage: (page: number) => void

  updateInvoiceImage: (sr: number, image: string) => void
  handleInvoices: () => Promise<void>

  fetchInvoices: (date?: Date | null) => Promise<void>
  saveInvoice: (invoiceNumber: number, isOtc?: boolean) => Promise<void>
  resetInvoice: (invoiceNumber: number) => Promise<void>
}

export const useInvoiceStore = create<InvoiceState>()(
  devtools(
    (set, get) => ({
      invoices: [],

      invoiceStartNo: -1,
      selectedDate: moment().startOf('day').toDate(),
      currentPage: 1,
      itemsPerPage: 100,
      isLoading: false,

      setInvoices: (invoices) => set({ invoices }),
      setSelectedDate: (date) => {
        if (moment(date).isAfter(moment(), 'day')) {
          return;
        }
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
          const url = new URL('/api/invoice', window.location.origin);
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

          const date = get().selectedDate ?? new Date();
          const HANDLE_LIMIT = 999;

          // Get invoice start number
          const [startNoResponse , todayResponse] = await Promise.all([
            fetch('/api/invoice/startNo?date=' + moment(date).format('YYYY-MM-DD')),
            fetch('/api/invoice?date=' + moment(date).format('YYYY-MM-DD'))
          ]);

          const {    
            invoiceStartNo,
            invoiceEndNo
          } = await startNoResponse.json();
          
          if (!invoiceStartNo) {
            set({ error: 'Failed to get invoice start number', isLoading: false });
            return;
          }

          set({ invoiceStartNo: invoiceStartNo , invoiceEndNo: invoiceEndNo });

          // Get today's invoices
          const { data: todayInvoices } = await todayResponse.json();

          //Logi for current no
          //if we find invoice that is today which is less than current no then that is our start else start no.
          let currentNo = invoiceStartNo;
          // if (todayInvoices.length > 0) {
          //   currentNo = Math.min(currentNo , ...todayInvoices.map((item: any) => item.invoiceNumber));
          // }

          const finalInvoices: InvoiceData[] = [];

          let maximumInvoiceNumber = invoiceEndNo ? invoiceEndNo : invoiceStartNo + HANDLE_LIMIT;

          if(moment(date).isSame(moment() , 'day')) {
            maximumInvoiceNumber = Math.max(maximumInvoiceNumber , invoiceStartNo + HANDLE_LIMIT)
          }

          for (let i = invoiceStartNo; i <= maximumInvoiceNumber; i++) {
            const existingInvoice = todayInvoices.find(
              (item: any) => item.invoiceNumber === currentNo
            );

            if (existingInvoice) {
              finalInvoices.push({ 
                ...existingInvoice,
                medicalName : existingInvoice.party.customerName || '-',
                city : existingInvoice.party.city || '-',
              });
            } else if(
              moment(date).isSame(moment(), 'day')
            ) {
              finalInvoices.push({
                invoiceNumber: currentNo,
                generatedDate: moment(date).startOf('day').toDate(),
                partyCode: '',
                medicalName: '-',
                isOtc: false,
                paymodeMode: null,
                city: '-',
                image: [],
                invoiceTimestamp : null,
                isDisabled : (
                  //Disabled if date is 3 days ago
                  moment(date).isSame(moment().subtract(3, 'days'), 'day')
                )
              });
            } else if(invoiceEndNo) {
              finalInvoices.push({
                invoiceNumber: currentNo,
                generatedDate: moment(date).startOf('day').toDate(),
                partyCode: '',
                medicalName: '-',
                isOtc: false,
                paymodeMode: null,
                city: '-',
                image: [],
                invoiceTimestamp : null,
                isDisabled : (
                  //Disabled if date is 3 days ago
                  moment(date).isSame(moment().subtract(3, 'days'), 'day')
                )
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

      saveInvoice: async (invoiceNumber: number , isOtc?: boolean) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().invoices.find(inv => inv.invoiceNumber === invoiceNumber);
          const date = get().selectedDate;

          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const invoiceToSave = {
            invoiceNumber : invoice.invoiceNumber,
            generatedDate: date,
            partyCode : invoice.partyCode,
            image: invoice.image,
            isOtc: isOtc || false,
            paymodeMode: invoice.paymodeMode,
            invoiceTimestamp : moment().toDate(),
          };

          const response = await fetch('/api/invoice' + (isOtc ? '/otc' : '/save'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceToSave),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save invoice');
          }

          const { data } = await response.json();

          const updatedInvoices = get().invoices.map(inv => 
            inv.invoiceNumber === invoiceNumber ? { ...inv, ...data } : inv
          );

          set({ invoices: updatedInvoices, isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to save invoice', 
            isLoading: false 
          });
          throw error;
        }
      },

      resetInvoice: async (invoiceNumber: number) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().invoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          if(invoice.invoiceTimestamp) {
            const response = await fetch('/api/invoice?invoiceNumber=' + invoiceNumber, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to reset invoice');
            }
          }

          //call hanldeInvoice
          await get().handleInvoices();

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to reset invoice', 
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'invoice-store'
    }
  )
)