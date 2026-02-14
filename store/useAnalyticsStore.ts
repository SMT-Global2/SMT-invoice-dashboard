import { create } from 'zustand'
import { Invoice, CheckStatus, PackageStatus, DeliveryStatus, BilledStatus, PartyCode, User } from '@prisma/client'
import { DateRange } from 'react-day-picker'
import moment from 'moment'
import { format } from 'date-fns'

export interface IInvoice extends Invoice {
  party : PartyCode;
  partyName?: string;
  cityName?: string;
  regionalCode?: string;
  invoicedBy ?: User;
  checkedBy ?: User;
  packedBy ?: User;
  pickedBy ?: User;
  deliveredBy ?: User;
  billedBy ?: User;
  transportationName?: string;
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
    totalTransportDeliveries: number;
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
    department: string[];
    performance: {
      invoices: number;
      checking: number;
      packing: number;
      delivery: number;
      billing: number;
      receipts: number;
      invChecks: number;
      invVouchers: number;
      dmCollects: number;
      dmChecks: number;
      expUploads: number;
      expCreditNotes: number;
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
  totalTransportDeliveries: number;
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
  transporterFilter: string;
}

interface ExtendedAnalyticsResponse {
  success: boolean;
  data: {
    inventory?: InventoryAnalytics;
    deliveryMemo?: DeliveryMemoAnalytics;
    expiry?: ExpiryAnalytics;
    statement?: StatementAnalytics;
    billing?: BillingAnalytics;
    receipt?: ReceiptAnalytics;
  };
}

interface InventoryAnalytics {
  totalCount: number;
  withVoucherCount: number;
  withoutVoucherCount: number;
  percentWithVoucher: string;
  byAgency: Array<{ agencyCode: string, agencyName: string, _count: number }>;
  byUserCheck: Array<{ username: string, count: number }>;
  byUserVoucher: Array<{ username: string, count: number }>;
  perDay: Array<{ date: Date, count: number }>;
}

interface DeliveryMemoAnalytics {
  totalCount: number;
  collectedCount: number;
  checkedCount: number;
  percentCollected: string;
  percentChecked: string;
  perDay: Array<{ date: Date, count: number }>;
  byRegionalCode: Array<{ regionalCode: string, count: number }>;
  byUserCollected: Array<{ username: string, count: number }>;
  byUserChecked: Array<{ username: string, count: number }>;
}

interface ExpiryAnalytics {
  totalCount: number;
  withCreditNoteCount: number;
  withoutCreditNoteCount: number;
  percentWithCreditNote: string;
  perDay: Array<{ date: Date, count: number }>;
  byRegionalCode: Array<{ regionalCode: string, count: number }>;
  byUser: Array<{ username: string, count: number }>;
  byCreditNoteUser: Array<{ username: string, count: number }>;
}

interface StatementAnalytics {
  totalCount: number;
  perDay: Array<{ date: Date, count: number }>;
  byUploadUser: Array<{ username: string, count: number }>;
  reportSections: {
    totalCount: number;
    savedCount: number;
    unsavedCount: number;
    percentSaved: string;
    byPartyCode: Array<{ partyCode: string, count: number }>;
    bySavedUser: Array<{ username: string, count: number }>;
  };
}

interface BillingAnalytics {
  totalCount: number;
  cashCount: number;
  creditCount: number;
  percentCash: string;
  percentCredit: string;
  perDay: Array<{ date: Date, count: number }>;
  byUser: Array<{ username: string, count: number }>;
}

interface ReceiptAnalytics {
  totalCount: number;
  cashCount: number;
  chequeCount: number;
  percentCash: string;
  percentCheque: string;
  perDay: Array<{ date: Date, count: number }>;
  byUser: Array<{ username: string, count: number }>;
  totalAmount: number;
  amountByUser: Array<{ username: string, amount: number }>;
}

export interface AnalyticsState {
  isLoading: boolean;
  error: string | null;
  
  allInvoices: {
    invoices: IInvoice[];
    total: number;
  }
  analytics: Analytics;
  
  // Add filtered analytics state
  filteredAnalytics: Analytics;
  
  pagination: PaginationState;
  filters: FilterState;
  totalPages: number;
  availableRegionalCodes: string[];
  transporters: { id: string, companyName: string }[];
  
