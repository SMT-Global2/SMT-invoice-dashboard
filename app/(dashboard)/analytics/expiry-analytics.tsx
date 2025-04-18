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
import { cn } from "@/lib/utils";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export function ExpiryAnalytics() {
  const { 
    extendedAnalytics: { expiry, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  useEffect(() => {
    fetchExtendedAnalytics('expiry', date);
  }, [date, fetchExtendedAnalytics]);
  
  const handleDateSelect = (selectedDateRange: DateRange | undefined) => {
    setDate(selectedDateRange);
    if ((selectedDateRange?.from && selectedDateRange?.to) || (!selectedDateRange?.from && !selectedDateRange?.to)) {
      setPopoverOpen(false); 
    }
  };
  
  const expiryTrendData = useMemo(() => {
    const perDayData = expiry?.perDay as { date: string | Date, count: number }[] | undefined;
    if (!perDayData) return [];
    
    return perDayData.map(day => ({
      date: format(new Date(day.date), 'MMM dd'),
      Count: day.count 
    }));
  }, [expiry]);
  
  const regionalData = useMemo(() => {
    if (!expiry?.byRegionalCode) return [];
    
    return expiry.byRegionalCode
      .filter(item => item.regionalCode)
      .sort((a, b) => b.count - a.count);
  }, [expiry]);
  
  const uploadedUserData = useMemo(() => {
    if (!expiry?.byUser) return [];
    return expiry.byUser
      .filter(user => user.username)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        name: user.username,
        "Records Uploaded": user.count 
      }));
  }, [expiry]);
  
  const creditNoteUserData = useMemo(() => {
    if (!expiry?.byCreditNoteUser) return [];
    return expiry.byCreditNoteUser
      .filter(user => user.username)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        name: user.username,
        "Credit Notes Created": user.count
      }));
  }, [expiry]);
  
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
        <h2 className="text-3xl font-bold tracking-tight">Expiry Analytics</h2>
        
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiry?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending (Record Table)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiry?.withoutCreditNoteCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {expiry?.totalCount && expiry.totalCount > 0 
                ? (100 - parseFloat(expiry?.percentWithCreditNote || '0')).toFixed(2)
                : '0.00'}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported (Internal Ops)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiry?.withCreditNoteCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {expiry?.percentWithCreditNote || 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Expiry Trend</CardTitle>
          <CardDescription>Daily expiry counts over time</CardDescription>
        </CardHeader>
        <CardContent>
          {expiryTrendData && expiryTrendData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart
                  data={expiryTrendData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expiryTrendColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-5, 38.9 98.4% 51.8%))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-5, 38.9 98.4% 51.8%))" stopOpacity={0.1}/>
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
                    dataKey="Count"
                    stroke="hsl(var(--chart-5, 38.9 98.4% 51.8%))"
                    strokeWidth={2} 
                    fillOpacity={1}
                    fill="url(#expiryTrendColor)"
                    dot={false}
                    connectNulls={true}
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trend data available.
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> 
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Expiry Users</CardTitle>
            <CardDescription>Users involved in expiry processing</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="uploaders">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="uploaders">Record Uploaders</TabsTrigger>
                <TabsTrigger value="operators">Credit Note Operators</TabsTrigger>
              </TabsList>
              <TabsContent value="uploaders">
                {uploadedUserData && uploadedUserData.length > 0 ? (
                  <div className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart 
                        data={uploadedUserData}
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
                          dataKey="Records Uploaded" 
                          fill="hsl(var(--chart-3, 270 80% 60%))" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground pt-4">
                    No uploader data available.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="operators">
                {creditNoteUserData && creditNoteUserData.length > 0 ? (
                  <div className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart 
                        data={creditNoteUserData}
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
                          dataKey="Credit Notes Created" 
                          fill="hsl(var(--chart-4, 142.1 76.2% 36.3%))" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground pt-4">
                    No credit note operator data available.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Regional Distribution Details</CardTitle>
            <CardDescription>Detailed breakdown of expiries by regional code</CardDescription>
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
                  {regionalData && regionalData.length > 0 ? (
                    regionalData
                      .map((region, index) => (
                        <TableRow key={region.regionalCode || `unknown-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{region.regionalCode || 'Unknown'}</TableCell>
                          <TableCell className="text-right">{region.count}</TableCell>
                          <TableCell className="text-right">
                            {expiry?.totalCount 
                              ? ((region.count / expiry.totalCount) * 100).toFixed(2) 
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