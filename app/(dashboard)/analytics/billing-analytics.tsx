"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart, DonutChart } from "@tremor/react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function BillingAnalytics() {
  const { 
    extendedAnalytics: { billing, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  useEffect(() => {
    fetchExtendedAnalytics('billing', date);
  }, [date, fetchExtendedAnalytics]);
  
  const dateRangeText = useMemo(() => {
    if (!date?.from) return "Today";
    if (!date.to || date.from.toDateString() === date.to.toDateString()) {
      return format(date.from, "d MMM yyyy");
    }
    if (date.from && date.to) {
      return `${format(date.from, "d MMM yyyy")} - ${format(date.to, "d MMM yyyy")}`;
    }
    return format(date.from, "d MMM yyyy");
  }, [date]);
  
  const billingTrendData = useMemo(() => {
    if (!billing?.perDay) return [];
    
    return billing.perDay.map((day) => ({
      date: format(new Date(day.date), 'MMM dd'),
      "Billing Count": day.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [billing]);
  
  const paymodeData = useMemo(() => {
    if (!billing) return [];
    return [
      { name: 'Cash', value: billing.cashCount },
      { name: 'Credit', value: billing.creditCount },
    ].filter(item => item.value > 0); // Filter out zero counts
  }, [billing]);
  
  const userBillingData = useMemo(() => {
    if (!billing?.byUser) return [];
    
    return billing.byUser
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "Billings Processed": user.count
      }));
  }, [billing]);
  
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
        <h2 className="text-3xl font-bold tracking-tight">Billing Analytics</h2>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-[300px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {dateRangeText}
                    </>
                  ) : (
                    dateRangeText
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
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billing?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billing?.cashCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {billing?.percentCash || 0}% of total
            </p>
            <Progress className="mt-2" value={parseFloat(billing?.percentCash || '0')} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billing?.creditCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {billing?.percentCredit || 0}% of total
            </p>
            <Progress className="mt-2" value={parseFloat(billing?.percentCredit || '0')} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billing?.byUser?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Billing Trend</CardTitle>
            <CardDescription>Daily billing counts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              className="h-[300px]"
              data={billingTrendData}
              index="date"
              categories={["Billing Count"]}
              colors={["green"]}
              yAxisWidth={30}
              showAnimation
              showLegend={false}
            />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Billing Paymode</CardTitle>
            <CardDescription>Distribution of cash vs credit billings</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-[300px]"
              data={paymodeData}
              category="value"
              index="name"
              valueFormatter={(number) => number.toString()}
              colors={["green", "lime"]}
            />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Billing Users</CardTitle>
          <CardDescription>Users who processed the most billings</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            className="h-[300px]"
            data={userBillingData}
            index="name"
            categories={["Billings Processed"]}
            colors={["lime"]}
            yAxisWidth={48}
            showAnimation
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>User Billing Details</CardTitle>
          <CardDescription>Detailed breakdown of billings by user</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing?.byUser?.map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-right">{user.count}</TableCell>
                  <TableCell className="text-right">
                    {billing.totalCount ? ((user.count / billing.totalCount) * 100).toFixed(2) : 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 