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
import { UserRoundCog } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import useAnalyticsStore from "@/store/useAnalyticsStore";

interface UserPerformanceData {
  username: string;
  fullName: string;
  department: string;
  performance: {
    invoices: number;
    checking: number;
    packing: number;
    delivery: number;
    billing: number;
    overall: number;
  };
}

export function UserPerformance() {
  const { fetchUserPerformanceData } = useAnalyticsStore();
  const [userPerformance, setUserPerformance] = useState<UserPerformanceData[]>([]);
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
        // Use the store function to get data
        const result = await fetchUserPerformanceData(dateRange);
        
        // The API now returns data in the format { users: UserPerformanceData[] }
        if (result && result.users) {
          // Filter by department if needed
          const filteredUsers = selectedDepartment !== "ALL" 
            ? result.users.filter(user => user.department.includes(selectedDepartment))
            : result.users;
            
          setUserPerformance(filteredUsers);
        } else {
          setUserPerformance([]);
        }
      } catch (error) {
        console.error("Failed to fetch user performance data:", error);
        setUserPerformance([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPerformance();
  }, [dateRange, selectedDepartment, fetchUserPerformanceData]);

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
      <CardContent className="px-2 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
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
                  {/* <TableHead className="text-center">Overall Score</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No user performance data available
                    </TableCell>
                  </TableRow>
                ) : (
                  userPerformance.map((user, index) => (
                    <TableRow key={user.username}>
                      <TableCell>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {user.department}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{user.performance.invoices}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.checking}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.packing}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.delivery}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.billing}</TableCell>
                      {/* <TableCell>
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{user.performance.overall}/10</span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${(user.performance.overall / 10) * 100}%`,
                                backgroundColor: user.performance.overall > 7 
                                  ? '#10b981' 
                                  : user.performance.overall > 5 
                                    ? '#f59e0b' 
                                    : '#ef4444'
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 