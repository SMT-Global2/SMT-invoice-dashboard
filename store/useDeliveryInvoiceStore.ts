import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { DeliveryStatus } from '@prisma/client'
import moment from 'moment'
import { InvoiceData } from './useInvoiceStore'
import { debounce } from '@/lib/debouce'

export interface DeliveryInvoiceData extends InvoiceData {
  regionalCode: string
  pickupUsername: string | null
  pickupTimestamp: Date | null
  
  deliveredUsername: string | null
  deliveredTimestamp: Date | null
  deliveredLocationLink: string | null
  
  transportationId: string | null
  transportationName: string | null
  
  deliveryStatus: DeliveryStatus
}

interface DeliveryInvoiceState {
  // State
  toDeliverInvoices: DeliveryInvoiceData[]
  inTransitInvoices: DeliveryInvoiceData[]
  deliveredInvoices: DeliveryInvoiceData[]
  
  // Separate date states for each tab
  toDeliverSelectedDate: Date | undefined
  inTransitSelectedDate: Date | undefined
  deliveredSelectedDate: Date | undefined
  
  isLoading: boolean
  error: string | null
  
  // Search state
  toDeliverSearchTerm: string
  inTransitSearchTerm: string
  deliveredSearchTerm: string
  
  // Regional code filter state
  toDeliverSelectedRegionalCodes: string[]
  inTransitSelectedRegionalCodes: string[]
  deliveredSelectedRegionalCodes: string[]
  availableRegionalCodes: string[]
  
  //Printing state
  toDeliverInvoicesForPrinting: DeliveryInvoiceData[]
  fetchToDeliverInvoicesForPrinting: () => Promise<void>
  
  // Pagination state
  toDeliverPage: number
  inTransitPage: number
  deliveredPage: number
  toDeliverTotalPages: number
  inTransitTotalPages: number
  deliveredTotalPages: number
  itemsPerPage: number

  // Actions for date selection
  setToDeliverSelectedDate: (date: Date | undefined) => void
  setInTransitSelectedDate: (date: Date | undefined) => void
  setDeliveredSelectedDate: (date: Date | undefined) => void
  
  updateDeliveryInvoiceImage: (invoiceNumber: number, image: string) => void

  clearAllFilters: () => void
  
  // Search actions
  setToDeliverSearchTerm: (term: string) => void
  setInTransitSearchTerm: (term: string) => void
  setDeliveredSearchTerm: (term: string) => void
  
  // Regional code filter actions
  setToDeliverSelectedRegionalCodes: (codes: string[]) => void
  setInTransitSelectedRegionalCodes: (codes: string[]) => void
  setDeliveredSelectedRegionalCodes: (codes: string[]) => void
  fetchAvailableRegionalCodes: () => Promise<void>
  
  // Pagination actions
  setToDeliverPage: (page: number) => void
  setInTransitPage: (page: number) => void
  setDeliveredPage: (page: number) => void
  setItemsPerPage: (limit: number) => void

  // API calls
  fetchToDeliverInvoices: (date?: Date | null) => Promise<void>
  fetchInTransitInvoices: (date?: Date | null) => Promise<void>
  fetchDeliveredInvoices: (date?: Date | null) => Promise<void>
  fetchAllDeliveryInvoices: () => Promise<void>

  debouncedFetchToDeliver: () => void
  debouncedFetchInTransit: () => void
  debouncedFetchDelivered: () => void
  
  pickupInvoice: (invoiceNumber: number) => Promise<void>
  deliverInvoice: (invoiceNumber: number, location: { latitude: number, longitude: number }) => Promise<void>

  // Selection state for bulk actions
  selectedInvoices: number[]
  transporters: { id: string, companyName: string }[]

  // Selection actions
  setSelectedInvoices: (invoiceNumbers: number[]) => void
  fetchTransporters: () => Promise<void>
  
  // Transportation delivery
  deliverWithTransportation: (invoiceNumbers: number[], transportationId: string) => Promise<void>

  // New action for moving to transit
  moveToTransit: (invoiceNumbers: number[]) => Promise<void>
}

