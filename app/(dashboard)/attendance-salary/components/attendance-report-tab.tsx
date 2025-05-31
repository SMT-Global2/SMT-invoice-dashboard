"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Download, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Define types
type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  type: "FULL_DAY" | "HALF_DAY" | "LATE" | "ABSENT";
  notes?: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
};

type AttendanceSummary = {
  userId: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  total: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
};

export default function AttendanceReportTab({ dateRange }: { dateRange: [Date, Date] }) {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Fetch attendance records and summary for the date range
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!dateRange[0] || !dateRange[1]) return;
      
      setIsLoading(true);
      try {
        const startDate = format(dateRange[0], "yyyy-MM-dd");
        const endDate = format(dateRange[1], "yyyy-MM-dd");
        
        // Fetch attendance records
        const recordsResponse = await fetch(
          `/api/attendance/daily?date=${startDate}&endDate=${endDate}`
        );
        
        if (!recordsResponse.ok) {
          throw new Error(`Failed to fetch attendance records: ${recordsResponse.status}`);
        }
        
        const recordsData = await recordsResponse.json();
        setAttendanceRecords(recordsData);
        
        // Fetch attendance summary
        const summaryResponse = await fetch(
          `/api/attendance/summary?startDate=${startDate}&endDate=${endDate}`
        );
        
        if (!summaryResponse.ok) {
          throw new Error("Failed to fetch attendance summary");
        }
        
        const summaryData = await summaryResponse.json();
        setAttendanceSummary(summaryData);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch attendance data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [dateRange]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Get filtered records for the selected user or all users if none selected
  const filteredRecords = selectedUser 
    ? attendanceRecords.filter(record => record.userId === selectedUser)
    : attendanceRecords;

  // Get user-specific records for detailed view
  const userRecords = (userId: string) => {
    return attendanceRecords.filter(record => record.userId === userId);
  };

  // Get the summary for a specific user
  const getUserSummary = (userId: string) => {
    return attendanceSummary.find(summary => summary.userId === userId);
  };

  // Export attendance data as CSV
  const exportToCSV = () => {
    // Create CSV header
    let csv = "Name,Date,Attendance Type,Notes\n";
    
    // Add data for each record
    attendanceRecords.forEach(record => {
      const userName = `${record.user.firstName} ${record.user.lastName}`;
      const date = format(new Date(record.date), "yyyy-MM-dd");
      const type = record.type;
      const notes = record.notes || "";
      
      csv += `"${userName}","${date}","${type}","${notes}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `attendance_report_${format(dateRange[0], "yyyy-MM-dd")}_to_${format(dateRange[1], "yyyy-MM-dd")}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper function to display attendance type badge
  const getStatusBadge = (type: string) => {
    switch (type) {
      case "FULL_DAY":
        return <Badge className="bg-green-200 text-green-800 hover:bg-green-300 font-medium">Present</Badge>;
      case "LATE":
        return <Badge className="bg-yellow-200 text-yellow-800 hover:bg-yellow-300 font-medium">Late</Badge>;
      case "HALF_DAY":
        return <Badge className="bg-orange-200 text-orange-800 hover:bg-orange-300 font-medium">Half Day</Badge>;
      case "ABSENT":
        return <Badge className="bg-red-200 text-red-800 hover:bg-red-300 font-medium">Absent</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium">Unknown</Badge>;
    }
  };

  // Calculate total attendance counts
  const totalCounts = {
    present: attendanceSummary.reduce((sum, item) => sum + item.present, 0),
    late: attendanceSummary.reduce((sum, item) => sum + item.late, 0),
    halfDay: attendanceSummary.reduce((sum, item) => sum + item.halfDay, 0),
    absent: attendanceSummary.reduce((sum, item) => sum + item.absent, 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{totalCounts.present}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late Days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{totalCounts.late}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Half Days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{totalCounts.halfDay}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-full" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{totalCounts.absent}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2">
          <div>
            <CardTitle>Attendance Report</CardTitle>
            <CardDescription>
              Employee attendance from {format(dateRange[0], "MMMM d, yyyy")} to{" "}
              {format(dateRange[1], "MMMM d, yyyy")}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search employees..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs 
            defaultValue="summary" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary View</TabsTrigger>
                <TabsTrigger value="detail">Detailed Records</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="summary" className="p-0">
              {/* Summary Table */}
              <div className="overflow-x-auto border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 border-r z-10 font-semibold w-64">Employee</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Half Day</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && filteredUsers.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="sticky left-0 bg-white border-r">
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j} className="text-center">
                              <Skeleton className="h-6 w-12 mx-auto" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No employees found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const summary = getUserSummary(user.id);
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="sticky left-0  border-r z-10 font-semibold">
                              {user.firstName} {user.lastName}
                              <div className="text-xs text-muted-foreground">{user.username}</div>
                            </TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                              {summary?.present || 0}
                            </TableCell>
                            <TableCell className="text-center font-medium text-yellow-600">
                              {summary?.late || 0}
                            </TableCell>
                            <TableCell className="text-center font-medium text-orange-600">
                              {summary?.halfDay || 0}
                            </TableCell>
                            <TableCell className="text-center font-medium text-red-600">
                              {summary?.absent || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setActiveTab("detail");
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="detail" className="p-0">
              {/* Detailed Records View */}
              <div className="border-t p-4">
                {selectedUser && (
                  <div className="flex items-center mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                      className="mr-2"
                    >
                      ← All Employees
                    </Button>
                    <h3 className="text-lg font-medium">
                      {users.find(u => u.id === selectedUser)?.firstName}{" "}
                      {users.find(u => u.id === selectedUser)?.lastName}'s Records
                    </h3>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {!selectedUser && <TableHead className="font-semibold">Employee</TableHead>}
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {!selectedUser && (
                              <TableCell>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            )}
                            <TableCell>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={selectedUser ? 3 : 4}
                            className="h-24 text-center"
                          >
                            No attendance records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((record) => (
                            <TableRow key={record.id}>
                              {!selectedUser && (
                                <TableCell className="font-medium">
                                  {record.user.firstName} {record.user.lastName}
                                </TableCell>
                              )}
                              <TableCell>
                                {format(new Date(record.date), "MMMM d, yyyy (EEEE)")}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(record.type)}
                              </TableCell>
                              <TableCell>
                                {record.notes ? (
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                    <span>{record.notes}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-sm">No notes</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 