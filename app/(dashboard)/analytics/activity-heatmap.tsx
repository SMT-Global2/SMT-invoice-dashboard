"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useAnalyticsStore from "@/store/useAnalyticsStore";

interface ActivityHeatmapProps {
  title?: string;
  description?: string;
}

interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

export function ActivityHeatmap({
  title = "Activity Heatmap",
  description = "Hourly activity patterns across weekdays"
}: ActivityHeatmapProps) {
  const { fetchActivityData } = useAnalyticsStore();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState("all");

  // Day and hour labels
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => 
    i === 0 ? "12am" : i === 12 ? "12pm" : i > 12 ? `${i-12}pm` : `${i}am`
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const analyticsData = await fetchActivityData(activityType, date);
        setData(analyticsData.heatmapData || []);
      } catch (error) {
        console.error('Error fetching activity heatmap data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date, activityType, fetchActivityData]);

  // Function to determine cell color based on value
  const getCellColor = (value: number) => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (value < 5) return 'bg-emerald-100 dark:bg-emerald-900';
    if (value < 10) return 'bg-emerald-200 dark:bg-emerald-800';
    if (value < 20) return 'bg-emerald-300 dark:bg-emerald-700';
    if (value < 30) return 'bg-emerald-400 dark:bg-emerald-600';
    if (value < 50) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  // Find value for a given day and hour
  const getValueAt = (day: number, hour: number) => {
    const cell = data.find(item => item.day === day && item.hour === hour);
    return cell ? cell.value : 0;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          {/* <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select activity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="created">Creation</SelectItem>
              <SelectItem value="checked">Checking</SelectItem>
              <SelectItem value="packed">Packing</SelectItem>
              <SelectItem value="delivered">Delivery</SelectItem>
              <SelectItem value="billed">Billing</SelectItem>
            </SelectContent>
          </Select> */}
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[360px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Hour labels (top) */}
              <div className="grid grid-cols-[60px_repeat(24,minmax(24px,1fr))] mb-1">
                <div className="text-xs text-muted-foreground"></div>
                {hourLabels.map((hour, i) => (
                  <div key={i} className="text-xs text-muted-foreground text-center">
                    {i % 2 === 0 ? hour : ''}
                  </div>
                ))}
              </div>
              
              {/* Heatmap grid */}
              {dayLabels.map((day, dayIndex) => (
                <div key={dayIndex} className="grid grid-cols-[60px_repeat(24,minmax(24px,1fr))] h-10">
                  <div className="text-sm font-medium flex items-center">{day}</div>
                  {Array.from({ length: 24 }, (_, hourIndex) => {
                    const value = getValueAt(dayIndex, hourIndex);
                    return (
                      <div
                        key={hourIndex}
                        className={`${getCellColor(value)} flex items-center justify-center text-xs border border-background rounded-sm m-px`}
                        title={`${day} ${hourLabels[hourIndex]}: ${value} activities`}
                      >
                        {value > 0 ? value : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="text-xs text-muted-foreground">Activity count:</div>
                <div className="flex items-center">
                  {['0', '< 5', '< 10', '< 20', '< 30', '< 50', '50+'].map((label, i) => (
                    <div key={i} className="flex flex-col items-center mx-1">
                      <div className={`w-6 h-6 ${getCellColor(i === 0 ? 0 : i === 6 ? 51 : i * 5)}`}></div>
                      <div className="text-xs mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 