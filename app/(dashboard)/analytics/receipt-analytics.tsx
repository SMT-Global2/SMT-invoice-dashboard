"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, DonutChart } from "@tremor/react";
import { Grid } from "@tremor/react";
import { Skeleton } from "@/components/ui/skeleton";
import useAnalyticsStore from "@/store/useAnalyticsStore";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays, format, subDays, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { ActivityHeatmap } from "./activity-heatmap";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart as RechartsBarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/components/ui/checkbox";

// Define a color palette (adjust as needed)
const USER_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
];

// Custom Tooltip for User Receipt Types Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-1">
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {label}
            </span>
          </div>
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="grid grid-cols-2 gap-2 items-center mt-1">
            <div className="flex items-center space-x-1">
                <span 
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[0.70rem] text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-bold text-right text-foreground">
                {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ReceiptAnalytics() {
  const { 
    extendedAnalytics: { receipt, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), // Default start date: 30 days ago
    to: new Date(), // Default end date: today
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [filteredUsersForChart, setFilteredUsersForChart] = useState<string[]>([]);
  
  useEffect(() => {
    fetchExtendedAnalytics('receipt', date);
  }, [date, fetchExtendedAnalytics]);

  // Format date range for display
  const dateRangeText = useMemo(() => {
    if (!date?.from) return "Today";
    if (!date.to || date.from.toDateString() === date.to.toDateString()) {
      return format(date.from, "d MMM yyyy");
    }
    // Ensure both dates exist before formatting the range
    if (date.from && date.to) {
      return `${format(date.from, "d MMM yyyy")} - ${format(date.to, "d MMM yyyy")}`;
    }
    // Fallback if only from date exists (though covered by the previous check)
    return format(date.from, "d MMM yyyy"); 
  }, [date]);
  
  // Get all unique users for filtering
  const users = useMemo(() => {
    if (!receipt?.byUser) return [];
    return receipt.byUser.map(user => user.username);
  }, [receipt]);

  // Filter receipt data by selected user if needed
  const filteredReceiptTrendData = useMemo(() => {
    if (!receipt?.perDay) return [];
    
    const data = receipt.perDay.map((day) => ({
      date: format(new Date(day.date), 'MMM dd'),
      "Receipt Count": day.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return data;
  }, [receipt]);
  
  const paymentMethodData = useMemo(() => {
    if (!receipt) return [];
    return [
      { name: 'Cash', value: receipt.cashCount, amount: receipt.totalAmount * (parseInt(receipt.percentCash)/100) },
      { name: 'Cheque', value: receipt.chequeCount, amount: receipt.totalAmount * (parseInt(receipt.percentCheque)/100) },
    ].filter(item => item.value > 0);
  }, [receipt]);
  
  // Filter and sort user receipt data
  const userReceiptData = useMemo(() => {
    if (!receipt?.byUser) return [];
    
    let filteredUsers = receipt.byUser;
    
    return filteredUsers
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "Receipts": user.count,
        "Cash": Math.round(user.count * (parseInt(receipt.percentCash || '0')/100)),
        "Cheque": Math.round(user.count * (parseInt(receipt.percentCheque || '0')/100))
      }));
  }, [receipt]);
  
  // User amount data sorted by total amount with payment type filter
  const userAmountData = useMemo(() => {
    if (!receipt?.amountByUser) return [];
    
    let filteredUsers = receipt.amountByUser;
    
    const cashRatio = parseInt(receipt.percentCash || '0') / 100;
    const chequeRatio = parseInt(receipt.percentCheque || '0') / 100;
    
    return filteredUsers
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((user) => {
        const cashAmount = user.amount * cashRatio;
        const chequeAmount = user.amount * chequeRatio;
        
        return {
          name: user.username,
          "Total": user.amount,
          "Cash": cashAmount,
          "Cheque": chequeAmount,
          // For the chart, we'll use one of these based on filter
          "Amount": paymentTypeFilter === "all" ? user.amount : 
                   paymentTypeFilter === "cash" ? cashAmount : chequeAmount
        };
      });
  }, [receipt, paymentTypeFilter]);
  
  // Calculate daily trend for table display
  const dailyTrendTableData = useMemo(() => {
    if (!receipt?.perDay) return [];
    
    return receipt.perDay
      .map(day => ({
        date: format(new Date(day.date), 'd MMM yyyy'),
        count: day.count,
        cashCount: Math.round(day.count * (parseInt(receipt?.percentCash || '0')/100)),
        chequeCount: Math.round(day.count * (parseInt(receipt?.percentCheque || '0')/100)),
        cashAmount: receipt.totalCount > 0 ? (receipt.totalAmount / receipt.totalCount) * Math.round(day.count * (parseInt(receipt?.percentCash || '0')/100)) : 0,
        chequeAmount: receipt.totalCount > 0 ? (receipt.totalAmount / receipt.totalCount) * Math.round(day.count * (parseInt(receipt?.percentCheque || '0')/100)) : 0,
        totalAmount: receipt.totalCount > 0 ? (receipt.totalAmount / receipt.totalCount) * day.count : 0
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipt]);
  
  // Update useEffect to initialize filteredUsersForChart when users data is available
  useEffect(() => {
    if (receipt?.byUser && filteredUsersForChart.length === 0) {
      setFilteredUsersForChart(receipt.byUser.slice(0, 10).map(u => u.username));
    }
  }, [receipt?.byUser]);

  // Prepare data for the grouped bar chart
  const userReceiptGroupedData = useMemo(() => {
    if (!receipt?.byUser) return [];
    
    // First, get the top users based on the original sorting
    const topUsers = receipt.byUser
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(u => u.username);
      
    // Filter based on checkbox selection
    const usersToDisplay = topUsers.filter(u => filteredUsersForChart.includes(u));

    // Map data for the chart
    return usersToDisplay.map((username, index) => {
      const userData = receipt.byUser.find(u => u.username === username);
      const cashCount = Math.round((userData?.count || 0) * (parseInt(receipt?.percentCash || '0') / 100));
      const chequeCount = Math.round((userData?.count || 0) * (parseInt(receipt?.percentCheque || '0') / 100));
      
      return {
        name: username,
        "Cash": cashCount,
        "Cheque": chequeCount,
        color: USER_COLORS[index % USER_COLORS.length] // Assign color
      };
    });
  }, [receipt, filteredUsersForChart]);

  // Handle user filter checkbox change
  const handleUserFilterChange = (username: string, checked: boolean | string) => {
    if (checked === true) {
      setFilteredUsersForChart(prev => [...prev, username]);
    } else {
      setFilteredUsersForChart(prev => prev.filter(u => u !== username));
    }
  };
  
  const handleDateSelect = (selectedDateRange: DateRange | undefined) => {
    setDate(selectedDateRange);
    if ((selectedDateRange?.from && selectedDateRange?.to) || (!selectedDateRange?.from && !selectedDateRange?.to)) {
      setPopoverOpen(false);
    }
  };
  
  if (isLoading && !receipt) {
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
  
  const totalCash = receipt?.cashCount || 0;
  const totalCheque = receipt?.chequeCount || 0;
  const cashPercentage = parseInt(receipt?.percentCash || '0');
  const chequePercentage = parseInt(receipt?.percentCheque || '0');
  const estimatedCashAmount = receipt ? (receipt.totalAmount * cashPercentage / 100) : 0;
  const estimatedChequeAmount = receipt ? (receipt.totalAmount * chequePercentage / 100) : 0;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Receipt Analytics</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRangeText}
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
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipt?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">Cash:</div>
                <Badge variant="outline">{totalCash} ({cashPercentage}%)</Badge>
              </div>
              <Progress className="h-2" value={cashPercentage} />
              <div className="flex justify-between items-center">
                <div className="text-sm">Cheque:</div>
                <Badge variant="outline">{totalCheque} ({chequePercentage}%)</Badge>
              </div>
              <Progress className="h-2" value={chequePercentage} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Amounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-sm">Cash:</span>
                <span className="font-semibold">{formatCurrency(estimatedCashAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Cheque:</span>
                <span className="font-semibold">{formatCurrency(estimatedChequeAmount)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {receipt?.byUser?.length || 0} users processed receipts
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receipt?.totalAmount || 0)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Receipt Trend</CardTitle>
          <CardDescription>Daily receipt counts over time</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReceiptTrendData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredReceiptTrendData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
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
                    tickFormatter={(value) => `${value}`}
                    tickCount={5}
                    width={50}
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
                    dataKey="Receipt Count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorTrend)"
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Rankings</CardTitle>
            <CardDescription>Top users and daily breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="userRanking">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="userRanking">Top Users by Count</TabsTrigger>
                <TabsTrigger value="dailyBreakdown">Daily Breakdown</TabsTrigger>
              </TabsList>
              
              <TabsContent value="userRanking">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Cheque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userReceiptData.map((user, index) => (
                      <TableRow key={user.name}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{user.Receipts}</TableCell>
                        <TableCell className="text-right">{user.Cash}</TableCell>
                        <TableCell className="text-right">{user.Cheque}</TableCell>
                      </TableRow>
                    ))}
                    {userReceiptData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No user data found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="dailyBreakdown">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Receipts</TableHead>
                        <TableHead className="text-right">Cash Count</TableHead>
                        <TableHead className="text-right">Cheque Count</TableHead>
                        <TableHead className="text-right">Cash Amount</TableHead>
                        <TableHead className="text-right">Cheque Amount</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyTrendTableData.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell className="text-right">{day.count}</TableCell>
                          <TableCell className="text-right">{day.cashCount}</TableCell>
                          <TableCell className="text-right">{day.chequeCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(day.cashAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(day.chequeAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(day.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {dailyTrendTableData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No daily data found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Receipt Types</CardTitle>
            <CardDescription>Cash vs Cheque receipts per user (Top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-xs font-medium mb-2 text-muted-foreground">Filter Users:</p>
              <ScrollArea className="h-auto w-full whitespace-nowrap rounded-md border">
                <div className="flex space-x-4 p-4">
                  {receipt?.byUser?.slice(0, 10).map((user, index) => (
                    <div key={user.username} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-filter-${user.username}`}
                        checked={filteredUsersForChart.includes(user.username)}
                        onCheckedChange={(checked: boolean) => handleUserFilterChange(user.username, checked)}
                        className="border-muted-foreground"
                      />
                      <label 
                        htmlFor={`user-filter-${user.username}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-normal"
                      >
                        {user.username}
                      </label>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {userReceiptGroupedData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart 
                    data={userReceiptGroupedData} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    barGap={4} 
                    barCategoryGap="20%" 
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <YAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickCount={5}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: "hsl(var(--accent))", fillOpacity: 0.1 }}
                      content={<CustomBarTooltip />} 
                    />
                    <Bar dataKey="Cash" name="Cash" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cheque" name="Cheque" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                {receipt?.byUser?.length === 0 ? "No user data found" : "Select users to display"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ActivityHeatmap 
        title="Receipt Activity Heatmap"
        description="Hourly receipt creation patterns across weekdays" 
      />
    </div>
  );
} 