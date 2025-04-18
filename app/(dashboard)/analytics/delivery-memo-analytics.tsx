"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart as TremorBarChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";
import useAnalyticsStore from "@/store/useAnalyticsStore";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Legend as RechartsLegend,
} from 'recharts';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DeliveryMemoAnalytics() {
  const { 
    extendedAnalytics: { deliveryMemo, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  useEffect(() => {
    fetchExtendedAnalytics('deliveryMemo', date);
  }, [date, fetchExtendedAnalytics]);
  
  const dmTrendData = useMemo(() => {
    if (!deliveryMemo?.perDay) return [];
    
    return deliveryMemo.perDay.map((day) => ({
      date: format(new Date(day.date), 'MMM dd'),
      "DM Count": day.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [deliveryMemo]);
  
  const regionalData = useMemo(() => {
    if (!deliveryMemo?.byRegionalCode) return [];
    
    return deliveryMemo.byRegionalCode
      .filter((item) => item.regionalCode)
      .sort((a, b) => b.count - a.count)
      .map((region) => ({
        name: region.regionalCode || 'Unknown',
        value: region.count
      }));
  }, [deliveryMemo]);
  
  const collectedUserData = useMemo(() => {
    if (!deliveryMemo?.byUserCollected) return [];
    
    return deliveryMemo.byUserCollected
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "DMs Collected": user.count
      }));
  }, [deliveryMemo]);
  
  const checkedUserData = useMemo(() => {
    if (!deliveryMemo?.byUserChecked) return [];
    
    return deliveryMemo.byUserChecked
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "DMs Checked": user.count
      }));
  }, [deliveryMemo]);
  
  const handleDateSelect = (selectedDateRange: DateRange | undefined) => {
    setDate(selectedDateRange);
    if ((selectedDateRange?.from && selectedDateRange?.to) || (!selectedDateRange?.from && !selectedDateRange?.to)) {
      setPopoverOpen(false); 
    }
  };
  
  const isTodaySelected = useMemo(() => {
    const today = new Date();
    return date?.from?.toDateString() === today.toDateString() && 
           date?.to?.toDateString() === today.toDateString();
  }, [date]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Memo Analytics</h2>
        
        <div className="flex items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-[300px] h-9 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d MMM yyyy")} -{" "}
                      {format(date.to, "d MMM yyyy")}
                    </>
                  ) : (
                    format(date.from, "d MMM yyyy")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Delivery Memos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryMemo?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected DMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryMemo?.collectedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryMemo?.percentCollected || 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked DMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryMemo?.checkedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryMemo?.percentChecked || 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set([
                ...(deliveryMemo?.byUserCollected?.map(u => u.username) || []),
                ...(deliveryMemo?.byUserChecked?.map(u => u.username) || [])
              ]).size}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Delivery Memo Trend</CardTitle>
          <CardDescription>Daily DM counts over time</CardDescription>
        </CardHeader>
        <CardContent>
          {dmTrendData && dmTrendData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart
                  data={dmTrendData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="deliveryMemoTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3, 240 5.9% 10%))" stopOpacity={0.8}/> 
                      <stop offset="95%" stopColor="hsl(var(--chart-3, 240 5.9% 10%))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      fontSize: "12px",
                      borderRadius: "var(--radius)"
                    }}
                    cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="DM Count" 
                    stroke="hsl(var(--chart-3, 240 5.9% 10%))" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#deliveryMemoTrendColor)"
                    dot={false}
                    connectNulls={true}
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for the selected period.
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Top Users (Collectors & Checkers) */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>Collectors and Checkers (Top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="collectors">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="collectors">Top Collectors</TabsTrigger>
                <TabsTrigger value="checkers">Top Checkers</TabsTrigger>
              </TabsList>
              
              {/* Tab Content for Collectors */}
              <TabsContent value="collectors">
                {collectedUserData && collectedUserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBarChart 
                      data={collectedUserData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                      <XAxis 
                        dataKey="name"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          fontSize: "12px",
                          borderRadius: "var(--radius)"
                        }}
                        cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                      />
                      <Bar 
                        dataKey="DMs Collected" 
                        fill="hsl(var(--chart-1, 221.2 83.2% 53.3%))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No collector data available.
                  </div>
                )}
              </TabsContent>
              
              {/* Tab Content for Checkers */}
              <TabsContent value="checkers">
                {checkedUserData && checkedUserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBarChart 
                      data={checkedUserData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                      <XAxis 
                        dataKey="name"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          fontSize: "12px",
                          borderRadius: "var(--radius)"
                        }}
                        cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                      />
                      <Bar 
                        dataKey="DMs Checked" 
                        fill="hsl(var(--chart-4, 142.1 76.2% 36.3%))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No checker data available.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Right Card: Regional Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Regional Distribution Details</CardTitle>
            <CardDescription>Detailed breakdown of DMs by regional code</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">S. No.</TableHead>
                    <TableHead>Regional Code</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryMemo?.byRegionalCode && deliveryMemo.byRegionalCode.length > 0 && deliveryMemo.totalCount != null ? (
                    deliveryMemo.byRegionalCode
                      .sort((a, b) => {
                        const percentageA = deliveryMemo.totalCount && deliveryMemo.totalCount > 0 ? (a.count / deliveryMemo.totalCount) * 100 : 0;
                        const percentageB = deliveryMemo.totalCount && deliveryMemo.totalCount > 0 ? (b.count / deliveryMemo.totalCount) * 100 : 0;
                        return percentageB - percentageA;
                      })
                      .map((region, index) => (
                        <TableRow key={region.regionalCode || `unknown-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{region.regionalCode || 'Unknown'}</TableCell>
                          <TableCell className="text-right">{region.count}</TableCell>
                          <TableCell className="text-right">
                            {deliveryMemo.totalCount 
                              ? ((region.count / deliveryMemo.totalCount) * 100).toFixed(2) 
                              : '0.00'}%
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No regional data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 