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

interface AnalyticsState {
  isLoading: boolean;
  error: string | null;
  
  invoiceAnalytics: InvoiceAnalytics;
  checkAnalytics: CheckAnalytics;
  packAnalytics: PackAnalytics;
  deliveryAnalytics: DeliveryAnalytics;

  // Actions
  fetchAnalytics: () => Promise<void>;
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

  fetchAnalytics: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/invoice/all');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      
      set({
        invoiceAnalytics: {
          allInvoices: data.invoices || [],
          total: data.invoiceTotal || null
        },
        // checkAnalytics: {
        //   checkedInvoices: data.checkedInvoices || [],
        //   pendingInvoices: data.pendingCheckInvoices || [],
        //   total: data.checkTotal || null
        // },
        // packAnalytics: {
        //   packedInvoices: data.packedInvoices || [],
        //   pendingInvoices: data.pendingPackInvoices || [],
        //   total: data.packTotal || null
        // },
        // deliveryAnalytics: {
        //   deliveredInvoices: data.deliveredInvoices || [],
        //   pickedUpInvoices: data.pickedUpInvoices || [],
        //   pendingInvoices: data.pendingDeliveryInvoices || [],
        //   total: data.deliveryTotal || null
        // },
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