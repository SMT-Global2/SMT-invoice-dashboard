import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'
import { AgencyCode } from '@prisma/client'

export interface InventoryData {
  id: string
  generatedDate: Date
  agencyCode: string
  agency?: AgencyCode
  invoiceNumber: string
  invoiceDate: Date
  dueDate?: Date
  lrNumber?: string
  lrDate?: Date
  through?: string
  packages?: string
  orderNumber?: number
  orderDate?: Date
  inventoryCheckUsername?: string | null
  inventoryCheckTimestamp?: Date | null
  voucherNumber?: number | null
  inventoryVoucherUsername?: string | null
  inventoryVoucherTimestamp?: Date | null
  image: string[]
  createdAt: Date
  updatedAt: Date
}

interface InventoryState {
  // Data
  inventoryItems: InventoryData[]
  voucherItems: InventoryData[]
  isLoading: boolean
  error: string | null
  
  // Dialog state
  isDialogOpen: boolean
  dialogType: 'create' | 'edit'
  currentInventoryItem: InventoryData | undefined
  
  // Pagination for check table
  currentPage: number
  totalPages: number
  itemsPerPage: number
  
  // Pagination for voucher table
  voucherCurrentPage: number
  voucherTotalPages: number
  voucherItemsPerPage: number

  selectedInventoryDate: Date  | undefined
  setSelectedInventoryDate: (date: Date  | undefined) => void
  selectedVoucherDate: Date  | undefined
  setSelectedVoucherDate: (date: Date  | undefined) => void

  statusFilter: string | null
  setStatusFilter: (status: string | null) => void
  imageFilter: string | null
  setImageFilter: (filter: string | null) => void
  
  // Actions
  fetchInventoryItems: (params: {
    page: number;
    limit: number;
    search?: string;
    date?: Date;
  }) => Promise<void>
  fetchVoucherItems: (params: {
    page: number;
    limit: number;
    search?: string;
    date?: Date;
    statusFilter?: string | null;
    imageFilter?: string | null;
  }) => Promise<void>
  fetchInventoryItemById: (id: string) => Promise<InventoryData | null>
  createInventoryItem: (data: Partial<InventoryData>) => Promise<void>
  updateInventoryItem: (id: string, data: Partial<InventoryData>) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<void>
  updateInventoryItemImage: (id: string, image: string) => void
  
  // Voucher actions
  addVoucher: (id: string, voucherNumber: number) => Promise<void>
  resetVoucher: (id: string) => Promise<void>
  
  // Dialog actions
  setIsDialogOpen: (isOpen: boolean) => void
  setDialogType: (type: 'create' | 'edit') => void
  setCurrentInventoryItem: (inventory: InventoryData | undefined) => void
  
