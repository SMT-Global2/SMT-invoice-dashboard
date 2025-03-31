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
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Boxes, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface InventoryData {
  totalInventoryCount: number;
  checkedInventories: number;
  uncheckedInventories: number;
  voucheredInventories: number;
  pendingVoucherInventories: number;
  inventoryByAgency: {
    agencyCode: string;
    companyName: string;
    count: number;
  }[];
  inventoryTrend: {
    date: string;
    count: number;
  }[];
}

export function InventoryMetrics() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<"overview" | "byAgency" | "trend">("overview");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  useEffect(() => {
    const fetchInventoryData = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange?.from) {
          queryParams.append('from', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
          queryParams.append('to', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        const response = await fetch(`/api/analytics/inventory?${queryParams.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch inventory data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryData();
  }, [dateRange]);

  const COLORS = [
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#ef4444", // Red
  ];

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">
            <span className="font-semibold">{payload[0].value}</span> inventories 
            ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderAgencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{payload[0].payload.companyName || payload[0].payload.agencyCode}</p>
          <p className="text-sm">
            <span className="font-semibold">{payload[0].value}</span> inventories
          </p>
        </div>
      );
    }
    return null;
  };

  const renderTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="font-semibold">{payload[0].value}</span> inventories
          </p>
        </div>
      );
    }
    return null;
  };

  const getStatusData = () => {
    if (!data) return [];
    
    const total = data.totalInventoryCount || 1; // Avoid division by zero
    
    return [
      {
        name: "Voucher Created",
        value: data.voucheredInventories,
        percentage: Math.round((data.voucheredInventories / total) * 100),
        color: COLORS[0]
      },
      {
        name: "Pending Voucher",
        value: data.pendingVoucherInventories,
        percentage: Math.round((data.pendingVoucherInventories / total) * 100),
        color: COLORS[1]
      },
      {
        name: "Checked",
        value: data.checkedInventories - data.voucheredInventories,
        percentage: Math.round(
          ((data.checkedInventories - data.voucheredInventories) / total) * 100
        ),
        color: COLORS[2]
      },
      {
        name: "Unchecked",
        value: data.uncheckedInventories,
        percentage: Math.round((data.uncheckedInventories / total) * 100),
        color: COLORS[3]
      }
    ].filter(item => item.value > 0);
  };

  return (
    <Card className="col-span-1 md:col-span-3">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Inventory Analytics
          </CardTitle>
          <CardDescription>
            Track inventory processing and voucher generation
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange 
            date={dateRange} 
            setDate={setDateRange}
          />
        </div>
      </CardHeader>
      <Tabs value={tab} onValueChange={(value) => setTab(value as any)}>
        <TabsList className="w-full justify-start border-b px-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="byAgency">By Agency</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
        </TabsList>
        <CardContent className="px-2 sm:px-6 h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="h-full mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-medium mb-2">Inventory Status</div>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getStatusData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {getStatusData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={renderCustomTooltip} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-4">
                    <div className="text-lg font-medium">Summary</div>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Inventories</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{data.totalInventoryCount}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Checked</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{data.checkedInventories}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.totalInventoryCount > 0 
                              ? Math.round((data.checkedInventories / data.totalInventoryCount) * 100) 
                              : 0}% of total
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Voucher Created</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{data.voucheredInventories}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.totalInventoryCount > 0 
                              ? Math.round((data.voucheredInventories / data.totalInventoryCount) * 100) 
                              : 0}% of total
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Pending Voucher</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{data.pendingVoucherInventories}</div>
                          <div className="text-xs text-muted-foreground">
                            {data.totalInventoryCount > 0 
                              ? Math.round((data.pendingVoucherInventories / data.totalInventoryCount) * 100) 
                              : 0}% of total
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="byAgency" className="h-full mt-0">
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.inventoryByAgency}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="agencyCode" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip content={renderAgencyTooltip} />
                      <Bar dataKey="count" fill="#8b5cf6">
                        {data.inventoryByAgency.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="trend" className="h-full mt-0">
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.inventoryTrend}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip content={renderTrendTooltip} />
                      <Bar dataKey="count" fill="#8b5cf6" />
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