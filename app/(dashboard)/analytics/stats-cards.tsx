"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, BarChart3, Users } from "lucide-react";
import React from "react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import useAnalyticsStore, { AnalyticsState } from "@/store/useAnalyticsStore";

interface StatsCardData {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeType: "increase" | "decrease";
  changeText: string;
}

export function StatsCards() {
  const dashboardAnalytics = useAnalyticsStore((state: AnalyticsState) => state.dashboardAnalytics);
  const dashboardAnalyticsLoading = useAnalyticsStore((state: AnalyticsState) => state.dashboardAnalyticsLoading);
  const fetchDashboardAnalytics = useAnalyticsStore((state: AnalyticsState) => state.fetchDashboardAnalytics);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Re-fetch when date picker changes (after initial mount)
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchDashboardAnalytics(date);
  }, [date, fetchDashboardAnalytics]);

  const data: StatsCardData[] = dashboardAnalytics ? [
    {
      title: "Total Invoices",
      value: dashboardAnalytics.totalInvoices.toString(),
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      change: dashboardAnalytics.invoiceChangePercentage,
      changeType: dashboardAnalytics.invoiceChangePercentage >= 0 ? "increase" : "decrease",
      changeText: `${Math.abs(dashboardAnalytics.invoiceChangePercentage).toFixed(1)}% from previous period`
    },
    {
      title: "Active Users",
      value: dashboardAnalytics.activeUsers.toString(),
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      change: dashboardAnalytics.userChangePercentage,
      changeType: dashboardAnalytics.userChangePercentage >= 0 ? "increase" : "decrease",
      changeText: `${Math.abs(dashboardAnalytics.userChangePercentage).toFixed(1)}% from previous period`
    },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <DatePickerWithRange date={date} setDate={setDate} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardAnalyticsLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium bg-gray-200 dark:bg-gray-700 h-4 w-24 rounded"></CardTitle>
                <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gray-200 dark:bg-gray-700 h-6 w-16 rounded"></div>
                <p className="text-xs text-muted-foreground mt-2 bg-gray-200 dark:bg-gray-700 h-3 w-32 rounded"></p>
              </CardContent>
            </Card>
          ))
        ) : (
          data.map((item, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                {item.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {item.changeType === "increase" ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-500" />
                  )}
                  {item.changeText}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
