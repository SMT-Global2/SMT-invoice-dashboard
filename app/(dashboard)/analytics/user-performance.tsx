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
import { Input } from "@/components/ui/input";

// Define sort options
type SortOption = 
  | 'totalDesc' 
  | 'totalAsc' 

interface UserPerformanceData {
  username: string;
  fullName: string;
  department: string[];
  performance: {
    invoices: number;
    checking: number;
    packing: number;
    delivery: number;
    billing: number;
    receipts: number;
    invChecks: number;
    invVouchers: number;
    dmCollects: number;
    dmChecks: number;
    expUploads: number;
    expCreditNotes: number;
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
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>('totalDesc'); // State for sorting

  // Helper function to calculate total activity
  const calculateTotalActivity = (performance: UserPerformanceData['performance']): number => {
    return Object.values(performance)
      .filter(value => typeof value === 'number' && !isNaN(value))
      .reduce((sum, value) => sum + value, 0);
  };

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

          // Further filter by user search term
          const searchedUsers = userSearchTerm.trim() === ""
            ? filteredUsers
            : filteredUsers.filter(user => 
                user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
              );
            
          // Sort the users based on the selected sort option
          const sortedUsers = [...searchedUsers].sort((a, b) => {
            switch (sortOption) {
              case 'totalDesc':
                return calculateTotalActivity(b.performance) - calculateTotalActivity(a.performance);
              case 'totalAsc':
                return calculateTotalActivity(a.performance) - calculateTotalActivity(b.performance);
              default:
                return 0;
            }
          });

          setUserPerformance(sortedUsers); // Set the final sorted and filtered list
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
  }, [dateRange, selectedDepartment, fetchUserPerformanceData, userSearchTerm, sortOption]); // Add sortOption dependency

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
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-center">
          <Input 
            type="text"
            placeholder="Search user..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="w-[200px]"
          />
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
              <SelectItem value="DELIVERY_MEMO_MANAGEMENT">Delivery Memo Management</SelectItem>
              <SelectItem value="ALL_ROUNDER">All-rounders</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalDesc">Highest Activity</SelectItem>
              <SelectItem value="totalAsc">Lowest Activity</SelectItem>
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
          <div className="rounded-md border my-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">User</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Invoices Created</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Invoices Checked</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Invoices Packed</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Invoices Delivered</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Invoices Billed</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Receipts Created</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Inventories Checked</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Inventories Vouchered</TableHead>
                  <TableHead className="text-center whitespace-nowrap">DMs Collected</TableHead>
                  <TableHead className="text-center whitespace-nowrap">DMs Checked</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Expiries Uploaded</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Expiry Credit Notes</TableHead>
                  {/* <TableHead className="text-center">Overall Score</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      No user performance data available
                    </TableCell>
                  </TableRow>
                ) : (
                  userPerformance.map((user, index) => (
                    <TableRow key={user.username}>
                      <TableCell className="sticky left-0 bg-card z-5 min-w-[180px]">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(user.department) && user.department.length > 0 ? (
                            user.department.map((dept, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="text-[10px] px-1 py-0"
                              >
                                {dept} 
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">N/A</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{user.performance.invoices}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.checking}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.packing}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.delivery}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.billing}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.receipts}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.invChecks}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.invVouchers}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.dmCollects}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.dmChecks}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.expUploads}</TableCell>
                      <TableCell className="text-center font-medium">{user.performance.expCreditNotes}</TableCell>
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