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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StatementAnalytics() {
  const { 
    extendedAnalytics: { statement, isLoading },
    fetchExtendedAnalytics
  } = useAnalyticsStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  useEffect(() => {
    fetchExtendedAnalytics('statement', date);
  }, [date, fetchExtendedAnalytics]);
  
  const statementTrendData = useMemo(() => {
    if (!statement?.perDay) return [];
    
    return statement.perDay.map((day) => ({
      date: format(new Date(day.date), 'MMM dd'),
      "Statement Count": day.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [statement]);
  
  const uploadedUserData = useMemo(() => {
    if (!statement?.byUploadUser) return [];
    
    return statement.byUploadUser
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "Statements Uploaded": user.count
      }));
  }, [statement]);
  
  const partyCodeData = useMemo(() => {
    if (!statement?.reportSections?.byPartyCode) return [];
    
    return statement.reportSections.byPartyCode
      .filter(item => item.partyCode)
      .sort((a, b) => b.count - a.count)
      .map((code) => ({
        name: code.partyCode || 'Unknown',
        value: code.count
      }));
  }, [statement]);
  
  const savedUserData = useMemo(() => {
    if (!statement?.reportSections?.bySavedUser) return [];
    
    return statement.reportSections.bySavedUser
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((user) => ({
        name: user.username,
        "Sections Saved": user.count
      }));
  }, [statement]);
  
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
        <h2 className="text-3xl font-bold tracking-tight">Statement Analytics</h2>
        
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
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
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
            <CardTitle className="text-sm font-medium">Total Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement?.reportSections?.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement?.reportSections?.savedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statement?.reportSections?.percentSaved || 0}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploaders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statement?.byUploadUser?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Statement Upload Trend</CardTitle>
            <CardDescription>Daily statement uploads over time</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              className="h-[300px]"
              data={statementTrendData}
              index="date"
              categories={["Statement Count"]}
              colors={["cyan"]}
              yAxisWidth={30}
              showAnimation
              showLegend={false}
            />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Party Distribution</CardTitle>
            <CardDescription>Report sections by party code</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              className="h-[300px]"
              data={partyCodeData}
              category="value"
              index="name"
              valueFormatter={(number) => number.toString()}
              colors={["cyan", "sky", "blue", "indigo", "violet"]}
            />
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="uploaders">
        <TabsList>
          <TabsTrigger value="uploaders">Top Uploaders</TabsTrigger>
          <TabsTrigger value="savers">Top Section Savers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uploaders">
          <Card>
            <CardHeader>
              <CardTitle>Top Statement Uploaders</CardTitle>
              <CardDescription>Users who uploaded the most statements</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                className="h-[300px]"
                data={uploadedUserData}
                index="name"
                categories={["Statements Uploaded"]}
                colors={["sky"]}
                yAxisWidth={48}
                showAnimation
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="savers">
          <Card>
            <CardHeader>
              <CardTitle>Top Section Savers</CardTitle>
              <CardDescription>Users who saved the most report sections</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                className="h-[300px]"
                data={savedUserData}
                index="name"
                categories={["Sections Saved"]}
                colors={["blue"]}
                yAxisWidth={48}
                showAnimation
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Party Code Distribution</CardTitle>
          <CardDescription>Detailed breakdown of report sections by party code</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party Code</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement?.reportSections?.byPartyCode?.map((party) => (
                <TableRow key={party.partyCode}>
                  <TableCell className="font-medium">{party.partyCode || 'Unknown'}</TableCell>
                  <TableCell className="text-right">{party.count}</TableCell>
                  <TableCell className="text-right">
                    {statement.reportSections.totalCount ? ((party.count / statement.reportSections.totalCount) * 100).toFixed(2) : 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Uploader Activity</CardTitle>
          <CardDescription>Detailed breakdown of statements by uploader</CardDescription>
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
              {statement?.byUploadUser?.map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-right">{user.count}</TableCell>
                  <TableCell className="text-right">
                    {statement.totalCount ? ((user.count / statement.totalCount) * 100).toFixed(2) : 0}%
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