  // Dashboard analytics (shared between StatsCards and StatusBreakdown)
  dashboardAnalytics: AnalyticsResponse | null;
  dashboardAnalyticsLoading: boolean;

  // Actions
  fetchAnalytics: () => Promise<void>;
  fetchDashboardAnalytics: (dateRange?: DateRange) => Promise<void>;
  fetchAvailableRegionalCodes: () => Promise<void>;
  fetchTransporters: () => Promise<void>;
  fetchInvoicesForPDF: (date: string, regionalCodes?: string[]) => Promise<IInvoice[]>;

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

  // Extended analytics
  extendedAnalytics: {
    inventory: InventoryAnalytics | null;
    deliveryMemo: DeliveryMemoAnalytics | null;
    expiry: ExpiryAnalytics | null;
    statement: StatementAnalytics | null;
    billing: BillingAnalytics | null;
    receipt: ReceiptAnalytics | null;
    isLoading: boolean;
    error: string | null;
  };
  
  // Add new fetch function
  fetchExtendedAnalytics: (type: string, dateRange: DateRange | undefined) => Promise<void>;
}

const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  isLoading: false,
  error: null,
  dashboardAnalytics: null,
  dashboardAnalyticsLoading: false,

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
    totalTransportDeliveries: 0,
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

  // Initialize filtered analytics
  filteredAnalytics: {
    totalGenerated: 0,
    totalChecked: 0,
    totalPacked: 0,
    totalPickedUp: 0,
    totalDelivered: 0,
    totalTransportDeliveries: 0,
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
    limit: 25
  },
  filters: {
    searchQuery: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    sortField: 'invoiceTimestamp',
    sortOrder: 'desc',
    progressStage: 'all',
    dateRange: undefined,
    selectedRegionalCodes: [],
    transporterFilter: 'all'
  },
  totalPages: 0,
  availableRegionalCodes: [],
  transporters: [],

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
      date: format(new Date(), 'yyyy-MM-dd'),
      selectedRegionalCodes: [],
      progressStage: 'all',
      transporterFilter: 'all',
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

