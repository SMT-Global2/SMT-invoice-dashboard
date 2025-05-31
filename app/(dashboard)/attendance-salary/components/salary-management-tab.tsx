'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PencilIcon, CalendarIcon, XCircle, InfoIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  type: "ADMIN" | "EMPLOYEE";
};

type SalarySetting = {
  id: string;
  userId: string;
  baseSalary: number;
  allowances: number;
  taxes: number;
  active: boolean;
  lateDeductionRate: number;
  halfDayDeductionRate: number;
  absentDeductionRate: number;
  salaryDate?: number; // Day of month for salary payment
};

type AttendanceCounts = {
  userId: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  total: number;
};

type Loan = {
  id: string;
  userId: string;
  amount: number;
  remainingAmount: number;
  monthlyDeduction: number;
  reason: string;
  issueDate: string;
  active: boolean;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
};

type SalaryData = {
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
  baseSalary: number;
  allowances: number;
  taxes: number;
  deductions: number;
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  lateDeductionRate: number;
  halfDayDeductionRate: number;
  absentDeductionRate: number;
  lateDeduction: number;
  halfDayDeduction: number;
  absentDeduction: number;
  loanDeduction: number;
  bonusPenalty: number;
  netSalary: number;
  month: string;
  isPaid: boolean;
  salaryDate: number;
};

type SalaryPayment = {
  id: string;
  userId: string;
  month: number;
  year: number;
  baseSalary: number;
  totalDeductions: number;
  deductions?: number;
  netSalary: number;
  lateDeduction: number;
  halfDayDeduction: number;
  absentDeduction: number;
  loanDeduction: number;
  bonusPenalty: number;
  totalPaid: number;
  period?: string; // Old version used period, new version uses month/year
  paymentDate: string;
  notes: string; // Changed from note to notes
  createdAt: string;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
};

// Add this new type for loan payment history
type LoanPaymentHistory = {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  paymentDate: string;
  salaryPaymentId: string;
  notes: string;
};

// Add this helper function before the SalaryManagementTab component
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

// Helper function to convert month number to month name
function getMonthName(monthNum: number): string {
  const months = [
    'January', 'February', 'March', 'April', 
    'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'
  ];
  // Adjust for 0-based vs 1-based indexing
  return months[(monthNum - 1) % 12];
}

function getFormattedDateRange(month: number, year: number, paymentDate?: string, currentDateRange?: [Date, Date]): string {
  try {
    // If there's a specific payment date, extract the month and year
    const dateObj = paymentDate ? new Date(paymentDate) : null;
    const actualMonth = dateObj ? dateObj.getMonth() + 1 : month;
    const actualYear = dateObj ? dateObj.getFullYear() : year;
    
    // Use the provided dateRange if available
    if (currentDateRange && currentDateRange.length === 2) {
      return `${format(currentDateRange[0], "d MMMM yyyy")} to ${format(currentDateRange[1], "d MMMM yyyy")}`;
    }
    
    // Fallback to month/year based dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return `${format(startDate, "d MMMM yyyy")} to ${format(endDate, "d MMMM yyyy")}`;
  } catch (error) {
    console.error("Error formatting date range:", error);
    return `${month}/${year}`;
  }
}

