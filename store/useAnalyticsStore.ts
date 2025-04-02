import { create } from 'zustand'
import { Invoice, CheckStatus, PackageStatus, DeliveryStatus, BilledStatus, PartyCode, User } from '@prisma/client'
import { DateRange } from 'react-day-picker'

export interface IInvoice extends Invoice {
  party : PartyCode;
  invoicedBy ?: User;
  checkedBy ?: User;
  packedBy ?: User;
  pickedBy ?: User;
  deliveredBy ?: User;
  billedBy ?: User;
}

// Analytics API response types
interface AnalyticsResponse {
  analytics: {
    totalGenerated: number;
    totalChecked: number;
    totalPacked: number;
    totalPickedUp: number;
    totalDelivered: number;
    totalOTC: number;
    totalBilled: number;
    processingEfficiency: number;
    billingRate: number;
    paymentDistribution: {
      cash: number;
      credit: number;
      cashRatio: number;
      creditRatio: number;
    };
  };
  // Additional stats data used in StatsCards
  totalInvoices: number;
  activeUsers: number;
  processedItems: number;
  totalOrders: number;
  invoiceChangePercentage: number;
  userChangePercentage: number;
  itemsChangePercentage: number;
  ordersChangePercentage: number;
  // Status breakdown data
  statusBreakdown: {
    created: number;
    checked: number;
    packed: number;
    delivered: number;
    billed: number;
  };
}

interface PartiesResponse {
  topAgencies: {
    id: string;
    code: string;
    name: string;
    count: number;
    ranking: number;
    percentage: number;
  }[];
  topClients: {
    id: string;
    code: string;
    name: string;
    count: number;
    ranking: number;
    percentage: number;
  }[];
}

interface ActivityResponse {
  heatmapData: {
    day: number;
    hour: number;
    value: number;
    date: string;
  }[];
  activityType: string;
}

interface InventoryResponse {
  metrics: {
    total: number;
    checked: number;
    vouchered: number;
    incomplete: number;
    efficiency: number;
  };
  agencies: {
    name: string;
    count: number;
    percentage: number;
  }[];
}

interface UserPerformanceResponse {
  users: {
    username: string;
    fullName: string;
    department: string;
    performance: {
      invoices: number;
      checking: number;
      packing: number;
      delivery: number;
      billing: number;
      overall: number;
    };
  }[];
}

interface TrendResponse {
  trendData: {
    date: string;
    invoiceCount: number;
    invoices: number;
    items: number;
    orders: number;
  }[];
}

interface UserActivityResponse {
  userActivities: {
    username: string;
    name: string;
    invoiceCount: number;
    created: number;
    checked: number;
    packed: number;
    delivered: number;
    billed: number;
    total: number;
  }[];
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
  totalBilled: number;
  processingEfficiency: number;
  billingRate: number;
  paymentDistribution: {
    cash: number;
    credit: number;
    cashRatio: number;
    creditRatio: number;
  };
}


type SortOrder = 'asc' | 'desc';
type SortField = 'invoiceNumber' | 'invoiceTimestamp';
type ProgressStage = 'all' | 'generated' | 'checked' | 'packed' | 'picked_up' | 'delivered' | 'billed' | 'incomplete' | 'complete';

interface FilterState {
  searchQuery: string;
  date: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
  progressStage: ProgressStage;
  dateRange?: DateRange;
  selectedRegionalCodes: string[];
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
  availableRegionalCodes: string[];
  
  // Actions
  fetchAnalytics: () => Promise<void>;
  fetchAvailableRegionalCodes: () => Promise<void>;
  
  // Analytics API functions
  fetchAnalyticsData: (dateRange?: DateRange) => Promise<AnalyticsResponse>;
  fetchPartiesData: (dateRange?: DateRange) => Promise<PartiesResponse>;
  fetchActivityData: (activityType?: string, dateRange?: DateRange) => Promise<ActivityResponse>;
  fetchInventoryData: (dateRange?: DateRange) => Promise<InventoryResponse>;
  fetchUserPerformanceData: (dateRange?: DateRange) => Promise<UserPerformanceResponse>;
  fetchTrendData: (dateRange?: DateRange) => Promise<TrendResponse>;
  fetchUserActivityData: (dateRange?: DateRange) => Promise<UserActivityResponse>;