export const useDeliveryInvoiceStore = create<DeliveryInvoiceState>()(
  devtools(
    (set, get) => ({
      // State
      toDeliverInvoices: [],
      inTransitInvoices: [],
      deliveredInvoices: [],
      
      // Initialize with separate date states
      toDeliverSelectedDate: undefined,
      inTransitSelectedDate: undefined,
      deliveredSelectedDate: undefined,
      
      isLoading: false,
      error: null,
      
      // Search state
      toDeliverSearchTerm: '',
      inTransitSearchTerm: '',
      deliveredSearchTerm: '',
      
      // Regional code filter state
      toDeliverSelectedRegionalCodes: [],
      inTransitSelectedRegionalCodes: [],
      deliveredSelectedRegionalCodes: [],
      availableRegionalCodes: [],
      
      // Pagination state
      toDeliverPage: 1,
      inTransitPage: 1,
      deliveredPage: 1,
      toDeliverTotalPages: 1,
      inTransitTotalPages: 1,
      deliveredTotalPages: 1,
      itemsPerPage: 10,

      // Actions for date selection
      setToDeliverSelectedDate: (date) => {
        if (date && moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ 
          toDeliverSelectedDate: date,
          toDeliverPage: 1
        });
        get().fetchToDeliverInvoices(date);
      },
      
      setInTransitSelectedDate: (date) => {
        if (date && moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ 
          inTransitSelectedDate: date,
          inTransitPage: 1
        });
        get().fetchInTransitInvoices(date);
      },
      
      setDeliveredSelectedDate: (date) => {
        if (date && moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ 
          deliveredSelectedDate: date,
          deliveredPage: 1
        });
        get().fetchDeliveredInvoices(date);
      },

      clearAllFilters: () => {
        set({
          toDeliverSearchTerm: '',
          inTransitSearchTerm: '',
          deliveredSearchTerm: '',
          toDeliverSelectedRegionalCodes: [],
          inTransitSelectedRegionalCodes: [],
          deliveredSelectedRegionalCodes: [],
          toDeliverSelectedDate: undefined,
          inTransitSelectedDate: undefined,
          deliveredSelectedDate: undefined,
          toDeliverPage: 1,
          inTransitPage: 1,
          deliveredPage: 1,
        });
        get().fetchAllDeliveryInvoices();
      },

      debouncedFetchToDeliver: debounce(() => {
        get().fetchToDeliverInvoices();
      }, 300),
      debouncedFetchInTransit: debounce(() => { 
        get().fetchInTransitInvoices();
      }, 300),
      debouncedFetchDelivered: debounce(() => {
        get().fetchDeliveredInvoices();
      }, 300),

      setToDeliverSearchTerm: (term) => {
        set({ toDeliverSearchTerm: term, toDeliverPage: 1 });

        get().debouncedFetchToDeliver();
      },
      
      setInTransitSearchTerm: (term) => {
        set({ inTransitSearchTerm: term, inTransitPage: 1 });
        get().debouncedFetchInTransit();
      },
      
      setDeliveredSearchTerm: (term) => {
        set({ deliveredSearchTerm: term, deliveredPage: 1 });
        get().debouncedFetchDelivered();
      },

      // Search actions with immediate state update and debounced fetch
      // setToDeliverSearchTerm: (term) => {
      //   set({ toDeliverSearchTerm: term, toDeliverPage: 1 });
      //   debounce(() => {
      //     get().fetchToDeliverInvoices();
      //   }, 300);
      // },
      
      // setInTransitSearchTerm: (term) => {
      //   set({ inTransitSearchTerm: term, inTransitPage: 1 });
      //   debounce(() => {
      //     get().fetchInTransitInvoices();
      //   }, 300);
      // },
      
      // setDeliveredSearchTerm: (term) => {
      //   set({ deliveredSearchTerm: term, deliveredPage: 1 });
      //   debounce(() => {
      //     get().fetchDeliveredInvoices();
      //   }, 300);
      // },

      
      // Regional code filter actions
      setToDeliverSelectedRegionalCodes: (codes) => {
        set({ toDeliverSelectedRegionalCodes: codes, toDeliverPage: 1 });
        get().fetchToDeliverInvoices();
      },
      
      setInTransitSelectedRegionalCodes: (codes) => {
        set({ inTransitSelectedRegionalCodes: codes, inTransitPage: 1 });
        get().fetchInTransitInvoices();
      },
      
      setDeliveredSelectedRegionalCodes: (codes) => {
        set({ deliveredSelectedRegionalCodes: codes, deliveredPage: 1 });
        get().fetchDeliveredInvoices();
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

      updateDeliveryInvoiceImage: (invoiceNumber, image) => {
        // Update image in all three arrays if the invoice exists
        const updateInvoiceImage = (invoices: DeliveryInvoiceData[]) => {
          return invoices.map(invoice => 
            invoice.invoiceNumber === invoiceNumber 
              ? { ...invoice, image: [...invoice.image, image] } 
              : invoice
          );
        };

        set({
          toDeliverInvoices: updateInvoiceImage(get().toDeliverInvoices),
          inTransitInvoices: updateInvoiceImage(get().inTransitInvoices),
          deliveredInvoices: updateInvoiceImage(get().deliveredInvoices)
        });
      },
      
      // Pagination actions
      setToDeliverPage: (page) => {
        set({ toDeliverPage: page });
        get().fetchToDeliverInvoices();
      },
      
      setInTransitPage: (page) => {
        set({ inTransitPage: page });
        get().fetchInTransitInvoices();
      },
      
      setDeliveredPage: (page) => {
        set({ deliveredPage: page });
        get().fetchDeliveredInvoices();
      },

      setItemsPerPage: (limit) => {
        set({ 
          itemsPerPage: limit,
          // Reset pagination when items per page changes
          toDeliverPage: 1,
          inTransitPage: 1,
          deliveredPage: 1
        });
        get().fetchAllDeliveryInvoices();
      },

      // API calls
      fetchToDeliverInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const url = new URL('/api/invoice/deliver/to-deliver', window.location.origin);
          const date = get().toDeliverSelectedDate;
          
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          
          // Add pagination parameters
          const page = get().toDeliverPage;
          const itemsPerPage = get().itemsPerPage;
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          // Add search parameter
          const searchTerm = get().toDeliverSearchTerm;
          if (searchTerm) {
            url.searchParams.set('search', searchTerm);
          }
          
          // Add regional code filter parameters
          const regionalCodes = get().toDeliverSelectedRegionalCodes;
          if (regionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', JSON.stringify(regionalCodes));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          set({ 
            toDeliverInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
            })),
            toDeliverTotalPages: totalPages || 1,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch to-deliver invoices', isLoading: false });
        }
      },

      fetchToDeliverInvoicesForPrinting: async () => {
        try {
          set({ isLoading: true, error: null });
          const fetchInvoicesForPrinting = async () => {
            const url = new URL('/api/invoice/deliver/to-deliver', window.location.origin);
            const date = get().toDeliverSelectedDate;
            
            if (date) {
              url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
            }
            
            // Add pagination parameters
            url.searchParams.set('page', '1');
            url.searchParams.set('limit', '1000000');
            
            // Add search parameter
            const searchTerm = get().toDeliverSearchTerm;
            if (searchTerm) {
              url.searchParams.set('search', searchTerm);
            }
            
            // Add regional code filter parameters
            const regionalCodes = get().toDeliverSelectedRegionalCodes;
            if (regionalCodes.length > 0) {
              url.searchParams.set('regionalCodes', JSON.stringify(regionalCodes));
            }
            
            const response = await fetch(url.toString());
            const { data, totalPages } = await response.json();

            const proccesedData = data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
            }));

            //Sort Data first regional code and then city and then invoice number
            proccesedData.sort((a: any, b: any) => {
              if (a.regionalCode !== b.regionalCode) {
                return a.regionalCode.localeCompare(b.regionalCode);
              }
              if (a.city !== b.city) {
                return a.city.localeCompare(b.city);
              }
              return a.invoiceNumber.localeCompare(b.invoiceNumber);
            });
            
            return proccesedData;
          };

          set({ 
            toDeliverInvoicesForPrinting: await fetchInvoicesForPrinting(),
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch to-deliver invoices', isLoading: false });
        }
      },

      fetchInTransitInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const url = new URL('/api/invoice/deliver/in-transit', window.location.origin);
          const date = get().inTransitSelectedDate;
          
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          
          // Add pagination parameters
          const page = get().inTransitPage;
          const itemsPerPage = get().itemsPerPage;
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          // Add search parameter
          const searchTerm = get().inTransitSearchTerm;
          if (searchTerm) {
            url.searchParams.set('search', searchTerm);
          }
          
          // Add regional code filter parameters
          const regionalCodes = get().inTransitSelectedRegionalCodes;
          if (regionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', JSON.stringify(regionalCodes));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          set({ 
            inTransitInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
            })),
            inTransitTotalPages: totalPages || 1,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch in-transit invoices', isLoading: false });
        }
      },

      fetchDeliveredInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          const url = new URL('/api/invoice/deliver/delivered', window.location.origin);
          const date = get().deliveredSelectedDate;
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          
          // Add pagination parameters
          const page = get().deliveredPage;
          const itemsPerPage = get().itemsPerPage;
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          // Add search parameter
          const searchTerm = get().deliveredSearchTerm;
          if (searchTerm) {
            url.searchParams.set('search', searchTerm);
          }
          
          // Add regional code filter parameters
          const regionalCodes = get().deliveredSelectedRegionalCodes;
          if (regionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', JSON.stringify(regionalCodes));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          set({ 
            deliveredInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
              transportationName: item?.transportation?.companyName || '-',
            })),
            deliveredTotalPages: totalPages || 1,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch delivered invoices', isLoading: false });
        }
      },

      fetchAllDeliveryInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          await Promise.all([
            get().fetchToDeliverInvoices(),
            get().fetchInTransitInvoices(),
            get().fetchDeliveredInvoices(),
            get().fetchAvailableRegionalCodes()
          ]);
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch all delivery invoices', isLoading: false });
        }
      },

      pickupInvoice: async (invoiceNumber: number) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().toDeliverInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const response = await fetch('/api/invoice/deliver/pickup?invoiceNumber=' + invoiceNumber, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to pickup invoice');
          }

          // Refresh all delivery invoices
          await get().fetchAllDeliveryInvoices();

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to pickup invoice', 
            isLoading: false 
          });
          throw error;
        }
      },

      deliverInvoice: async (invoiceNumber: number, location: { latitude: number, longitude: number }) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().inTransitInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          const response = await fetch('/api/invoice/deliver?invoiceNumber=' + invoiceNumber, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              deliveredLocationLink: location.latitude + "," + location.longitude,
              image: invoice.image
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to deliver invoice');
          }

          // Refresh all delivery invoices
          await get().fetchAllDeliveryInvoices();

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to deliver invoice', 
            isLoading: false 
          });
          throw error;
        }
      },

      // Selection state
      selectedInvoices: [],
      transporters: [],

      // Selection actions
      setSelectedInvoices: (invoiceNumbers) => {
        set({ selectedInvoices: invoiceNumbers });
      },
      
      fetchTransporters: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch('/api/transportation');
          if (!response.ok) throw new Error('Failed to fetch transporters');
          
          const result = await response.json();
          // Extract the data array from the response
          const transporterData = result.data || [];
          set({ transporters: transporterData, isLoading: false });
        } catch (error) {
          console.error('Error fetching transporters:', error);
          set({ transporters: [], isLoading: false });
        }
      },

      deliverWithTransportation: async (invoiceNumbers: number[], transportationId: string) => {
        try {
          set({ isLoading: true });
          
          if (invoiceNumbers.length === 0) {
            throw new Error('No invoices selected');
          }

          const response = await fetch('/api/invoice/deliver/transportation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceNumbers,
              transportationId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to deliver with transportation');
          }

          // Refresh all delivery invoices
          await get().fetchAllDeliveryInvoices();
          
          // Clear selection
          set({ selectedInvoices: [] });

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to deliver with transportation', 
            isLoading: false 
          });
          throw error;
        }
      },

      // New action for moving to transit
      moveToTransit: async (invoiceNumbers: number[]) => {
        try {
          set({ isLoading: true });
          
          if (invoiceNumbers.length === 0) {
            throw new Error('No invoices selected');
          }

          const response = await fetch('/api/invoice/deliver/move-to-transit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceNumbers
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to move to transit');
          }

          // Refresh all delivery invoices
          await get().fetchAllDeliveryInvoices();
          
          // Clear selection
          set({ selectedInvoices: [] });

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to move to transit', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'delivery-invoice-store'
    }
  )
) 