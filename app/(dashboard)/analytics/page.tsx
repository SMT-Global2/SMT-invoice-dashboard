"use client"

import { useEffect } from "react";
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

export default function AnalyticsPage() {
  const { fetchAnalytics, fetchExtendedAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchAnalytics();
    fetchExtendedAnalytics();
  }, [fetchAnalytics, fetchExtendedAnalytics]);

  return (
    <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      </div>

      <Tabs defaultValue="dashboards" className="w-full">
        
        <TabsList className="flex mb-6 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="dashboards" className="whitespace-nowrap px-2 sm:px-4">Invoice Analytics</TabsTrigger>
          <TabsTrigger value="users" className="whitespace-nowrap px-2 sm:px-4">User Performance</TabsTrigger>
          <TabsTrigger value="table" className="whitespace-nowrap px-2 sm:px-4">Invoices Table</TabsTrigger>
          <TabsTrigger value="receipt" className="whitespace-nowrap px-2 sm:px-4">Receipt</TabsTrigger>
          <TabsTrigger value="inventory" className="whitespace-nowrap px-2 sm:px-4">Inventory</TabsTrigger>
          <TabsTrigger value="deliverymemo" className="whitespace-nowrap px-2 sm:px-4">Delivery Memo</TabsTrigger>
          <TabsTrigger value="expiry" className="whitespace-nowrap px-2 sm:px-4">Expiry</TabsTrigger>
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
