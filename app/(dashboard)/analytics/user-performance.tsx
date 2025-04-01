"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRoundCog, Clock, Trophy, Activity } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface UserPerformanceData {
  username: string;
  firstName: string;
  lastName: string;
  department: string[];
  metrics: {
    invoicesCreated: number;
    invoicesChecked: number;
    invoicesPacked: number;
    invoicesDelivered: number;
    invoicesBilled: number;
    avgProcessingTime: number;
    completionRate: number;
    rank: number;
  };
}

interface UserComparisonData {
  username: string;
  displayName: string;
  invoicesCreated: number;
  invoicesChecked: number;
  invoicesPacked: number;
  invoicesDelivered: number;
  invoicesBilled: number;
  totalProcessed: number;
}

interface TopPerformerData {
  username: string;
  displayName: string;
  category: string;
  total: number;
  avgTimeHours: number;
}

interface PerformanceSpeedData {
  username: string;
  displayName: string;
  generateToCheck: number;
  checkToPack: number;
  packToDelivery: number;
  deliveryToBill: number;
  totalTime: number;
}

export function UserPerformance() {
  const [userPerformance, setUserPerformance] = useState<UserPerformanceData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformerData[]>([]);
  const [userComparison, setUserComparison] = useState<UserComparisonData[]>([]);
  const [speedMetrics, setSpeedMetrics] = useState<PerformanceSpeedData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  useEffect(() => {
    const fetchUserPerformance = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange?.from) {
          queryParams.append('from', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
          queryParams.append('to', format(dateRange.to, 'yyyy-MM-dd'));
        }
        if (selectedDepartment !== "ALL") {
          queryParams.append('department', selectedDepartment);
        }
        
        const response = await fetch(`/api/analytics/user-performance?${queryParams.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setUserPerformance(result.userPerformance || []);
          setTopPerformers(result.topPerformers || []);
          setUserComparison(result.userComparison || []);
          setSpeedMetrics(result.speedMetrics || []);
        }
      } catch (error) {
        console.error("Failed to fetch user performance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPerformance();
  }, [dateRange, selectedDepartment]);

  const COLORS = [
    "#8b5cf6", // Purple
    "#10b981", // Green
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#ef4444", // Red
  ];

  const renderRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{payload[0].payload.displayName}</p>
          <p className="text-xs">{payload[0].name}: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-xs flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span>{entry.name}:</span>
                <span className="font-semibold">{entry.value.toFixed(2)} hrs</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserRoundCog className="h-5 w-5" />
            User Performance Analytics
          </CardTitle>
          <CardDescription>
            Detailed analysis of user productivity and efficiency
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              <SelectItem value="RECEIPT_MANAGEMENT">Receipt Management</SelectItem>
              <SelectItem value="INVOICE_MANAGEMENT">Invoice Management</SelectItem>
              <SelectItem value="PURCHASE_MANAGEMENT">Purchase Management</SelectItem>
              <SelectItem value="ALL_ROUNDER">All-rounders</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange 
            date={dateRange} 
            setDate={setDateRange}
          />
        </div>
      </CardHeader>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b px-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="comparison">User Comparison</TabsTrigger>
          <TabsTrigger value="speed">Processing Speed</TabsTrigger>
        </TabsList>
        <CardContent className="px-2 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="mt-0">
                <div className="rounded-md border my-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-center">Created</TableHead>
                        <TableHead className="text-center">Checked</TableHead>
                        <TableHead className="text-center">Packed</TableHead>
                        <TableHead className="text-center">Delivered</TableHead>
                        <TableHead className="text-center">Billed</TableHead>
                        <TableHead className="text-center">Avg. Time</TableHead>
                        <TableHead className="text-center">Completion</TableHead>
                        <TableHead className="text-right">Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userPerformance.map((user) => (
                        <TableRow key={user.username}>
                          <TableCell>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-muted-foreground">{user.username}</div>
                            <div className="flex gap-1 mt-1">
                              {user.department.map((dept) => (
                                <Badge key={dept} variant="outline" className="text-[10px] px-1 py-0">
                                  {dept.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.invoicesCreated}</TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.invoicesChecked}</TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.invoicesPacked}</TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.invoicesDelivered}</TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.invoicesBilled}</TableCell>
                          <TableCell className="text-center font-medium">{user.metrics.avgProcessingTime.toFixed(1)} hrs</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-medium">{user.metrics.completionRate}%</span>
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    width: `${user.metrics.completionRate}%`,
                                    backgroundColor: user.metrics.completionRate > 75 
                                      ? '#10b981' 
                                      : user.metrics.completionRate > 50 
                                        ? '#f59e0b' 
                                        : '#ef4444'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={`${
                              user.metrics.rank <= 3 ? 'bg-green-100 text-green-800' :
                              user.metrics.rank <= 6 ? 'bg-amber-100 text-amber-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              #{user.metrics.rank}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="top-performers" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Top Invoice Creators
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPerformers
                          .filter(p => p.category === 'created')
                          .slice(0, 5)
                          .map((performer, idx) => (
                            <div key={performer.username} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                  idx === 0 ? 'bg-amber-500' :
                                  idx === 1 ? 'bg-gray-400' :
                                  idx === 2 ? 'bg-orange-700' :
                                  'bg-gray-300'
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium">{performer.displayName}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{performer.total}</div>
                                <div className="text-xs text-muted-foreground">
                                  Avg: {performer.avgTimeHours.toFixed(1)} hrs
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Top Package Processors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPerformers
                          .filter(p => p.category === 'packed')
                          .slice(0, 5)
                          .map((performer, idx) => (
                            <div key={performer.username} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                  idx === 0 ? 'bg-amber-500' :
                                  idx === 1 ? 'bg-gray-400' :
                                  idx === 2 ? 'bg-orange-700' :
                                  'bg-gray-300'
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium">{performer.displayName}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{performer.total}</div>
                                <div className="text-xs text-muted-foreground">
                                  Avg: {performer.avgTimeHours.toFixed(1)} hrs
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Top Delivery Agents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPerformers
                          .filter(p => p.category === 'delivered')
                          .slice(0, 5)
                          .map((performer, idx) => (
                            <div key={performer.username} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                  idx === 0 ? 'bg-amber-500' :
                                  idx === 1 ? 'bg-gray-400' :
                                  idx === 2 ? 'bg-orange-700' :
                                  'bg-gray-300'
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium">{performer.displayName}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{performer.total}</div>
                                <div className="text-xs text-muted-foreground">
                                  Avg: {performer.avgTimeHours.toFixed(1)} hrs
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Top Billing Agents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPerformers
                          .filter(p => p.category === 'billed')
                          .slice(0, 5)
                          .map((performer, idx) => (
                            <div key={performer.username} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                                  idx === 0 ? 'bg-amber-500' :
                                  idx === 1 ? 'bg-gray-400' :
                                  idx === 2 ? 'bg-orange-700' :
                                  'bg-gray-300'
                                }`}>
                                  {idx + 1}
                                </div>
                                <span className="font-medium">{performer.displayName}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{performer.total}</div>
                                <div className="text-xs text-muted-foreground">
                                  Avg: {performer.avgTimeHours.toFixed(1)} hrs
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="comparison" className="mt-0">
                <div className="h-[400px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={userComparison}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="displayName" />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                      <Tooltip content={renderRadarTooltip} />
                      <Legend />
                      <Radar 
                        name="Invoices Created" 
                        dataKey="invoicesCreated" 
                        stroke={COLORS[0]} 
                        fill={COLORS[0]} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Invoices Checked" 
                        dataKey="invoicesChecked" 
                        stroke={COLORS[1]} 
                        fill={COLORS[1]} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Invoices Packed" 
                        dataKey="invoicesPacked" 
                        stroke={COLORS[2]} 
                        fill={COLORS[2]} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Invoices Delivered" 
                        dataKey="invoicesDelivered" 
                        stroke={COLORS[3]} 
                        fill={COLORS[3]} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Invoices Billed" 
                        dataKey="invoicesBilled" 
                        stroke={COLORS[4]} 
                        fill={COLORS[4]} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Total Processed" 
                        dataKey="totalProcessed" 
                        stroke={COLORS[5]} 
                        fill={COLORS[5]} 
                        fillOpacity={0.2} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="speed" className="mt-0">
                <div className="h-[400px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={speedMetrics}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="displayName"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{ 
                          value: 'Hours', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip content={renderBarTooltip} />
                      <Legend wrapperStyle={{ bottom: 0 }} />
                      <Bar 
                        name="Generate to Check" 
                        dataKey="generateToCheck" 
                        stackId="a" 
                        fill={COLORS[0]} 
                      />
                      <Bar 
                        name="Check to Pack" 
                        dataKey="checkToPack" 
                        stackId="a" 
                        fill={COLORS[1]} 
                      />
                      <Bar 
                        name="Pack to Delivery" 
                        dataKey="packToDelivery" 
                        stackId="a" 
                        fill={COLORS[2]} 
                      />
                      <Bar 
                        name="Delivery to Bill" 
                        dataKey="deliveryToBill" 
                        stackId="a" 
                        fill={COLORS[3]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
} 