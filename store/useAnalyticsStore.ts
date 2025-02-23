import { create } from 'zustand'
import { Invoice, CheckStatus, PackageStatus, DeliveryStatus, PartyCode, User } from '@prisma/client'

interface AnalyticsBase {
  total: number | null;
}

export interface IInvoice extends Invoice {
  party : PartyCode;
  invoicedBy ?: User;
  checkedBy ?: User;
  packedBy ?: User;
  pickedBy ?: User;
  deliveredBy ?: User;
}

interface InvoiceAnalytics extends AnalyticsBase {
  allInvoices: IInvoice[];
}

interface CheckAnalytics extends AnalyticsBase {
  checkedInvoices: Invoice[];
  pendingInvoices: Invoice[];
}

interface PackAnalytics extends AnalyticsBase {
  packedInvoices: Invoice[];
  pendingInvoices: Invoice[];
}

interface DeliveryAnalytics extends AnalyticsBase {
  deliveredInvoices: Invoice[];
  pickedUpInvoices: Invoice[];
  pendingInvoices: Invoice[];
}

interface PaginationState {
  page: number;
  limit: number;
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
  
  invoiceAnalytics: InvoiceAnalytics;
  checkAnalytics: CheckAnalytics;
  packAnalytics: PackAnalytics;
  deliveryAnalytics: DeliveryAnalytics;

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

  invoiceAnalytics: {
    allInvoices: [],
    total: null
  },
  checkAnalytics: {
    checkedInvoices: [],
    pendingInvoices: [],
    total: null
  },
  packAnalytics: {
    packedInvoices: [],
    pendingInvoices: [],
    total: null
  },
  deliveryAnalytics: {
    deliveredInvoices: [],
    pickedUpInvoices: [],
    pendingInvoices: [],
    total: null
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
      
      const response = await fetch(`/api/invoice/all?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      
      set({
        invoiceAnalytics: {
          allInvoices: data.invoices || [],
          total: data.total || null
        },
        totalPages: Math.ceil((data.total || 0) / pagination.limit),
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false 
      });
    }
  }
}));

export default useAnalyticsStore;