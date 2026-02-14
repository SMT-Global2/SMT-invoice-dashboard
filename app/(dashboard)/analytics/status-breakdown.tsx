"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useAnalyticsStore from "@/store/useAnalyticsStore";

interface StatusBreakdownProps {
  title?: string;
  description?: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function StatusBreakdown({
  title = "Invoice Status Breakdown",
  description = "Distribution of invoices by current status"
}: StatusBreakdownProps) {
  const dashboardAnalytics = useAnalyticsStore(state => state.dashboardAnalytics);
  const dashboardAnalyticsLoading = useAnalyticsStore(state => state.dashboardAnalyticsLoading);
  const fetchDashboardAnalytics = useAnalyticsStore(state => state.fetchDashboardAnalytics);

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

  // Derive status data from store
  const statusData: StatusData[] = dashboardAnalytics?.statusBreakdown ? [
    { name: "Created", value: dashboardAnalytics.statusBreakdown.created || 0, color: "#8884d8" },
    { name: "Checked", value: dashboardAnalytics.statusBreakdown.checked || 0, color: "#82ca9d" },
    { name: "Packed", value: dashboardAnalytics.statusBreakdown.packed || 0, color: "#ffc658" },
    { name: "Delivered", value: dashboardAnalytics.statusBreakdown.delivered || 0, color: "#ff8042" },
    { name: "Billed", value: dashboardAnalytics.statusBreakdown.billed || 0, color: "#0088fe" }
  ].filter(item => item.value > 0) : [];

  const totalValue = statusData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-xs">
          <p className="font-medium" style={{ color: data.color }}>{data.name}</p>
          <p>{`Count: ${data.value}`}</p>
          <p>{`Percentage: ${((data.value / totalValue) * 100).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <DatePickerWithRange date={date} setDate={setDate} />
      </CardHeader>
      <CardContent>
        {dashboardAnalyticsLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : statusData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No status data available for the selected period
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