export default function SalaryManagementTab({ dateRange }: { dateRange: [Date, Date] }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [salarySettings, setSalarySettings] = useState<SalarySetting[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<AttendanceCounts[]>([]);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSalaryData, setFilteredSalaryData] = useState<SalaryData[]>([]);
  
  // Dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<SalaryData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<SalaryPayment[]>([]);
  const [paymentNote, setPaymentNote] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    baseSalary: 0,
    lateDeductionRate: 0,
    halfDayDeductionRate: 0,
    absentDeductionRate: 0,
    salaryDate: 1, // Default to 1st of the month
    bonusPenalty: 0
  });
  
  // First, add a string state for raw input values to handle negative numbers better
  const [rawInputs, setRawInputs] = useState({
    baseSalary: '',
    lateDeductionRate: '',
    halfDayDeductionRate: '',
    absentDeductionRate: '',
    bonusPenalty: ''
  });
  
  // Summary data
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    totalSalaryAmount: 0,
    averageSalary: 0,
    pendingSalaries: 0,
  });

  // Add deletePaymentDialogOpen state
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<SalaryPayment | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add new state for loan payment history and loan history dialog
  const [loanPaymentHistory, setLoanPaymentHistory] = useState<LoanPaymentHistory[]>([]);
  const [loanHistoryDialogOpen, setLoanHistoryDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Fetch attendance counts function
  async function fetchAttendanceCounts() {
    try {
      const startDate = format(dateRange[0], "yyyy-MM-dd");
      const endDate = format(dateRange[1], "yyyy-MM-dd");
      
      const response = await fetch(
        `/api/attendance/summary?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch attendance counts");
      }
      
      const data = await response.json();
      setAttendanceCounts(data);
      return data;
    } catch (error) {
      console.error("Error fetching attendance counts:", error);
      return [];
    }
  }

  // Fetch data when component mounts
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchUsers(),
      fetchSalarySettings(),
      fetchAttendanceCounts(),
      fetchActiveLoans()
    ])
      .then(([users, settings, attendance, loans]) => {
        // Create data with manually saved settings, actual attendance counts, and loan data
        const salaryData = createSalaryData(users, settings, attendance, loans);
        setSalaryData(salaryData);
        setFilteredSalaryData(salaryData);
        calculateSummary(salaryData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching initial data:", error);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load employee data"
        });
      });
  }, [dateRange]);
  
  // Apply search filtering
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSalaryData(salaryData);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSalaryData(
        salaryData.filter(
          (data) =>
            data.user.firstName.toLowerCase().includes(query) ||
            data.user.lastName.toLowerCase().includes(query) ||
            data.user.username.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, salaryData]);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async function fetchSalarySettings() {
    try {
      console.log('Fetching salary settings...');
      const response = await fetch('/api/salary/settings');
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "You must be logged in to view salary settings."
        });
        return [];
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(`Failed to fetch salary settings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched salary settings (raw):', JSON.stringify(data));
      
      // Ensure we always have an array, even if the API returns a single object or null
      const settingsArray = Array.isArray(data) ? data : (data ? [data] : []);
      
      // Ensure all objects have the required properties
      const validatedSettings = settingsArray.map(setting => {
        console.log('Processing setting:', setting);
        console.log('Salary date from API:', setting.salaryDate, 'type:', typeof setting.salaryDate);
        
        return {
          id: setting.id || setting._id || '',
          userId: setting.userId || '',
          baseSalary: typeof setting.baseSalary === 'number' ? setting.baseSalary : 0,
          allowances: typeof setting.allowances === 'number' ? setting.allowances : 0,
          taxes: typeof setting.taxes === 'number' ? setting.taxes : 0,
          active: !!setting.active,
          lateDeductionRate: typeof setting.lateDeductionRate === 'number' ? setting.lateDeductionRate : 0,
          halfDayDeductionRate: typeof setting.halfDayDeductionRate === 'number' ? setting.halfDayDeductionRate : 0,
          absentDeductionRate: typeof setting.absentDeductionRate === 'number' ? setting.absentDeductionRate : 0,
          salaryDate: typeof setting.salaryDate === 'number' ? setting.salaryDate : 
                      (setting.salaryDate ? parseInt(String(setting.salaryDate), 10) || 1 : 1),
        };
      });
      
      console.log('Validated settings:', validatedSettings);
      setSalarySettings(validatedSettings);
      return validatedSettings;
    } catch (error) {
      console.error('Error fetching salary settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch salary settings. Using default values instead."
      });
      return [];
    }
  }

  async function fetchActiveLoans() {
    try {
      const response = await fetch('/api/salary/loans?activeOnly=true');
      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }
      const data = await response.json();
      setActiveLoans(data);
      console.log('Fetched active loans:', data);
      return data;
    } catch (error) {
      console.error('Error fetching active loans:', error);
      return [];
    }
  }

  function createSalaryData(
    users: User[], 
    settings: SalarySetting[], 
    attendanceData: AttendanceCounts[],
    loans: Loan[]
  ) {
    if (!users || users.length === 0) {
      // If no users, create a sample user with default values
      return [{
        userId: "1",
        user: {
          firstName: "Admin",
          lastName: "Admin",
          username: "admin"
        },
        baseSalary: 10000,
        allowances: 0,
        taxes: 0,
        deductions: 0,
        totalWorkingDays: 30,
        presentDays: 25,
        lateDays: 2,
        halfDays: 0,
        absentDays: 3,
        lateDeductionRate: 0,
        halfDayDeductionRate: 0,
        absentDeductionRate: 0,
        lateDeduction: 0,
        halfDayDeduction: 0,
        absentDeduction: 0,
        loanDeduction: 0,
        bonusPenalty: 0,
        netSalary: 10000,
        month: format(dateRange[0], "MMMM yyyy"),
        isPaid: false,
        salaryDate: 1
      }];
    }

    // Create an attendance map for quick lookup
    const attendanceMap = new Map();
    attendanceData.forEach(record => {
      attendanceMap.set(record.userId, record);
    });
    
    // Create a settings map for quick lookup
    const settingsMap = new Map();
    settings.forEach(setting => {
      settingsMap.set(setting.userId, setting);
    });

    // Create a loans map for quick lookup
    const loansMap = new Map();
    loans.forEach(loan => {
      if (loansMap.has(loan.userId)) {
        const existingLoan = loansMap.get(loan.userId);
        // Sum up all monthly deductions for this user
        loansMap.set(loan.userId, {
          ...existingLoan,
          monthlyDeduction: existingLoan.monthlyDeduction + loan.monthlyDeduction
        });
      } else {
        loansMap.set(loan.userId, loan);
      }
    });

    // For each user, create salary data with actual attendance counts, saved settings, and loan data
    return users.map((user: User) => {
      // Get settings for this user from the saved data
      const userSettings = settingsMap.get(user.id);
      
      // Use saved settings if available, otherwise default to basic values
      const baseSalary = userSettings ? userSettings.baseSalary : 10000;
      const lateDeductionRate = userSettings ? userSettings.lateDeductionRate : 0;
      const halfDayDeductionRate = userSettings ? userSettings.halfDayDeductionRate : 0;
      const absentDeductionRate = userSettings ? userSettings.absentDeductionRate : 0;
      const userSalaryDate = userSettings && userSettings.salaryDate ? parseInt(String(userSettings.salaryDate), 10) : 1; // Ensure it's a number
      console.log(`User ${user.firstName}: salaryDate from settings = ${userSettings?.salaryDate}, parsed = ${userSalaryDate}`);
      
      // Get attendance counts for this user from the actual data
      const attendance = attendanceMap.get(user.id);
      
      // Use actual attendance data if available, otherwise default to 0
      const lateDays = attendance ? attendance.late : 0;
      const halfDays = attendance ? attendance.halfDay : 0;
      const absentDays = attendance ? attendance.absent : 0;
      const presentDays = attendance ? attendance.present : 30;
      
      // Calculate deductions based on rates and days
      const lateDeduction = lateDeductionRate * lateDays;
      const halfDayDeduction = halfDayDeductionRate * halfDays;
      const absentDeduction = absentDeductionRate * absentDays;
      
      // Get loan deduction for this user
      const userLoan = loansMap.get(user.id);
      const loanDeduction = userLoan ? userLoan.monthlyDeduction : 0;
      
      // Default bonusPenalty to 0
      const bonusPenalty = 0;
      
      // Net salary calculation including loan deduction and bonus/penalty
      const netSalary = baseSalary - lateDeduction - halfDayDeduction - absentDeduction - loanDeduction + bonusPenalty;
      
      return {
        userId: user.id,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username || ""
        },
        baseSalary: baseSalary,
        allowances: 0,
        taxes: 0,
        deductions: 0,
        totalWorkingDays: presentDays + lateDays + halfDays + absentDays,
        presentDays: presentDays,
        lateDays: lateDays,
        halfDays: halfDays,
        absentDays: absentDays,
        lateDeductionRate: lateDeductionRate,
        halfDayDeductionRate: halfDayDeductionRate,
        absentDeductionRate: absentDeductionRate,
        lateDeduction: lateDeduction,
        halfDayDeduction: halfDayDeduction,
        absentDeduction: absentDeduction,
        loanDeduction: loanDeduction,
        bonusPenalty: bonusPenalty,
        netSalary: netSalary,
        month: format(dateRange[0], "MMMM yyyy"),
        isPaid: false,
        salaryDate: userSalaryDate
      };
    });
  }

  function calculateSummary(data: SalaryData[]) {
    let totalEmployees = 0;
    let totalBaseSalaryAmount = 0;
    let totalDeductions = 0;
    let totalPayableSalaryAmount = 0;
    
    data.forEach(item => {
      totalEmployees++;
      totalBaseSalaryAmount += item.baseSalary;
      const itemDeductions = item.lateDeduction + item.halfDayDeduction + item.absentDeduction;
      totalDeductions += itemDeductions;
      totalPayableSalaryAmount += (item.baseSalary - itemDeductions);
    });
    
    setSummaryData({
      totalEmployees,
      totalSalaryAmount: totalBaseSalaryAmount,
      averageSalary: totalDeductions, // Repurposing this field for total saved
      pendingSalaries: totalPayableSalaryAmount
    });
  }

  function handleSalaryDisbursement(employee: SalaryData) {
    setSelectedEmployee(employee);
    setPaymentNote('');
    setConfirmDialogOpen(true);
  }
  
  function handleEditSalary(employee: SalaryData) {
    setSelectedEmployee(employee);
    setEditForm({
      baseSalary: employee.baseSalary,
      lateDeductionRate: employee.lateDeductionRate,
      halfDayDeductionRate: employee.halfDayDeductionRate,
      absentDeductionRate: employee.absentDeductionRate,
      salaryDate: employee.salaryDate || 1,
      bonusPenalty: employee.bonusPenalty
    });
    setEditDialogOpen(true);
  }
  
  function calculateDeductions(form: typeof editForm, employee: SalaryData) {
    // Calculate deductions based on rates and days
    const lateDeduction = form.lateDeductionRate * employee.lateDays;
    const halfDayDeduction = form.halfDayDeductionRate * employee.halfDays;
    const absentDeduction = form.absentDeductionRate * employee.absentDays;
    
    // Total deduction excludes bonus/penalty (which can be positive or negative)
    const totalDeduction = lateDeduction + halfDayDeduction + absentDeduction + employee.loanDeduction;
    
    // Total payable includes bonus/penalty (added or subtracted based on sign)
    const totalPayable = form.baseSalary - lateDeduction - halfDayDeduction - 
                        absentDeduction - employee.loanDeduction + form.bonusPenalty;
    
    return {
      lateDeduction,
      halfDayDeduction,
      absentDeduction,
      bonusPenalty: form.bonusPenalty,
      totalDeduction,
      totalPayable
    };
  }
  
  async function saveSalarySettings(userId: string, form: typeof editForm) {
    try {
      const salaryDateValue = parseInt(form.salaryDate.toString(), 10);
      console.log('Saving salary settings for user:', userId);
      console.log('Salary date being saved:', salaryDateValue, typeof salaryDateValue);
      
      // Get employee name from the selected employee
      let firstName = '';
      let lastName = '';
      
      if (selectedEmployee) {
        firstName = selectedEmployee.user.firstName;
        lastName = selectedEmployee.user.lastName;
      } else {
        // Find the user in the users array
        const user = users.find(user => user.id === userId);
        if (user) {
          firstName = user.firstName;
          lastName = user.lastName;
        }
      }
      
      const payload = {
        userId,
        baseSalary: form.baseSalary,
        lateDeductionRate: form.lateDeductionRate,
        halfDayDeductionRate: form.halfDayDeductionRate,
        absentDeductionRate: form.absentDeductionRate,
        salaryDate: salaryDateValue,
        bonusPenalty: form.bonusPenalty,
        firstName,
        lastName
      };
      
      console.log('Payload:', JSON.stringify(payload));
      
      const response = await fetch('/api/salary/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save salary settings');
      }
      
      const result = await response.json();
      console.log('Saved salary settings response:', result);
      return result;
    } catch (error) {
      console.error('Error saving salary settings:', error);
      throw error;
    }
  }
  
  async function saveEditedSalary() {
    if (!selectedEmployee) return;
    
    try {
      // Calculate deductions based on the rates and days
      const deductions = calculateDeductions(editForm, selectedEmployee);
      
      // Save to database
      await saveSalarySettings(selectedEmployee.userId, editForm);
      
      // Update local state
      const updatedSalaryData = salaryData.map(item => 
        item.userId === selectedEmployee.userId 
          ? { 
              ...item, 
              baseSalary: editForm.baseSalary,
              lateDeductionRate: editForm.lateDeductionRate,
              halfDayDeductionRate: editForm.halfDayDeductionRate,
              absentDeductionRate: editForm.absentDeductionRate,
              salaryDate: editForm.salaryDate,
              bonusPenalty: editForm.bonusPenalty,
              lateDeduction: deductions.lateDeduction,
              halfDayDeduction: deductions.halfDayDeduction,
              absentDeduction: deductions.absentDeduction,
              netSalary: deductions.totalPayable
            } 
          : item
      );
      
      setSalaryData(updatedSalaryData);
      setFilteredSalaryData(
        searchQuery.trim() === '' 
          ? updatedSalaryData 
          : updatedSalaryData.filter(data => 
              data.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              data.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              data.user.username.toLowerCase().includes(searchQuery.toLowerCase())
            )
      );
      
      calculateSummary(updatedSalaryData);
      
      toast({
        title: 'Success',
        description: `Salary details updated for ${selectedEmployee.user.firstName} ${selectedEmployee.user.lastName}`,
      });
    } catch (error) {
      console.error('Error saving salary settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save salary settings"
      });
    } finally {
      setEditDialogOpen(false);
    }
  }

  function handleViewHistory(employee: SalaryData) {
    setSelectedEmployee(employee);
    fetchSalaryHistory(employee.userId);
    setHistoryDialogOpen(true);
  }

  async function fetchSalaryHistory(userId: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/salary/payments?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payment history: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If we have payment history, fetch the corresponding attendance data for those periods
      if (data && data.length > 0) {
        console.log('Received payment history:', data);
        
        // Process the payments to ensure counts are displayed correctly
        const processedPayments = data.map((payment: SalaryPayment) => {
          // Ensure attendance counts are properly displayed
          return {
            ...payment,
            // Ensure these are numbers and not null/undefined
            lateCount: typeof payment.lateCount === 'number' ? payment.lateCount : 0,
            halfDayCount: typeof payment.halfDayCount === 'number' ? payment.halfDayCount : 0,
            absentCount: typeof payment.absentCount === 'number' ? payment.absentCount : 0,
          };
        });
        
        setPaymentHistory(processedPayments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching salary history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment history"
      });
      setPaymentHistory([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Add this function to fetch loan payment history
  async function fetchLoanPaymentHistory(loanId: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/salary/loan-payments?loanId=${loanId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch loan payment history: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLoanPaymentHistory(data);
    } catch (error) {
      console.error('Error fetching loan payment history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load loan payment history"
      });
      setLoanPaymentHistory([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Modify the confirmSalaryPayment function to record loan payment history
  async function confirmSalaryPayment() {
    if (!selectedEmployee) return;
    
    try {
      // First, update any active loans for this user
      if (selectedEmployee.loanDeduction > 0) {
        // Get the active loans for this user
        const userLoans = activeLoans.filter(loan => loan.userId === selectedEmployee.userId);
        
        // Update each loan's remaining amount
        for (const loan of userLoans) {
          // Calculate how much to deduct from this loan
          let deductionAmount = Math.min(loan.monthlyDeduction, selectedEmployee.loanDeduction);
          
          // Ensure we don't deduct more than the remaining amount
          deductionAmount = Math.min(deductionAmount, loan.remainingAmount);
          
          if (deductionAmount <= 0) continue;
          
          // Calculate the new remaining amount
          const newRemainingAmount = Math.max(0, loan.remainingAmount - deductionAmount);
          
          // If remaining amount is 0, set active to false
          const isActive = newRemainingAmount > 0;
          
          // Update the loan in the database
          const response = await fetch(`/api/salary/loans?id=${loan.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              remainingAmount: newRemainingAmount,
              active: isActive
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update loan: ${response.statusText}`);
          }
          
          console.log(`Updated loan ${loan.id} - remaining amount: ${newRemainingAmount}, active: ${isActive}`);
        }
      }
      
      // Calculate total deductions - don't include bonus/penalty here
      const totalDeductions = selectedEmployee.lateDeduction + 
                             selectedEmployee.halfDayDeduction + 
                             selectedEmployee.absentDeduction + 
                             selectedEmployee.loanDeduction;
      
      // Calculate total paid - add bonusPenalty (which may be positive or negative)
      const totalPaid = selectedEmployee.baseSalary - totalDeductions + selectedEmployee.bonusPenalty;
      
      // Make sure we have correct attendance day counts
      const lateDays = selectedEmployee.lateDays || 0;
      const halfDays = selectedEmployee.halfDays || 0;
      const absentDays = selectedEmployee.absentDays || 0;
      
      console.log('Saving payment with attendance counts:', {
        lateDays,
        halfDays,
        absentDays
      });
      
      // Save the payment record to the database
      const paymentResponse = await fetch('/api/salary/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedEmployee.userId,
          baseSalary: selectedEmployee.baseSalary,
          totalDeductions: totalDeductions,
          lateDeduction: selectedEmployee.lateDeduction,
          halfDayDeduction: selectedEmployee.halfDayDeduction,
          absentDeduction: selectedEmployee.absentDeduction,
          loanDeduction: selectedEmployee.loanDeduction,
          bonusPenalty: selectedEmployee.bonusPenalty,
          totalPaid: totalPaid,
          period: selectedEmployee.month,
          note: paymentNote,
          lateCount: lateDays,
          halfDayCount: halfDays,
          absentCount: absentDays
        }),
      });
      
      if (!paymentResponse.ok) {
        // Handle specific error cases
        if (paymentResponse.status === 409) {
          const errorData = await paymentResponse.json();
          const errorMsg = errorData.message || 'A payment for this month already exists';
          setErrorMessage(errorMsg);
          setErrorDialogOpen(true);
          throw new Error(errorMsg);
        }
        
        throw new Error(`Failed to save payment record: ${paymentResponse.statusText}`);
      }
      
      const paymentData = await paymentResponse.json();
      
      // Save loan payment history if there's a loan deduction
      if (selectedEmployee.loanDeduction > 0) {
        const userLoans = activeLoans.filter(loan => loan.userId === selectedEmployee.userId);
        
        for (const loan of userLoans) {
          // Calculate how much to deduct from this loan
          let deductionAmount = Math.min(loan.monthlyDeduction, selectedEmployee.loanDeduction);
          
          // Ensure we don't deduct more than the remaining amount
          deductionAmount = Math.min(deductionAmount, loan.remainingAmount);
          
          if (deductionAmount <= 0) continue;
          
          // Record loan payment history
          const loanPaymentResponse = await fetch('/api/salary/loan-payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              loanId: loan.id,
              userId: selectedEmployee.userId,
              amount: deductionAmount,
              salaryPaymentId: paymentData.id,
              notes: `Loan deduction from salary payment - ${selectedEmployee.month}`
            }),
          });
          
          if (!loanPaymentResponse.ok) {
            console.error('Failed to save loan payment history, but continuing with salary payment');
          }
        }
      }
      
      toast({
        title: 'Success',
        description: `Salary disbursed successfully for ${selectedEmployee.user.firstName} ${selectedEmployee.user.lastName}`,
      });
      
      // Update the salary data to show payment is complete
      setSalaryData(prev => 
        prev.map(item => 
          item.userId === selectedEmployee.userId 
            ? { ...item, isPaid: true, paymentDate: new Date().toISOString() } 
            : item
        )
      );
      
      // Refresh the active loans data
      fetchActiveLoans();
      
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error('Error processing salary payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process salary payment. Please try again."
      });
    }
  }

  // Add function to handle viewing loan history
  function handleViewLoanHistory(loan: Loan) {
    setSelectedLoan(loan);
    fetchLoanPaymentHistory(loan.id);
    setLoanHistoryDialogOpen(true);
  }

  // Add function to handle payment deletion
  function handleDeletePayment(payment: SalaryPayment) {
    setPaymentToDelete(payment);
    setDeletePaymentDialogOpen(true);
  }

  // Add function to confirm payment deletion
  async function confirmDeletePayment() {
    if (!paymentToDelete) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/salary/payments/${paymentToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete payment: ${response.statusText}`);
      }
      
      // Remove the deleted payment from the list
      setPaymentHistory(prev => prev.filter(p => p.id !== paymentToDelete.id));
      
      toast({
        title: 'Success',
        description: `Payment record deleted successfully`,
      });
      
      setDeletePaymentDialogOpen(false);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete payment record"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Employee Salary Management</h2>
          <p className="text-muted-foreground mt-1">Set salary and deduction amounts for each employee</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{summaryData.totalEmployees}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Base Salary Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalSalaryAmount)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData.averageSalary)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Payable Salary Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData.pendingSalaries)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salary Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Salary Details for {format(dateRange[0], "MMMM yyyy")}</CardTitle>
            <CardDescription>
              Manage employee salaries and process payments
            </CardDescription>
          </div>
          <div className="relative mt-2 sm:mt-0 w-full sm:w-64">
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Salary Date</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Late Deduction</TableHead>
                <TableHead>Half Day Deduction</TableHead>
                <TableHead>Absent Deduction</TableHead>
                <TableHead>Loan Deduction</TableHead>
                <TableHead>Bonus / Penalty</TableHead>
                <TableHead>Total Payable Salary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSalaryData.length > 0 ? (
                filteredSalaryData.map((salary) => {
                  // Total payable uses stored calculated values
                  const totalPayable = salary.baseSalary - salary.lateDeduction - salary.halfDayDeduction - salary.absentDeduction - salary.loanDeduction + salary.bonusPenalty;
                  
                  return (
                    <TableRow key={salary.userId}>
                      <TableCell className="font-medium">
                        {salary.user.firstName} {salary.user.lastName}
                      </TableCell>
                      <TableCell>{getOrdinalSuffix(salary.salaryDate || 1)}</TableCell>
                      <TableCell>{formatCurrency(salary.baseSalary)}</TableCell>
                      <TableCell>
                        {formatCurrency(salary.lateDeduction)}
                        <span className="text-xs text-gray-500 block mt-1">
                          ({salary.lateDays} × {formatCurrency(salary.lateDeductionRate)})
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(salary.halfDayDeduction)}
                        <span className="text-xs text-gray-500 block mt-1">
                          ({salary.halfDays} × {formatCurrency(salary.halfDayDeductionRate)})
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(salary.absentDeduction)}
                        <span className="text-xs text-gray-500 block mt-1">
                          ({salary.absentDays} × {formatCurrency(salary.absentDeductionRate)})
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(salary.loanDeduction)}
                        {salary.loanDeduction > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">
                                    <InfoIcon className="h-4 w-4 text-gray-500" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Monthly loan deduction amount</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {activeLoans.some(loan => loan.userId === salary.userId) && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-primary"
                                onClick={(e : React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  const loan = activeLoans.find(l => l.userId === salary.userId);
                                  if (loan) handleViewLoanHistory(loan);
                                }}
                              >
                                View History
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {salary.bonusPenalty > 0 ? (
                          <span className="text-green-600">+{formatCurrency(salary.bonusPenalty)}</span>
                        ) : salary.bonusPenalty < 0 ? (
                          <span className="text-red-600">-{formatCurrency(Math.abs(salary.bonusPenalty))}</span>
                        ) : (
                          formatCurrency(0)
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(totalPayable)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSalary(salary)}
                            disabled={salary.isPaid}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSalaryDisbursement(salary)}
                            disabled={salary.isPaid}
                          >
                            {salary.isPaid ? 'Paid' : 'Pay'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(salary)}
                          >
                            History
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4">
                    No employees found. {searchQuery ? 'Try a different search term.' : ''}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Salary Dialog */}
      {selectedEmployee && (
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Confirm Salary Disbursement</DialogTitle>
              <DialogDescription>
                Are you sure you want to disburse and record salary payment for {selectedEmployee.user.firstName} {selectedEmployee.user.lastName}?
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto p-6 pt-2">
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Base Salary</div>
                  <div className="p-2 bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded-md font-semibold text-primary-800 dark:text-primary-200">
                    {formatCurrency(selectedEmployee.baseSalary)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium">Salary Period</div>
                  <div className="p-2 bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded-md font-semibold text-primary-800 dark:text-primary-200">
                    {format(dateRange[0], "MMMM yyyy")}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="text-sm font-medium">Deductions</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium mb-1">Late Deduction:</div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                      {formatCurrency(selectedEmployee.lateDeduction)}
                      <span className="text-xs text-gray-700 dark:text-gray-300 block mt-1">
                        ({selectedEmployee.lateDays} × {formatCurrency(selectedEmployee.lateDeductionRate)})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Half Day Deduction:</div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                      {formatCurrency(selectedEmployee.halfDayDeduction)}
                      <span className="text-xs text-gray-700 dark:text-gray-300 block mt-1">
                        ({selectedEmployee.halfDays} × {formatCurrency(selectedEmployee.halfDayDeductionRate)})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Absent Deduction:</div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                      {formatCurrency(selectedEmployee.absentDeduction)}
                      <span className="text-xs text-gray-700 dark:text-gray-300 block mt-1">
                        ({selectedEmployee.absentDays} × {formatCurrency(selectedEmployee.absentDeductionRate)})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1">Loan Deduction:</div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                      {formatCurrency(selectedEmployee.loanDeduction)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1 mt-4">
                <div className="text-sm font-medium">Bonus / Penalty</div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
                  {selectedEmployee.bonusPenalty > 0 ? (
                    <span className="text-green-700 dark:text-green-400 font-medium">+{formatCurrency(selectedEmployee.bonusPenalty)}</span>
                  ) : selectedEmployee.bonusPenalty < 0 ? (
                    <span className="text-red-700 dark:text-red-400 font-medium">-{formatCurrency(Math.abs(selectedEmployee.bonusPenalty))}</span>
                  ) : (
                    formatCurrency(0)
                  )}
                </div>
              </div>
              
              <div className="space-y-1 mt-4">
                <div className="text-sm font-medium">Total Payable</div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-800 rounded-md font-bold text-lg text-center text-primary-900 dark:text-primary-100">
                  {formatCurrency(
                    selectedEmployee.baseSalary - 
                    selectedEmployee.lateDeduction - 
                    selectedEmployee.halfDayDeduction - 
                    selectedEmployee.absentDeduction - 
                    selectedEmployee.loanDeduction + 
                    selectedEmployee.bonusPenalty
                  )}
                </div>
              </div>
              
              <div className="space-y-1 mt-4">
                <div className="text-sm font-medium">Note (optional)</div>
                <Input 
                  placeholder="Add any notes about this payment"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
            
            <DialogFooter className="p-4 border-t">
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSalaryPayment} variant="default">
                Confirm Disbursement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Edit Salary Dialog */}
      {selectedEmployee && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Edit Salary Details</DialogTitle>
              <DialogDescription>
                Adjust salary and deduction rates for {selectedEmployee.user.firstName} {selectedEmployee.user.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto p-6 pt-2">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label htmlFor="baseSalary">Base Salary</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={rawInputs.baseSalary !== '' ? rawInputs.baseSalary : editForm.baseSalary.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRawInputs({...rawInputs, baseSalary: value});
                      
                      if (value !== '' && !isNaN(parseInt(value))) {
                        setEditForm({...editForm, baseSalary: parseInt(value)});
                      }
                    }}
                    onBlur={() => {
                      // Only reset to raw numeric value if the user actually changed something
                      setRawInputs({...rawInputs, baseSalary: ''});
                    }}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="salaryDate">Salary Date</Label>
                  <Select 
                    value={editForm.salaryDate.toString()} 
                    onValueChange={(value) => setEditForm({...editForm, salaryDate: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day of month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-sm">Day of month when salary is paid</p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="lateDeductionRate">
                    Late Day Deduction Rate 
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedEmployee.lateDays} days)
                    </span>
                  </Label>
                  <Input
                    id="lateDeductionRate"
                    type="number"
                    placeholder="Amount per late day"
                    value={rawInputs.lateDeductionRate !== '' ? rawInputs.lateDeductionRate : editForm.lateDeductionRate.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRawInputs({...rawInputs, lateDeductionRate: value});
                      
                      if (value !== '' && !isNaN(parseFloat(value))) {
                        setEditForm({...editForm, lateDeductionRate: parseFloat(value)});
                      }
                    }}
                    onBlur={() => {
                      // Only reset to raw numeric value if the user actually changed something
                      setRawInputs({...rawInputs, lateDeductionRate: ''});
                    }}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="halfDayDeductionRate">
                    Half Day Deduction Rate
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedEmployee.halfDays} days)
                    </span>
                  </Label>
                  <Input
                    id="halfDayDeductionRate"
                    type="number"
                    placeholder="Amount per half day"
                    value={rawInputs.halfDayDeductionRate !== '' ? rawInputs.halfDayDeductionRate : editForm.halfDayDeductionRate.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRawInputs({...rawInputs, halfDayDeductionRate: value});
                      
                      if (value !== '' && !isNaN(parseFloat(value))) {
                        setEditForm({...editForm, halfDayDeductionRate: parseFloat(value)});
                      }
                    }}
                    onBlur={() => {
                      // Only reset to raw numeric value if the user actually changed something
                      setRawInputs({...rawInputs, halfDayDeductionRate: ''});
                    }}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="absentDeductionRate">
                    Absent Day Deduction Rate
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedEmployee.absentDays} days)
                    </span>
                  </Label>
                  <Input
                    id="absentDeductionRate"
                    type="number"
                    placeholder="Amount per absent day"
                    value={rawInputs.absentDeductionRate !== '' ? rawInputs.absentDeductionRate : editForm.absentDeductionRate.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRawInputs({...rawInputs, absentDeductionRate: value});
                      
                      if (value !== '' && !isNaN(parseFloat(value))) {
                        setEditForm({...editForm, absentDeductionRate: parseFloat(value)});
                      }
                    }}
                    onBlur={() => {
                      // Only reset to raw numeric value if the user actually changed something
                      setRawInputs({...rawInputs, absentDeductionRate: ''});
                    }}
                  />
                </div>
              
                <div className="space-y-1">
                  <Label htmlFor="bonusPenalty">Bonus / Penalty</Label>
                  <Input
                    id="bonusPenalty"
                    type="number"
                    placeholder="Enter amount (negative for penalty)"
                    value={rawInputs.bonusPenalty !== '' ? rawInputs.bonusPenalty : editForm.bonusPenalty.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRawInputs({...rawInputs, bonusPenalty: value});
                      
                      // Only update the actual numeric state if we have a valid number
                      if (value === '' || value === '-') {
                        // Keep the string value but don't update numeric state yet
                      } else {
                        setEditForm({...editForm, bonusPenalty: parseFloat(value) || 0});
                      }
                    }}
                    onBlur={() => {
                      // For the minus sign case only
                      if (rawInputs.bonusPenalty === '-') {
                        setEditForm({...editForm, bonusPenalty: 0});
                      } else if (rawInputs.bonusPenalty !== '' && !isNaN(parseFloat(rawInputs.bonusPenalty))) {
                        // Update with valid number if provided
                        setEditForm({...editForm, bonusPenalty: parseFloat(rawInputs.bonusPenalty)});
                      }
                      // Clear the raw input state
                      setRawInputs({...rawInputs, bonusPenalty: ''});
                    }}
                  />
                  <p className="text-muted-foreground text-sm">
                    Enter positive values for bonus, negative for penalty
                  </p>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  {(() => {
                    const deductions = calculateDeductions(editForm, selectedEmployee);
                    return (
                      <>
                        <div className="flex justify-between">
                          <div className="text-sm font-medium">Late Deduction:</div>
                          <div className="text-sm">
                            {formatCurrency(deductions.lateDeduction)}
                            <span className="text-xs text-gray-500 block mt-1">
                              ({selectedEmployee.lateDays} × {formatCurrency(editForm.lateDeductionRate)})
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <div className="text-sm font-medium">Half Day Deduction:</div>
                          <div className="text-sm">
                            {formatCurrency(deductions.halfDayDeduction)}
                            <span className="text-xs text-gray-500 block mt-1">
                              ({selectedEmployee.halfDays} × {formatCurrency(editForm.halfDayDeductionRate)})
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <div className="text-sm font-medium">Absent Deduction:</div>
                          <div className="text-sm">
                            {formatCurrency(deductions.absentDeduction)}
                            <span className="text-xs text-gray-500 block mt-1">
                              ({selectedEmployee.absentDays} × {formatCurrency(editForm.absentDeductionRate)})
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <div className="text-sm font-medium">Bonus / Penalty:</div>
                          <div className="text-sm">
                            {editForm.bonusPenalty > 0 ? (
                              <span className="text-green-600">+{formatCurrency(editForm.bonusPenalty)}</span>
                            ) : editForm.bonusPenalty < 0 ? (
                              <span className="text-red-600">-{formatCurrency(Math.abs(editForm.bonusPenalty))}</span>
                            ) : (
                              formatCurrency(0)
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between font-medium">
                          <div className="text-sm">Total Deductions:</div>
                          <div className="text-sm">
                            {formatCurrency(deductions.totalDeduction)}
                          </div>
                        </div>
                        
                        <div className="flex justify-between font-bold pt-2 border-t mt-2">
                          <div className="text-sm">Total Payable:</div>
                          <div className="text-sm">
                            {formatCurrency(deductions.totalPayable)}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEditedSalary}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Salary History Dialog */}
      {selectedEmployee && (
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Salary History - {selectedEmployee.user.firstName} {selectedEmployee.user.lastName}</DialogTitle>
              <DialogDescription>
                Past salary payment records for date range: {format(dateRange[0], "d MMMM yyyy")} to {format(dateRange[1], "d MMMM yyyy")}
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto p-4 flex-grow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Payment Date</TableHead>
                    <TableHead className="whitespace-nowrap">Period</TableHead>
                    <TableHead className="whitespace-nowrap">Base Salary</TableHead>
                    <TableHead className="whitespace-nowrap">Late</TableHead>
                    <TableHead className="whitespace-nowrap">Half Day</TableHead>
                    <TableHead className="whitespace-nowrap">Absent</TableHead>
                    <TableHead className="whitespace-nowrap">Loan</TableHead>
                    <TableHead className="whitespace-nowrap">Bonus/Penalty</TableHead>
                    <TableHead className="whitespace-nowrap">Total Paid</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin h-6 w-6 border-2 border-gray-300 rounded-full border-t-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paymentHistory.length > 0 ? (
                    paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">{payment.paymentDate ? format(new Date(payment.paymentDate), "d MMM yyyy") : "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{getFormattedDateRange(payment.month, payment.year, payment.paymentDate, dateRange)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(payment.baseSalary)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className={`font-medium ${payment.lateCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {payment.lateCount || 0}
                            </span>
                            <span className="text-gray-500 ml-1">days</span>
                          </div>
                          {payment.lateDeduction > 0 && (
                            <span className="text-xs text-gray-500 block mt-1">
                              ({formatCurrency(payment.lateDeduction)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className={`font-medium ${payment.halfDayCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {payment.halfDayCount || 0}
                            </span>
                            <span className="text-gray-500 ml-1">days</span>
                          </div>
                          {payment.halfDayDeduction > 0 && (
                            <span className="text-xs text-gray-500 block mt-1">
                              ({formatCurrency(payment.halfDayDeduction)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className={`font-medium ${payment.absentCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {payment.absentCount || 0}
                            </span>
                            <span className="text-gray-500 ml-1">days</span>
                          </div>
                          {payment.absentDeduction > 0 && (
                            <span className="text-xs text-gray-500 block mt-1">
                              ({formatCurrency(payment.absentDeduction)})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(payment.loanDeduction)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {payment.bonusPenalty > 0 ? (
                            <span className="text-green-600">+{formatCurrency(payment.bonusPenalty)}</span>
                          ) : payment.bonusPenalty < 0 ? (
                            <span className="text-red-600">-{formatCurrency(Math.abs(payment.bonusPenalty))}</span>
                          ) : (
                            formatCurrency(0)
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{formatCurrency(payment.netSalary)}</TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePayment(payment)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter className="p-4 border-t">
              <Button onClick={() => setHistoryDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Payment Confirmation Dialog */}
      {paymentToDelete && (
        <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the payment record for {getMonthName(paymentToDelete.month)} {paymentToDelete.year}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePayment} className="bg-destructive text-destructive-foreground">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span>Deleting...</span>
                  </div>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Error Dialog for Payment Issues */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Payment Error
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-destructive/10 rounded-md border border-destructive mt-2">
            <p className="text-destructive">{errorMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add this new dialog for Loan Payment History */}
      {selectedLoan && (
        <Dialog open={loanHistoryDialogOpen} onOpenChange={setLoanHistoryDialogOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Loan Payment History - {selectedLoan.user.firstName} {selectedLoan.user.lastName}</DialogTitle>
              <DialogDescription>
                Payment history for loan issued on {format(new Date(selectedLoan.issueDate), "d MMMM yyyy")} 
                for {formatCurrency(selectedLoan.amount)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-4 bg-muted/50 mx-6 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Original Amount</p>
                  <p className="text-base">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Remaining Amount</p>
                  <p className="text-base">{formatCurrency(selectedLoan.remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Monthly Deduction</p>
                  <p className="text-base">{formatCurrency(selectedLoan.monthlyDeduction)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-base">
                    {selectedLoan.active ? (
                      <span className="text-amber-600 font-medium">Active</span>
                    ) : (
                      <span className="text-green-600 font-medium">Completed</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium">Reason</p>
                <p className="text-base">{selectedLoan.reason || "-"}</p>
              </div>
            </div>
            
            <div className="overflow-y-auto p-4 flex-grow">
              <h3 className="font-medium mb-2 px-2">Payment Records</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Payment Date</TableHead>
                    <TableHead className="whitespace-nowrap">Amount Paid</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin h-6 w-6 border-2 border-gray-300 rounded-full border-t-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : loanPaymentHistory.length > 0 ? (
                    loanPaymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">{payment.paymentDate ? format(new Date(payment.paymentDate), "d MMM yyyy") : "-"}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter className="p-4 border-t">
              <Button onClick={() => setLoanHistoryDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 