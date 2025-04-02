"use client";

import React, { useEffect, useState } from "react";
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
  const { fetchAnalyticsData } = useAnalyticsStore();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const analyticsData = await fetchAnalyticsData(date);
        
        // Format the status data
        const statusData: StatusData[] = [
          {
            name: "Created",
            value: analyticsData.statusBreakdown?.created || 0,
            color: "#8884d8"
          },
          {
            name: "Checked",
            value: analyticsData.statusBreakdown?.checked || 0,
            color: "#82ca9d"
          },
          {
            name: "Packed",
            value: analyticsData.statusBreakdown?.packed || 0,
            color: "#ffc658"
          },
          {
            name: "Delivered",
            value: analyticsData.statusBreakdown?.delivered || 0,
            color: "#ff8042"
          },
          {
            name: "Billed",
            value: analyticsData.statusBreakdown?.billed || 0,
            color: "#0088fe"
          }
        ];
        
        // Filter out zero values for better visualization
        setData(statusData.filter(item => item.value > 0));
      } catch (error) {
        console.error('Error fetching status breakdown data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date, fetchAnalyticsData]);

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-xs">
          <p className="font-medium" style={{ color: data.color }}>{data.name}</p>
          <p>{`Count: ${data.value}`}</p>
          <p>{`Percentage: ${((data.value / data.reduce((sum: number, item: StatusData) => sum + item.value, 0)) * 100).toFixed(1)}%`}</p>
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
    index,
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
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No status data available for the selected period
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
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