  fetchTransporters: async () => {
    try {
      const response = await fetch('/api/transportation');
      if (!response.ok) throw new Error('Failed to fetch transporters');
      
      const result = await response.json();
      set({ transporters: result.data || [] });
    } catch (error) {
      console.error('Error fetching transporters:', error);
      set({ transporters: [] });
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
    
    const data: UserPerformanceResponse = await res.json();
    return data;
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
      const { dateRange, selectedRegionalCodes, transporterFilter } = get().filters;
      
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
      
      // Add transporter filter if specified
      if (transporterFilter !== 'all') {
        params.append('transporterFilter', transporterFilter);
      }
      
      // Use the store's API functions to fetch data
      const [
        analyticsData,
        invoiceData
      ] = await Promise.all([
        get().fetchAnalyticsData(dateRange),
        fetch(`/api/invoice/all?${params.toString()}`).then(res => res.json())
      ]);
      
      // Process invoices based on progress stage filter if needed
      let filteredInvoices = invoiceData.invoices || [];
      const progressStage = get().filters.progressStage;
      
      // Helper function to calculate invoice completeness
      const calculateInvoiceCompleteness = (invoice: any) => {
        let stages = 0;
        let completed = 0;
        
        stages++;
        if (invoice.invoiceTimestamp) completed++;
        
        stages++;
        if (invoice.checkStatus === 'CHECKED') completed++;
        
        stages++;
        if (invoice.packageStatus === 'PACKED') completed++;
        
        stages += 2;
        if (invoice.deliveryStatus === 'PICKED_UP') completed++;
        if (invoice.deliveryStatus === 'DELIVERED') completed += 2;
        
        stages++;
        if (invoice.billedStatus === 'BILLED') completed++;
        
        return Math.round((completed / stages) * 100);
      };
      
      if (progressStage === 'incomplete' || progressStage === 'complete') {
        filteredInvoices = filteredInvoices.filter((invoice: any) => {
          const isComplete = calculateInvoiceCompleteness(invoice) === 100;
          return progressStage === 'complete' ? isComplete : !isComplete;
        });
      }
      
      // Set processingEfficiency and billingRate for filtered analytics
      const filteredAnalytics = invoiceData.filteredAnalytics || {
        totalGenerated: 0,
        totalChecked: 0,
        totalPacked: 0,
        totalPickedUp: 0,
        totalDelivered: 0,
        totalTransportDeliveries: 0,
        totalOTC: 0,
        totalBilled: 0,
      };
      
      // Calculate efficiency metrics for filtered data
      if (filteredAnalytics) {
        filteredAnalytics.processingEfficiency = filteredAnalytics.totalChecked > 0 
          ? Math.round((filteredAnalytics.totalPacked / filteredAnalytics.totalChecked) * 100) 
          : 0;
          
        filteredAnalytics.billingRate = filteredAnalytics.totalDelivered > 0 
          ? Math.round((filteredAnalytics.totalBilled / filteredAnalytics.totalDelivered) * 100) 
          : 0;
      }
      
      set({
        allInvoices: {
          invoices: filteredInvoices,
          total: progressStage === 'incomplete' || progressStage === 'complete' 
            ? filteredInvoices.length 
            : invoiceData.total || 0
        },
        analytics: analyticsData.analytics || {
          totalGenerated: 0,
          totalChecked: 0,
          totalPacked: 0,
          totalPickedUp: 0,
          totalDelivered: 0,
          totalTransportDeliveries: 0,
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
        filteredAnalytics: filteredAnalytics as Analytics,
        totalPages: Math.ceil((progressStage === 'incomplete' || progressStage === 'complete' 
          ? filteredInvoices.length 
          : invoiceData.total || 0) / get().pagination.limit),
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false 
      });
    }
  },

  fetchDashboardAnalytics: async (dateRange) => {
    try {
      set({ dashboardAnalyticsLoading: true });
      const data = await get().fetchAnalyticsData(dateRange);
      set({ dashboardAnalytics: data, dashboardAnalyticsLoading: false });
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      set({ dashboardAnalyticsLoading: false });
    }
  },

  // Initialize extended analytics
  extendedAnalytics: {
    inventory: null,
    deliveryMemo: null,
    expiry: null,
    statement: null,
    billing: null,
    receipt: null,
    isLoading: false,
    error: null
  },
  
  fetchExtendedAnalytics: async (type, dateRange) => {
    if (!type) return;
    
    try {
      set(state => ({
        extendedAnalytics: {
          ...state.extendedAnalytics,
          isLoading: true,
          error: null
        }
      }));
      
      // Build the URL
      const url = new URL('/api/analytics/extended', window.location.origin);
      url.searchParams.set('type', type);
      
      if (dateRange?.from) {
        url.searchParams.set('from', typeof dateRange.from === 'string' 
          ? dateRange.from 
          : moment(dateRange.from).format('YYYY-MM-DD'));
      }
      
      if (dateRange?.to) {
        url.searchParams.set('to', typeof dateRange.to === 'string' 
          ? dateRange.to 
          : moment(dateRange.to).format('YYYY-MM-DD'));
      }
      
      const response = await fetch(url.toString());
      const data: ExtendedAnalyticsResponse = await response.json();
      
      if (!data.success) {
        throw new Error((data as any).message || 'Failed to fetch extended analytics');
      }
      
      set(state => ({
        extendedAnalytics: {
          ...state.extendedAnalytics,
          [type]: data.data[type as keyof ExtendedAnalyticsResponse['data']] || state.extendedAnalytics[type as keyof AnalyticsState['extendedAnalytics']],
          isLoading: false,
          error: null
        }
      }));
    } catch (error) {
      console.error(`Error fetching extended analytics for type ${type}:`, error);
      set(state => ({
        extendedAnalytics: {
          ...state.extendedAnalytics,
          isLoading: false,
          error: error instanceof Error ? error.message : `An error occurred while fetching ${type} data`
        }
      }));
    }
  },

  fetchInvoicesForPDF: async (date, regionalCodes) => {
    try {
      const params = new URLSearchParams();
      params.append('date', date); // Assumes date is already YYYY-MM-DD
      if (regionalCodes && regionalCodes.length > 0) {
        params.append('regionalCodes', JSON.stringify(regionalCodes));
      }

      const response = await fetch(`/api/analytics/invoices-for-pdf?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices for PDF');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoices for PDF');
      }
      return data.invoices || [];
    } catch (error) {
      console.error("Error in fetchInvoicesForPDF:", error);
      // Optionally show a toast or set an error state here
      return []; // Return empty array on error
    }
  },

}));

export default useAnalyticsStore;