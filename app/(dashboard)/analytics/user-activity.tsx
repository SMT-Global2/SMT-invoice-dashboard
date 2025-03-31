"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { fetchAnalyticsData } from "./api";

interface UserActivityProps {
  title?: string;
  description?: string;
}

interface UserActivityData {
  name: string;
  created: number;
  checked: number;
  packed: number;
  delivered: number;
  billed: number;
  total: number;
}

export function UserActivity({
  title = "User Activity",
  description = "User contribution by invoice status"
}: UserActivityProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const [data, setData] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof UserActivityData>("total");

  const colors = {
    created: "#8884d8", 
    checked: "#82ca9d", 
    packed: "#ffc658", 
    delivered: "#ff8042", 
    billed: "#0088fe"
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const analyticsData = await fetchAnalyticsData(date);
        
        // Format the user activity data
        setData(analyticsData.userActivity || []);
      } catch (error) {
        console.error('Error fetching user activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date]);

  // Sort data based on selected criterion
  const sortedData = [...data].sort((a, b) => {
    // Ensure we're comparing numbers
    const aValue = typeof a[sortBy] === 'number' ? a[sortBy] as number : 0;
    const bValue = typeof b[sortBy] === 'number' ? b[sortBy] as number : 0;
    return bValue - aValue;
  }).slice(0, 10);

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
  
    return null;
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <DatePickerWithRange date={date} setDate={setDate} />
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {Object.keys(colors).map((key) => (
            <Badge 
              key={key}
              variant={sortBy === key ? "default" : "outline"} 
              className="cursor-pointer"
              style={{ backgroundColor: sortBy === key ? colors[key as keyof typeof colors] : 'transparent' }}
              onClick={() => setSortBy(key as keyof UserActivityData)}
            >
              {key}
            </Badge>
          ))}
          <Badge 
            variant={sortBy === "total" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setSortBy("total")}
          >
            total
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No user activity data available for the selected period
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="created" name="Created" stackId="a" fill={colors.created} />
                <Bar dataKey="checked" name="Checked" stackId="a" fill={colors.checked} />
                <Bar dataKey="packed" name="Packed" stackId="a" fill={colors.packed} />
                <Bar dataKey="delivered" name="Delivered" stackId="a" fill={colors.delivered} />
                <Bar dataKey="billed" name="Billed" stackId="a" fill={colors.billed} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 