  // Pagination actions
  setCurrentPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  setVoucherCurrentPage: (page: number) => void
  setVoucherItemsPerPage: (count: number) => void
}

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      // Data
      inventoryItems: [],
      voucherItems: [],
      isLoading: false,
      error: null,
      
      // Dialog state
      isDialogOpen: false,
      dialogType: 'create',
      currentInventoryItem: undefined,
      
      // Pagination for check table
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      
      // Pagination for voucher table
      voucherCurrentPage: 1,
      voucherTotalPages: 1,
      voucherItemsPerPage: 10,

      statusFilter: "All Status",
      imageFilter: "All Images",

      selectedInventoryDate: new Date(),
      selectedVoucherDate: undefined,
      setSelectedInventoryDate: (date) => set({ selectedInventoryDate: date }),
      setSelectedVoucherDate: (date) => set({ selectedVoucherDate: date }),
      
      // Dialog actions
      setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),
      setDialogType: (type) => set({ dialogType: type }),
      setCurrentInventoryItem: (inventory) => set({ currentInventoryItem: inventory }),
      
      // Pagination actions
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
      setVoucherCurrentPage: (page) => set({ voucherCurrentPage: page }),
      setVoucherItemsPerPage: (count) => set({ voucherItemsPerPage: count, voucherCurrentPage: 1 }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      setImageFilter: (filter) => set({ imageFilter: filter }),


      // API calls
      fetchInventoryItems: async ({ page, limit, search, date }) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory', window.location.origin);
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
            throw new Error('Failed to fetch inventory items');
          }
          
          const { data, totalPages } = await response.json();
          
          set({ 
            inventoryItems: data,
            totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch inventory items', isLoading: false });
          console.error(error);
        }
      },
      
      fetchVoucherItems: async ({ page, limit, search, date, statusFilter, imageFilter }) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory', window.location.origin);
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', limit.toString());
          url.searchParams.set('voucher', 'true');
          
          if (search) {
            url.searchParams.set('search', search);
          }
          
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          
          if (statusFilter) {
            url.searchParams.set('status', statusFilter);
          }
          
          if (imageFilter) {
            url.searchParams.set('image', imageFilter);
          }
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch voucher items');
          }
          
          const { data, totalPages } = await response.json();
          
          set({ 
            voucherItems: data,
            voucherTotalPages: totalPages,
            isLoading: false 
          });
        } catch (error) {
          set({ error: 'Failed to fetch voucher items', isLoading: false });
          console.error(error);
        }
      },
      
      fetchInventoryItemById: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            throw new Error('Failed to fetch inventory item');
          }
          
          const { data } = await response.json();
          set({ isLoading: false });
          
          return data;
        } catch (error) {
          set({ error: 'Failed to fetch inventory item', isLoading: false });
          console.error(error);
          return null;
        }
      },
      
      createInventoryItem: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create inventory item');
          }
          
          // Refresh the list
          const { currentPage, itemsPerPage , selectedInventoryDate } = get();
          await get().fetchInventoryItems({ page: currentPage, limit: itemsPerPage , date: selectedInventoryDate });
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create inventory item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateInventoryItem: async (id, data) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory', window.location.origin);
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
            throw new Error(errorData.message || 'Failed to update inventory item');
          }
          
          // Refresh the lists
          const { 
            currentPage, 
            itemsPerPage, 
            voucherCurrentPage, 
            voucherItemsPerPage , 
            statusFilter, 
            imageFilter , 
            selectedInventoryDate , 
            selectedVoucherDate 
          } = get();
          await get().fetchInventoryItems({ page: currentPage, limit: itemsPerPage , date: selectedInventoryDate });
          await get().fetchVoucherItems({ 
            page: voucherCurrentPage, 
            limit: voucherItemsPerPage , 
            statusFilter: statusFilter,
            imageFilter: imageFilter,
            date: selectedVoucherDate
          });
          
          set({ isLoading: false, isDialogOpen: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update inventory item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      deleteInventoryItem: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete inventory item');
          }
          
          // Refresh the lists
          const { currentPage, itemsPerPage , selectedInventoryDate } = get();
          await get().fetchInventoryItems({ page: currentPage, limit: itemsPerPage , date: selectedInventoryDate });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete inventory item', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      updateInventoryItemImage: (id, image) => {
        const items = [...get().voucherItems];
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
          items[index].image.push(image);
          set({ voucherItems: items });
        }
      },
      
      addVoucher: async (id, voucherNumber) => {
        try {
          set({ isLoading: true, error: null });
          const voucherItem = get().voucherItems.find((item) => item.id === id);
          let image = voucherItem?.image;
          
          // if(!image || image.length === 0) {
          //   throw new Error('Atleast one image is required');
          // }

          if(!image || image.length === 0) {
            image = [];
          }   
          const url = new URL('/api/inventory/voucher', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ voucherNumber , image : image })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add voucher');
          }
          
          // Refresh the lists
          const { voucherCurrentPage, voucherItemsPerPage , statusFilter, imageFilter , selectedVoucherDate } = get();
          await get().fetchVoucherItems({ 
            page: voucherCurrentPage, 
            limit: voucherItemsPerPage , 
            statusFilter: statusFilter, 
            imageFilter: imageFilter,
            date: selectedVoucherDate
          });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add voucher', 
            isLoading: false 
          });
          throw error;
        }
      },
      
      resetVoucher: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          const url = new URL('/api/inventory/voucher', window.location.origin);
          url.searchParams.set('id', id);
          
          const response = await fetch(url.toString(), {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset voucher');
          }
          
          // Refresh the lists
          const { voucherCurrentPage, voucherItemsPerPage , statusFilter, imageFilter , selectedVoucherDate } = get();
          await get().fetchVoucherItems({ 
            page: voucherCurrentPage, 
            limit: voucherItemsPerPage , 
            statusFilter: statusFilter, 
            imageFilter: imageFilter,
            date: selectedVoucherDate
          });
          
          set({ isLoading: false });
          
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to reset voucher', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'inventory-store'
    }
  )
); 