import { create } from 'zustand'
import { Invoice, CheckStatus, PackageStatus, DeliveryStatus, PartyCode, User } from '@prisma/client'


export interface IInvoice extends Invoice {
  party : PartyCode;
  invoicedBy ?: User;
  checkedBy ?: User;
  packedBy ?: User;
  pickedBy ?: User;
  deliveredBy ?: User;
}

interface PaginationState {
  page: number;
  limit: number;
}

interface Analytics {
  totalGenerated: number;
  totalChecked: number;
  totalPacked: number;
  totalPickedUp: number;
  totalDelivered: number;
  totalOTC: number;
}


type SortOrder = 'asc' | 'desc';
type SortField = 'invoiceNumber' | 'invoiceTimestamp';

interface FilterState {
  searchQuery: string;
  date: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
}

interface AnalyticsState {
  isLoading: boolean;
  error: string | null;
  
  allInvoices: {
    invoices: IInvoice[];
    total: number;
  }
  analytics: Analytics;
  
  pagination: PaginationState;
  filters: FilterState;
  totalPages: number;
  
  // Actions
  fetchAnalytics: () => Promise<void>;

  // Additional actions
  setPagination: (pagination: PaginationState) => void;
  setFilters: (filters: FilterState) => void;
}

const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  isLoading: false,
  error: null,

  allInvoices: {
    invoices: [],
    total: 0
  },


  analytics: {
    totalGenerated: 0,
    totalChecked: 0,
    totalPacked: 0,
    totalPickedUp: 0,
    totalDelivered: 0,
    totalOTC: 0
  },

  pagination: {
    page: 0,
    limit: 10
  },
  filters: {
    searchQuery: '',
    date: new Date().toISOString(),
    sortField: 'invoiceTimestamp',
    sortOrder: 'desc'
  },
  totalPages: 0,

  setPagination: (pagination) => set({ pagination }),
  setFilters: (filters) => set({ filters }),

  fetchAnalytics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { pagination, filters } = get();
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.searchQuery,
        sortField: filters.sortField,
        sortOrder: filters.sortOrder,
        ...(filters.date && { date: filters.date }),
      });
      
      const [response , analyticsResponse] = await Promise.all(
        [fetch(`/api/invoice/all?${queryParams}`),
        fetch(`/api/analytics?${queryParams}`)
      ])

      if(!response.ok || !analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [invoiceData, analyticsData] = await Promise.all([
        response.json(),
        analyticsResponse.json()
      ])

      // if (!response.ok) {
      //   throw new Error('Failed to fetch analytics data');
      // }

      // const data = await response.json();
      
      set({
        allInvoices: {
          invoices: invoiceData.invoices || [],
          total: invoiceData.total || 0
        },
        analytics: analyticsData.analytics || {
          totalGenerated: 0,
          totalChecked: 0,
          totalPacked: 0,
          totalPickedUp: 0,
          totalDelivered: 0,
          totalOTC: 0
        },
        totalPages: Math.ceil((invoiceData.total || 0) / pagination.limit),
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false 
      });
    }
  },

}));

export default useAnalyticsStore;