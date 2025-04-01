"use client"

import { useEffect } from "react";
import useAnalyticsStore from "@/store/useAnalyticsStore";
import { StatsCards } from "./stats-cards";
import { TrendChart } from "./trend-chart";
import { StatusBreakdown } from "./status-breakdown";
import { UserActivity } from "./user-activity";
import { TopParties } from "./top-parties";
import { ActivityHeatmap } from "./activity-heatmap";
import { InventoryMetrics } from "./inventory-metrics";
import { UserPerformance } from "./user-performance";
import AdminInvoiceTable from "./admin-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalyticsPage() {
  const { fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      </div>

      <Tabs defaultValue="dashboards" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="dashboards">Invoice Analytics</TabsTrigger>
          <TabsTrigger value="users">User Performance</TabsTrigger>
          <TabsTrigger value="table">Invoices Table</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboards" className="space-y-6">
          <StatsCards />

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <TrendChart />
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <StatusBreakdown />
            <UserActivity />
            <TopParties />
          </div>
          
          <ActivityHeatmap />

          <div className="grid grid-cols-1 gap-6">
            <InventoryMetrics />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserPerformance />
        </TabsContent>
        
        <TabsContent value="table">
          <AdminInvoiceTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
