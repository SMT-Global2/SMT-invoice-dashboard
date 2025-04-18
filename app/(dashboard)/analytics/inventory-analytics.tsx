"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";
import useAnalyticsStore from "@/store/useAnalyticsStore";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays, format, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart,
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
import { ScrollArea } from "@/components/ui/scroll-area";

export function InventoryAnalytics() {
  const { 
    extendedAnalytics: { inventory, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  useEffect(() => {
    fetchExtendedAnalytics('inventory', date);
  }, [date, fetchExtendedAnalytics]);
  
  const dateRangeText = useMemo(() => {
    if (!date?.from) return "Today";
    if (!date?.to || date.from.toDateString() === date.to.toDateString()) 
      return format(date.from, "d MMM yyyy");
    return `${format(date.from, "d MMM yyyy")} - ${format(date.to, "d MMM yyyy")}`;
  }, [date]);
  
  const inventoryChartData = useMemo(() => {
    if (!inventory?.perDay) return [];
    
    return inventory.perDay.map(day => ({
      date: format(new Date(day.date), 'MMM dd'),
      "Inventory Count": day.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [inventory]);
  
  const checkUserData = useMemo(() => {
    if (!inventory?.byUserCheck) return [];
    
    const data = inventory.byUserCheck
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        name: user.username,
        "Inventories Checked": user.count
      }));
    console.log("[Component] Processed Check User Data:", data);
    return data;
  }, [inventory]);
  
  const voucherUserData = useMemo(() => {
    if (!inventory?.byUserVoucher) return [];
    
    const data = inventory.byUserVoucher
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        name: user.username,
        "Vouchers Created": user.count
      }));
    console.log("[Component] Processed Voucher User Data:", data);
    return data;
  }, [inventory]);
  
  const handleDateSelect = (selectedDateRange: DateRange | undefined) => {
    setDate(selectedDateRange);
    if ((selectedDateRange?.from && selectedDateRange?.to) || (!selectedDateRange?.from && !selectedDateRange?.to)) {
      setPopoverOpen(false); 
    }
  };
  
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
        <h2 className="text-3xl font-bold tracking-tight">Inventory Analytics</h2>
        
        <div className="flex items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRangeText}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
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
            <CardTitle className="text-sm font-medium">Total Inventories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Voucher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.withVoucherCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Voucher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.withoutVoucherCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.byUserCheck?.length || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Trend</CardTitle>
          <CardDescription>Daily inventory counts over time</CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryChartData && inventoryChartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={inventoryChartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="inventoryTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
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
                    dataKey="Inventory Count" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#inventoryTrendColor)"
                    dot={false}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No trend data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* New Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Top Users (Checkers & Vouchers) */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>Checkers and Voucher Creators (Top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="checker">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="checker">Top Checkers</TabsTrigger>
                <TabsTrigger value="voucher">Top Voucher Creators</TabsTrigger>
              </TabsList>
              
              {/* Tab Content for Checkers */}
              <TabsContent value="checker">
                {checkUserData && checkUserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBarChart data={checkUserData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2}/>
                      <XAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={30}/>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", fontSize: "12px", borderRadius: "var(--radius)" }}
                        cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                      />
                      <Bar dataKey="Inventories Checked" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={15} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No checker data available for the selected period
                  </div>
                )}
              </TabsContent>
              
              {/* Tab Content for Voucher Creators */}
              <TabsContent value="voucher">
                {voucherUserData && voucherUserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBarChart data={voucherUserData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                      <XAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={30} domain={['auto', 'auto']}/>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", fontSize: "12px", borderRadius: "var(--radius)" }}
                        cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                      />
                      <Bar dataKey="Vouchers Created" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={15} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No voucher creator data available for the selected period
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Right Card: Details by Agency */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Details by Agency</CardTitle>
            <CardDescription>Breakdown of inventory counts per agency</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agency Code</TableHead>
                    <TableHead>Agency Name</TableHead>
                    <TableHead className="text-right">Inventory Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory && inventory.byAgency && inventory.byAgency.length > 0 ? (
                    inventory.byAgency.map((agency) => (
                      <TableRow key={agency.agencyCode}>
                        <TableCell>{agency.agencyCode}</TableCell>
                        <TableCell>{agency.agencyName || "N/A"}</TableCell>
                        <TableCell className="text-right">{agency._count}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">No agency data available for the selected period</TableCell>
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