import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { PackageStatus } from '@prisma/client'
import moment from 'moment'
import { InvoiceData } from './useInvoiceStore'

export interface PackInvoiceData extends InvoiceData {
  regionalCode: string

  packageUsername: string | null
  packageTimestamp: Date | null
  packageStatus: PackageStatus
  packImage: string[]
}

interface PackingInvoiceState {
  // Separate lists for unpacked and packed invoices
  unpackedInvoices: PackInvoiceData[]
  packedInvoices: PackInvoiceData[]
  isLoading: boolean
  error: string | null
  
  // Pagination for unpacked invoices
  unpackedCurrentPage: number
  unpackedTotalPages: number
  
  // Pagination for packed invoices
  packedCurrentPage: number
  packedTotalPages: number
  
  // Common pagination settings
  itemsPerPage: number
  
  // Search terms
  unpackedSearchTerm: string
  packedSearchTerm: string

  // Date
  unpackedSelectedDate: Date | undefined
  packedSelectedDate: Date | undefined
  setUnpackedSelectedDate: (date: Date | undefined) => void
  setPackedSelectedDate: (date: Date | undefined) => void

  // Regional code filters
  unpackedSelectedRegionalCodes: string[]
  packedSelectedRegionalCodes: string[]
  availableRegionalCodes: string[]
  
  // Actions
  fetchUnpackedInvoices: () => Promise<void>
  fetchPackedInvoices: () => Promise<void>
  updatePackInvoiceImage: (invoiceNumber: number, image: string) => void
  packInvoice: (invoiceNumber: number) => Promise<void>
  
  // Pagination actions
  setUnpackedCurrentPage: (page: number) => void
  setPackedCurrentPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  
  // Search actions
  setUnpackedSearchTerm: (term: string) => void
  setPackedSearchTerm: (term: string) => void

  // Regional code filter actions
  setUnpackedSelectedRegionalCodes: (codes: string[]) => void
  setPackedSelectedRegionalCodes: (codes: string[]) => void
  fetchAvailableRegionalCodes: () => Promise<void>

  clearAllFilters: () => void
}

export const usePackingInvoiceStore = create<PackingInvoiceState>()(
  devtools(
    (set, get) => ({
      unpackedInvoices: [],
      packedInvoices: [],
      isLoading: false,
      error: null,
      
      // Pagination
      unpackedCurrentPage: 1,
      unpackedTotalPages: 1,
      packedCurrentPage: 1,
      packedTotalPages: 1,
      itemsPerPage: 10,
      
      // Search
      unpackedSearchTerm: '',
      packedSearchTerm: '',

      // Regional code filters
      unpackedSelectedRegionalCodes: [],
      packedSelectedRegionalCodes: [],
      availableRegionalCodes: [],
      
      setUnpackedCurrentPage: (page) => {
        set({ unpackedCurrentPage: page });
        get().fetchUnpackedInvoices();
      },
      
      setPackedCurrentPage: (page) => {
        set({ packedCurrentPage: page });
        get().fetchPackedInvoices();
      },
      
      setItemsPerPage: (count) => {
        set({ 
          itemsPerPage: count, 
          unpackedCurrentPage: 1,
          packedCurrentPage: 1 
        });
        get().fetchUnpackedInvoices();
        get().fetchPackedInvoices();
      },
      
      setUnpackedSearchTerm: (term) => {
        set({ unpackedSearchTerm: term, unpackedCurrentPage: 1 });
        get().fetchUnpackedInvoices();
      },
      
      setPackedSearchTerm: (term) => {
        set({ packedSearchTerm: term, packedCurrentPage: 1 });
        get().fetchPackedInvoices();
      },

      setUnpackedSelectedRegionalCodes: (codes) => {
        set({ unpackedSelectedRegionalCodes: codes, unpackedCurrentPage: 1 });
        get().fetchUnpackedInvoices();
      },

      setPackedSelectedRegionalCodes: (codes) => {
        set({ packedSelectedRegionalCodes: codes, packedCurrentPage: 1 });
        get().fetchPackedInvoices();
      },

      setUnpackedSelectedDate: (date) => {
        set({ unpackedSelectedDate: date });
        get().fetchUnpackedInvoices();
      },

      setPackedSelectedDate: (date) => {
        set({ packedSelectedDate: date });
        get().fetchPackedInvoices();
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
          unpackedSearchTerm: '',
          packedSearchTerm: '',
          unpackedSelectedRegionalCodes: [],
          packedSelectedRegionalCodes: [],
          unpackedSelectedDate: undefined,
          packedSelectedDate: undefined,
          unpackedCurrentPage: 1,
          packedCurrentPage: 1
        });
        get().fetchUnpackedInvoices();
        get().fetchPackedInvoices();
      },
      
      updatePackInvoiceImage: (invoiceNumber, image) => {
        const invoices = [...get().unpackedInvoices];
        const index = invoices.findIndex(item => item.invoiceNumber === invoiceNumber);
        if (index !== -1) {
          if (!invoices[index].packImage) {
            invoices[index].packImage = [];
          }
          invoices[index].packImage.push(image);
          set({ unpackedInvoices: invoices });
        }
      },
      
      fetchUnpackedInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { unpackedCurrentPage, itemsPerPage, unpackedSearchTerm, unpackedSelectedRegionalCodes } = get();
          
          const url = new URL('/api/invoice/pack/unpacked', window.location.origin);
          url.searchParams.set('page', unpackedCurrentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          if (unpackedSearchTerm) {
            url.searchParams.set('search', unpackedSearchTerm);
          }

          if (unpackedSelectedRegionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', unpackedSelectedRegionalCodes.join(','));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            unpackedInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
              packImage: item.packImage || [],
            })),
            unpackedTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch unpacked invoices', isLoading: false });
        }
      },
      
      fetchPackedInvoices: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { packedCurrentPage, itemsPerPage, packedSearchTerm, packedSelectedRegionalCodes } = get();
          
          const url = new URL('/api/invoice/pack/packed', window.location.origin);
          url.searchParams.set('page', packedCurrentPage.toString());
          url.searchParams.set('limit', itemsPerPage.toString());
          
          if (packedSearchTerm) {
            url.searchParams.set('search', packedSearchTerm);
          }

          if (packedSelectedRegionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', packedSelectedRegionalCodes.join(','));
          }
          
          const response = await fetch(url.toString());
          const { data, totalPages } = await response.json();
          
          set({ 
            packedInvoices: data.map((item: any) => ({
              ...item,
              medicalName: item?.party?.customerName || '-',
              city: item?.party?.city || '-',
              regionalCode: item?.party?.regionalCode || '-',
              packImage: item.packImage || [],
            })),
            packedTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch packed invoices', isLoading: false });
        }
      },
      
      packInvoice: async (invoiceNumber) => {
        try {
          set({ isLoading: true });
          
          const invoice = get().unpackedInvoices.find(inv => inv.invoiceNumber === invoiceNumber);
          
          if (!invoice) {
            throw new Error('Invoice not found');
          }

          if (!invoice.packImage || invoice.packImage.length === 0) {
            throw new Error('At least one packaging image is required');
          } 

          const response = await fetch('/api/invoice/pack?invoiceNumber=' + invoiceNumber, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: [...invoice.image, ...invoice.packImage]
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to pack invoice');
          }

          // Refresh both lists
          await Promise.all([
            get().fetchUnpackedInvoices(),
            get().fetchPackedInvoices()
          ]);

          set({ isLoading: false });

        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to pack invoice', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'packing-invoice-store'
    }
  )
) 