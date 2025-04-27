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

export default function AnalyticsPage() {
  const { fetchAnalytics, fetchExtendedAnalytics, isLoading, extendedAnalytics } = useAnalyticsStore();
  const [activeTab, setActiveTab] = useState("dashboards");
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Simplify loading state - either loading or not, no progress percentage
  const isPageLoading = isLoading || extendedAnalytics.isLoading;
  
  useEffect(() => {
    // Reset progress when loading starts
    if (isPageLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 300);
      
      return () => clearInterval(interval);
    } else {
      // Set to 100 when loading completes
      setLoadingProgress(100);
      // Reset after animation completes
      const timeout = setTimeout(() => setLoadingProgress(0), 500);
      return () => clearTimeout(timeout);
    }
  }, [isPageLoading]);

  useEffect(() => {
    fetchAnalytics();
    fetchExtendedAnalytics();
  }, [fetchAnalytics, fetchExtendedAnalytics]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4 relative">
      {/* Loading Indicator with Percentage */}
      {isPageLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-background/70">
          <div className="bg-background shadow-md rounded-lg p-8 flex flex-col items-center justify-center">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                style={{ 
                  transformOrigin: 'center',
                  animationDuration: '1s'
                }}
              ></div>
              <span className="text-lg font-semibold text-primary">{loadingProgress}%</span>
            </div>
            <span className="mt-4 font-medium text-primary-foreground">Loading Analytics...</span>
          </div>
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