  // Additional actions
  setPagination: (pagination: PaginationState) => void;
  setFilters: (filters: FilterState) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
  setSelectedRegionalCodes: (codes: string[]) => void;
  clearAllFilters: () => void;
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
    totalOTC: 0,
    totalBilled: 0,
    processingEfficiency: 0,
    billingRate: 0,
    paymentDistribution: {
      cash: 0,
      credit: 0,
      cashRatio: 0,
      creditRatio: 0
    }
  },

  pagination: {
    page: 0,
    limit: 10
  },
  filters: {
    searchQuery: '',
    date: new Date().toISOString(),
    sortField: 'invoiceTimestamp',
    sortOrder: 'desc',
    progressStage: 'all',
    dateRange: undefined,
    selectedRegionalCodes: []
  },
  totalPages: 0,
  availableRegionalCodes: [],

  setPagination: (pagination) => set({ pagination }),
  setFilters: (filters) => set({ filters }),
  setDateRange: (dateRange) => set(state => ({ 
    filters: { ...state.filters, dateRange } 
  })),
  setSelectedRegionalCodes: (codes) => set(state => ({ 
    filters: { ...state.filters, selectedRegionalCodes: codes } 
  })),
  
  clearAllFilters: () => set(state => ({
    filters: {
      ...state.filters,
      searchQuery: '',
      date: new Date().toISOString(),
      selectedRegionalCodes: [],
      progressStage: 'all',
      sortField: 'invoiceTimestamp',
      sortOrder: 'desc'
    },
    pagination: {
      ...state.pagination,
      page: 0
    }
  })),
  
  fetchAvailableRegionalCodes: async () => {
    try {
      const res = await fetch('/api/party-codes/regional-codes');
      
      if (!res.ok) {
        throw new Error('Failed to fetch regional codes');
      }
      
      const data = await res.json();
      set({ availableRegionalCodes: data.regionalCodes || [] });
    } catch (error) {
      console.error('Error fetching regional codes:', error);
    }
  },

  // API functions implemented directly in the store
  fetchAnalyticsData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    
    return res.json();
  },

  fetchPartiesData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/top-parties?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch parties data');
    }
    
    return res.json();
  },

  fetchActivityData: async (activityType = 'all', dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/heatmap?type=${activityType}&from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch activity data');
    }
    
    return res.json();
  },

  fetchInventoryData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/inventory?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch inventory data');
    }
    
    return res.json();
  },

  fetchUserPerformanceData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/user-performance?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch user performance data');
    }
    
    return res.json();
  },

  fetchTrendData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/trends?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch trend data');
    }
    
    return res.json();
  },

  fetchUserActivityData: async (dateRange) => {
    const fromDate = dateRange?.from ? dateRange.from.toISOString() : '';
    const toDate = dateRange?.to ? dateRange.to.toISOString() : '';
    
    const res = await fetch(`/api/analytics/user-activity?from=${fromDate}&to=${toDate}`);
    
    if (!res.ok) {
      throw new Error('Failed to fetch user activity data');
    }
    
    return res.json();
  },

  fetchAnalytics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange, selectedRegionalCodes } = get().filters;
      
      // Create query parameters
      const params = new URLSearchParams();
      params.append('page', get().pagination.page.toString());
      params.append('limit', get().pagination.limit.toString());
      params.append('search', get().filters.searchQuery);
      params.append('sortField', get().filters.sortField);
      params.append('sortOrder', get().filters.sortOrder);
      params.append('progressStage', get().filters.progressStage);
      const date = get().filters.date;
      if (date) {
        params.append('date', date);
      }
      
      // Add regional codes if selected
      if (selectedRegionalCodes.length > 0) {
        params.append('regionalCodes', JSON.stringify(selectedRegionalCodes));
      }
      
      // Use the store's API functions to fetch data
      const [
        analyticsData,
        invoiceData
      ] = await Promise.all([
        get().fetchAnalyticsData(dateRange),
        fetch(`/api/invoice/all?${params.toString()}`).then(res => res.json())
      ]);
      
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
          totalOTC: 0,
          totalBilled: 0,
          processingEfficiency: 0,
          billingRate: 0,
          paymentDistribution: {
            cash: 0,
            credit: 0,
            cashRatio: 0,
            creditRatio: 0
          }
        },
        totalPages: Math.ceil((invoiceData.total || 0) / get().pagination.limit),
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