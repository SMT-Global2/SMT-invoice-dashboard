'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { UserSelector } from '@/components/user-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import moment from 'moment';
import {
  AlertCircle,
  ArrowLeft, 
  ArrowRight, 
  CalendarIcon,
  CheckCircle,
  Clock,
  FileText,
  PlusCircle,
  Save,
  Search,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from "@/components/ui/skeleton";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type Attendance = {
  id: string;
  userId: string;
  date: Date;
  type: 'FULL_DAY' | 'HALF_DAY' | 'LATE' | 'ABSENT';
  notes: string | null;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
};

type BulkAttendanceItem = {
  userId: string;
  type: 'FULL_DAY' | 'HALF_DAY' | 'LATE' | 'ABSENT';
  notes: string;
};

const attendanceTypes = [
  { value: 'FULL_DAY', label: 'Present', color: 'bg-green-100 text-green-800 border-green-500', 
    badgeColor: 'bg-green-500 hover:bg-green-600', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'LATE', label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-500', 
    badgeColor: 'bg-yellow-500 hover:bg-yellow-600', icon: <Clock className="h-4 w-4" /> },
  { value: 'HALF_DAY', label: 'Half Day', color: 'bg-orange-100 text-orange-800 border-orange-500', 
    badgeColor: 'bg-orange-500 hover:bg-orange-600', icon: <div className="h-4 w-4 bg-orange-500 rounded-full" /> },
  { value: 'ABSENT', label: 'Absent', color: 'bg-red-100 text-red-800 border-red-500', 
    badgeColor: 'bg-red-500 hover:bg-red-600', icon: <X className="h-4 w-4" /> },
];

export default function AttendancePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('FULL_DAY');
  const [notes, setNotes] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  
  // For monthly view
  const [selectedMonthYear, setSelectedMonthYear] = useState<Date>(new Date());
  const [monthlyAttendance, setMonthlyAttendance] = useState<Attendance[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // For bulk attendance marking
  const [bulkAttendanceData, setBulkAttendanceData] = useState<BulkAttendanceItem[]>([]);
  const [defaultAttendanceType, setDefaultAttendanceType] = useState<string>('FULL_DAY');
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [filteredBulkUsers, setFilteredBulkUsers] = useState<User[]>([]);

  // For note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [noteText, setNoteText] = useState('');

  // For bulk actions
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string>('FULL_DAY');

  // Summary counts
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
  });

  // Add loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);

  // Fetch users and attendance records for today
  useEffect(() => {
    fetchUsers();
    fetchDailyAttendance(selectedDate);
  }, [selectedDate]);

  // Fetch monthly attendance data when month changes
  useEffect(() => {
    fetchMonthlyAttendance(selectedMonthYear);
  }, [selectedMonthYear]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(user => 
        user.firstName.toLowerCase().includes(query) || 
        user.lastName.toLowerCase().includes(query) || 
        user.username.toLowerCase().includes(query)
      ));
    }
  }, [searchQuery, users]);

  // Filter users for bulk attendance view
  useEffect(() => {
    if (bulkSearchQuery.trim() === '') {
      setFilteredBulkUsers(users);
    } else {
      const query = bulkSearchQuery.toLowerCase();
      setFilteredBulkUsers(users.filter(user => 
        user.firstName.toLowerCase().includes(query) || 
        user.lastName.toLowerCase().includes(query) || 
        user.username.toLowerCase().includes(query)
      ));
    }
  }, [bulkSearchQuery, users]);

  // Initialize bulk attendance data when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      initializeBulkAttendanceData();
    }
  }, [users, attendanceRecords, defaultAttendanceType]);

  // Update summary counts whenever attendance records change
  useEffect(() => {
    updateSummary();
  }, [attendanceRecords]);

  function initializeBulkAttendanceData() {
    // Create an entry for each user with the default attendance type
    const bulkData = users.map(user => {
      // Check if user already has attendance record for the selected date
      const existingRecord = attendanceRecords.find(record => record.userId === user.id);
      
      return {
        userId: user.id,
        type: existingRecord ? existingRecord.type : defaultAttendanceType as 'FULL_DAY' | 'HALF_DAY' | 'LATE' | 'ABSENT',
        notes: existingRecord?.notes || '',
      };
    });
    
    setBulkAttendanceData(bulkData);
  }

  async function fetchUsers() {
    setIsUsersLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/user/list?date=${formattedDate}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
        setFilteredBulkUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    } finally {
      setIsUsersLoading(false);
      setIsLoading(false);
    }
  }

  async function fetchDailyAttendance(date: Date) {
    setIsAttendanceLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/attendance/daily?date=${formattedDate}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
        
        // Update bulk attendance data if it exists
        if (bulkAttendanceData.length > 0) {
          initializeBulkAttendanceData();
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch attendance records",
      });
    } finally {
      setIsAttendanceLoading(false);
      setIsLoading(false);
    }
  }

  async function fetchMonthlyAttendance(date: Date) {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      const response = await fetch(`/api/attendance/monthly?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyAttendance(data);
      }
    } catch (error) {
      console.error('Failed to fetch monthly attendance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch monthly attendance data",
      });
    }
  }

  function updateSummary() {
    const counts = {
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
    };

    attendanceRecords.forEach(record => {
      switch (record.type) {
        case 'FULL_DAY':
          counts.present++;
          break;
        case 'LATE':
          counts.late++;
          break;
        case 'HALF_DAY':
          counts.halfDay++;
          break;
        case 'ABSENT':
          counts.absent++;
          break;
      }
    });

    setSummary(counts);
  }
  
  function openNoteDialog(userId: string) {
    const existingRecord = attendanceRecords.find(record => record.userId === userId);
    setCurrentUserId(userId);
    setNoteText(existingRecord?.notes || '');
    setNoteDialogOpen(true);
  }

  async function handleNoteSave() {
    const existingRecord = attendanceRecords.find(record => record.userId === currentUserId);
    
    if (existingRecord) {
      // If record exists, update it with the same type but new notes
      await markAttendance(currentUserId, existingRecord.type, noteText);
    } else {
      // If no record exists, create one with default "Present" type
      await markAttendance(currentUserId, 'FULL_DAY', noteText);
    }
    
    setNoteDialogOpen(false);
  }

  function getUserAttendance(userId: string) {
    return attendanceRecords.find(record => record.userId === userId);
  }

  function getStatusBadge(type: string | undefined) {
    const attendanceType = attendanceTypes.find(t => t.value === type);
    if (!attendanceType) return null;
    
    return (
      <Badge className={`px-3 py-1 font-medium ${attendanceType.color}`}>
        {attendanceType.label}
      </Badge>
    );
  }

  // Add function to check if date is editable
  function isDateEditable(date: Date, userType: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Block future dates for everyone
    if (checkDate > today) {
      return false;
    }
    
    // Admin can edit any past or present date
    if (userType === 'ADMIN') {
      return true;
    }
    
    // Regular users can only edit T, T-1, and T-2 days
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    
    return checkDate >= twoDaysAgo;
  }

  async function handleBulkAction() {
    try {
      setIsSubmitting(true);
      
      // Create promises for each user
      const promises = filteredUsers.map(user => 
        fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            date: selectedDate,
            type: bulkActionType,
            notes: null,
          }),
        })
      );
      
      // Execute all promises in parallel
      const results = await Promise.allSettled(promises);
      
      // Count successes and failures
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failureCount = results.filter(result => result.status === 'rejected').length;
      
      if (failureCount === 0) {
        // Update local state directly for successful bulk actions
        const newAttendanceRecords = filteredUsers.map(user => ({
          id: `temp-${Date.now()}-${user.id}`,
          userId: user.id,
          date: selectedDate,
          type: bulkActionType as 'FULL_DAY' | 'HALF_DAY' | 'LATE' | 'ABSENT',
          notes: null,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          }
        }));

        setAttendanceRecords(prevRecords => {
          // Remove existing records for these users
          const filtered = prevRecords.filter(record => 
            !filteredUsers.some(user => user.id === record.userId)
          );
          // Add new records
          return [...filtered, ...newAttendanceRecords];
        });

        toast({
          title: "Success",
          description: `Attendance marked for ${successCount} employees`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: `Marked ${successCount} employees successfully, ${failureCount} failed`,
        });
      }
      
      setBulkDialogOpen(false);
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process bulk action",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markAttendance(userId: string, type: 'FULL_DAY' | 'HALF_DAY' | 'LATE' | 'ABSENT', notes: string | null = null) {
    try {
      setIsSubmitting(true);
      
      // Format the date as ISO string to ensure consistency across API calls
      //  I want the date that is in india time zone
      // const formattedDate = new Date(selectedDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }));

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      const existingRecord = attendanceRecords.find(record => record.userId === userId);
      
      console.log('Marking attendance:', {
        userId,
        date: formattedDate,
        type,
        notes,
        existingRecord: existingRecord ? existingRecord.id : 'none'
      });
      
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          date: formattedDate,
          type,
          notes,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local state directly instead of refetching
        const newAttendanceRecord = {
          id: data.id || existingRecord?.id || `temp-${Date.now()}`,
          userId,
          date: selectedDate,
          type,
          notes,
          user: users.find(u => u.id === userId) || { firstName: '', lastName: '', username: '' }
        };

        setAttendanceRecords(prevRecords => {
          const filtered = prevRecords.filter(record => record.userId !== userId);
          return [...filtered, newAttendanceRecord];
        });

        toast({
          title: "Success",
          description: `Attendance marked as ${attendanceTypes.find(t => t.value === type)?.label}`,
        });
      } else {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark attendance",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAttendance(attendanceId: string) {
    try {
      const response = await fetch(`/api/attendance`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceId: attendanceId,
        }),
      });
      if (response.ok) {
        // Update local state directly instead of refetching
        setAttendanceRecords(prevRecords => 
          prevRecords.filter(record => record.id !== attendanceId)
        );
        
        toast({
          title: "Success",
          description: "Attendance deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete attendance",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Heading and Controls at the Top */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col w-full items-center justify-center">
          <h1 className="text-2xl font-bold text-center">Employee Attendance Dashboard</h1>
          <p className="text-muted-foreground text-center">Efficiently manage attendance for all employees</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
          <div className="relative w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search employees..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-row items-center gap-2 ml-auto">
            <Button 
              onClick={() => setBulkDialogOpen(true)}
              variant="default"
              disabled={!isDateEditable(selectedDate, session?.user?.type || '') || isLoading}
            >
              Bulk Actions
              {!isDateEditable(selectedDate, session?.user?.type || '') && (
                <span className="ml-2 text-xs">(Date not editable)</span>
              )}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(selectedDate, 'MMM dd, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  modifiers={{
                    disabled: (date) => {
                      // Disable future dates for everyone
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date > today;
                    }
                  }}
                  classNames={{
                    day_disabled: "text-gray-300 cursor-not-allowed opacity-50",
                    day_today: "bg-blue-100 font-bold text-blue-900",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Attendance Summary Cards below controls */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading && filteredUsers.length === 0 ? (
          // Loading skeletons for summary cards
          Array(4).fill(0).map((_, index) => (
            <Card key={`summary-skeleton-${index}`} className="border">
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <Skeleton className="h-12 w-12 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border border-green-200">
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="text-4xl font-bold text-green-600">{summary.present}</div>
                <div className="text-base font-medium text-green-700">Present</div>
              </CardContent>
            </Card>
            <Card className="border border-yellow-200">
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="text-4xl font-bold text-yellow-600">{summary.late}</div>
                <div className="text-base font-medium text-yellow-700">Late</div>
              </CardContent>
            </Card>
            <Card className="border border-orange-200">
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="text-4xl font-bold text-orange-600">{summary.halfDay}</div>
                <div className="text-base font-medium text-orange-700">Half Day</div>
              </CardContent>
            </Card>
            <Card className="border border-red-200">
              <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                <div className="text-4xl font-bold text-red-600">{summary.absent}</div>
                <div className="text-base font-medium text-red-700">Absent</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Attendance Table */}
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredUsers.length === 0 ? (
              // Loading skeletons for the table
              Array(5).fill(0).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-3 w-[120px]" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Skeleton className="h-8 w-[70px]" />
                      <Skeleton className="h-8 w-[60px]" />
                      <Skeleton className="h-8 w-[80px]" />
                      <Skeleton className="h-8 w-[70px]" />
                      <Skeleton className="h-8 w-[50px]" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const attendance = getUserAttendance(user.id);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                      <div className="text-sm text-muted-foreground">
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAttendanceLoading ? (
                        <Skeleton className="h-6 w-[80px]" />
                      ) : attendance ? (
                        getStatusBadge(attendance.type)
                      ) : (
                        <span className="text-muted-foreground">Not marked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAttendanceLoading ? (
                        <Skeleton className="h-4 w-[120px]" />
                      ) : (
                        attendance?.notes ? attendance.notes : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {isAttendanceLoading ? (
                        <div className="flex space-x-1">
                          <Skeleton className="h-8 w-[70px]" />
                          <Skeleton className="h-8 w-[60px]" />
                          <Skeleton className="h-8 w-[80px]" />
                          <Skeleton className="h-8 w-[70px]" />
                          <Skeleton className="h-8 w-[50px]" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* Present button */}
                          <Button
                            variant={attendance?.type === 'FULL_DAY' ? "default" : "ghost"}
                            size="sm"
                            className={`px-2 ${attendance?.type === 'FULL_DAY' ? 'bg-green-500 hover:bg-green-600 text-white font-medium' : ''}`}
                            onClick={() => markAttendance(user.id, 'FULL_DAY', attendance?.notes || null)}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            <div className="h-2 w-2 rounded-full bg-green-300 mr-1"></div>
                            Present
                          </Button>
                          
                          {/* Late button */}
                          <Button
                            variant={attendance?.type === 'LATE' ? "default" : "ghost"}
                            size="sm"
                            className={`px-2 ${attendance?.type === 'LATE' ? 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium' : ''}`}
                            onClick={() => markAttendance(user.id, 'LATE', attendance?.notes || null)}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            <div className="h-2 w-2 rounded-full bg-yellow-300 mr-1"></div>
                            Late
                          </Button>
                          
                          {/* Half Day button */}
                          <Button
                            variant={attendance?.type === 'HALF_DAY' ? "default" : "ghost"}
                            size="sm"
                            className={`px-2 ${attendance?.type === 'HALF_DAY' ? 'bg-orange-500 hover:bg-orange-600 text-white font-medium' : ''}`}
                            onClick={() => markAttendance(user.id, 'HALF_DAY', attendance?.notes || null)}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            <div className="h-2 w-2 rounded-full bg-orange-300 mr-1"></div>
                            Half Day
                          </Button>
                          
                          {/* Absent button */}
                          <Button
                            variant={attendance?.type === 'ABSENT' ? "default" : "ghost"}
                            size="sm"
                            className={`px-2 ${attendance?.type === 'ABSENT' ? 'bg-red-500 hover:bg-red-600 text-white font-medium' : ''}`}
                            onClick={() => markAttendance(user.id, 'ABSENT', attendance?.notes || null)}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            <div className="h-2 w-2 rounded-full bg-red-300 mr-1"></div>
                            Absent
                          </Button>

                          {/* Note button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openNoteDialog(user.id)}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            Note
                          </Button>

                          {/* Delete button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAttendance(attendance?.id || '')}
                            disabled={isSubmitting || !isDateEditable(selectedDate, session?.user?.type || '')}
                          >
                            Remove 
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Notes Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note for this attendance record
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note here..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleNoteSave}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Attendance Action</DialogTitle>
            <DialogDescription>
              Mark attendance for all {filteredUsers.length} employees
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkType">Attendance Status</Label>
              <Select value={bulkActionType} onValueChange={setBulkActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attendance type" />
                </SelectTrigger>
                <SelectContent>
                  {attendanceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will mark all employees as {attendanceTypes.find(t => t.value === bulkActionType)?.label} for {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAction} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Apply to All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 