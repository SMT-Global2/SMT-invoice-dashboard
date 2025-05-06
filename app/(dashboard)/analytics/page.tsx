"use client"

import { useEffect, useState } from "react";
import useAnalyticsStore from "@/store/useAnalyticsStore";
import { StatsCards } from "./stats-cards";
import { TrendChart } from "./trend-chart";
import { StatusBreakdown } from "./status-breakdown";
import { UserActivity } from "./user-activity";
import { TopParties } from "./top-parties";
import { ActivityHeatmap } from "./activity-heatmap";
import { UserPerformance } from "./user-performance";
import AdminInvoiceTable from "./admin-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryAnalytics } from "./inventory-analytics";
import { DeliveryMemoAnalytics } from "./delivery-memo-analytics";
import { ExpiryAnalytics } from "./expiry-analytics";
import { ReceiptAnalytics } from "./receipt-analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays } from 'date-fns';

// Define map for tab values to extended analytic types
const tabToAnalyticType: { [key: string]: string } = {
  inventory: 'inventory',
  deliverymemo: 'deliveryMemo',
  expiry: 'expiry',
  // statement: 'statement', // Assuming no statement tab currently
  // billing: 'billing', // Assuming no billing tab currently
  receipt: 'receipt',
  // Add other mappings if necessary
};

export default function AnalyticsPage() {
  const { 
    fetchAnalytics, 
    fetchExtendedAnalytics, 
    isLoading, 
    extendedAnalytics, 
    filters 
  } = useAnalyticsStore();
  
  const [activeTab, setActiveTab] = useState("dashboards");
  // Use a simpler loading state based on the specific data being loaded
  const isInitialLoading = isLoading; // Loading for fetchAnalytics (main dashboard)
  const isTabLoading = extendedAnalytics.isLoading; // Loading for extended analytics (specific tabs)

  // Define the date range state locally if needed for fetching, or use store's dateRange
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    // Fetch initial analytics data (for the main dashboard tab)
    fetchAnalytics();
    
    // Fetch data for the initially active tab if it requires extended analytics
    const initialAnalyticType = tabToAnalyticType[activeTab];
    if (initialAnalyticType) {
      fetchExtendedAnalytics(initialAnalyticType, dateRange); 
    }
  }, [fetchAnalytics, fetchExtendedAnalytics]); // Only run once on mount

  const handleTabChange = (newTabValue: string) => {
    setActiveTab(newTabValue);
    const analyticType = tabToAnalyticType[newTabValue];
    
    // Check if data for this tab needs to be fetched
    // You might add logic here to check if data for this type & dateRange is already loaded
    if (analyticType) {
      // Use the dateRange from the component state or potentially from the global store filters
      fetchExtendedAnalytics(analyticType, dateRange); 
    }
  };

  // Determine if the current *active* tab is loading
  const currentTabIsLoading = 
    activeTab === 'dashboards' ? isInitialLoading : 
    (tabToAnalyticType[activeTab] ? isTabLoading : false);

  return (
    <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4 relative">
      {/* Simplified Loading Indicator - potentially shown only over the content area */}
      {currentTabIsLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      </div>
      
      {/* Error state */}
      {(extendedAnalytics.error || useAnalyticsStore.getState().error) && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            {extendedAnalytics.error || useAnalyticsStore.getState().error}
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile dropdown */}
      <div className="md:hidden w-full mb-6">
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dashboards">Invoice Analytics</SelectItem>
            <SelectItem value="users">User Performance</SelectItem>
            <SelectItem value="table">Invoices Table</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="deliverymemo">Delivery Memo</SelectItem>
            <SelectItem value="expiry">Expiry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full relative">
        {/* Desktop tabs - hidden on mobile */}
        <TabsList className="hidden md:flex mb-6 px-1 gap-2">
          <TabsTrigger value="dashboards" className="px-4 py-2">Invoice Analytics</TabsTrigger>
          <TabsTrigger value="users" className="px-4 py-2">User Performance</TabsTrigger>
          <TabsTrigger value="table" className="px-4 py-2">Invoices Table</TabsTrigger>
          <TabsTrigger value="receipt" className="px-4 py-2">Receipt</TabsTrigger>
          <TabsTrigger value="inventory" className="px-4 py-2">Inventory</TabsTrigger>
          <TabsTrigger value="deliverymemo" className="px-4 py-2">Delivery Memo</TabsTrigger>
          <TabsTrigger value="expiry" className="px-4 py-2">Expiry</TabsTrigger>
        </TabsList>

        {/* Keep content rendering simple, rely on loading state overlay */}
        <TabsContent value="dashboards" className="space-y-6">
          <StatsCards />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <TrendChart />
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <StatusBreakdown />
            <UserActivity />
          </div>
          <TopParties />
          <ActivityHeatmap />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserPerformance />
        </TabsContent>
        
        <TabsContent value="table">
          <AdminInvoiceTable />
        </TabsContent>

        <TabsContent value="receipt" className="space-y-6">
          <ReceiptAnalytics />
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-6">
          <InventoryAnalytics />
        </TabsContent>
        
        <TabsContent value="deliverymemo" className="space-y-6">
          <DeliveryMemoAnalytics />
        </TabsContent>
        
        <TabsContent value="expiry" className="space-y-6">
          <ExpiryAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}
