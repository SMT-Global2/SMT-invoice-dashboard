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
import { format } from 'date-fns';
import { 
  PlusCircle, 
  PencilIcon, 
  Trash2Icon, 
  InfoIcon,
  CalendarIcon,
  XCircle,
  CheckCircle2Icon
} from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatCurrency } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Types
type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type Loan = {
  id: string;
  userId: string;
  amount: number;
  remainingAmount: number;
  reason: string;
  issueDate: string;
  monthlyDeduction: number;
  active: boolean;
  user: User;
  totalPaid?: number;
};

type LoanPayment = {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  paymentDate: string;
  notes: string;
  user: User;
};

interface LoansManagementTabProps {
  dateRange: [Date, Date];
}

// Form schema for loan creation/editing
const loanFormSchema = z.object({
  userId: z.string({
    required_error: "Please select an employee",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be a positive number",
  }),
  monthlyDeduction: z.coerce.number().positive({
    message: "Monthly deduction must be a positive number",
  }),
  reason: z.string().optional(),
  issueDate: z.date({
    required_error: "Please select a date",
  }),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

export default function LoansManagementTab({ dateRange }: LoansManagementTabProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  // Form states
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      amount: 0,
      monthlyDeduction: 0,
      reason: "",
      issueDate: new Date(),
    },
  });

  // Summary data
  const [summaryData, setSummaryData] = useState({
    totalLoans: 0,
    totalAmount: 0,
    totalRemainingAmount: 0,
    activeLoans: 0,
    monthlyDeductions: 0,
  });

  // Update these state variables for filtering
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  
  // Update the filtering effect to include status and employee filters
  useEffect(() => {
    let filtered = loans;
    
    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        loan =>
          loan.user.firstName.toLowerCase().includes(query) ||
          loan.user.lastName.toLowerCase().includes(query) ||
          loan.user.username.toLowerCase().includes(query) ||
          loan.reason.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(loan => 
        statusFilter === 'active' ? loan.active : !loan.active
      );
    }
    
    // Apply employee filter
    if (employeeFilter && employeeFilter !== 'all') {
      filtered = filtered.filter(loan => loan.userId === employeeFilter);
    }
    
    setFilteredLoans(filtered);
  }, [searchQuery, loans, statusFilter, employeeFilter]);

  // Add a specific state for editing just the reason of a closed loan
  const [editReasonDialogOpen, setEditReasonDialogOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  
  // Add confirmation dialog state
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

  // Add this state at the top of the component with other dialog states
  const [clearRemainingDialogOpen, setClearRemainingDialogOpen] = useState(false);

  // Add these state variables with the other dialog states
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [loanPaymentHistory, setLoanPaymentHistory] = useState<LoanPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch data when component mounts
  useEffect(() => {
    Promise.all([fetchLoans(), fetchUsers()])
      .then(([loansData, usersData]) => {
        updateSummary(loansData);
      })
      .catch(error => {
        console.error("Error fetching initial data:", error);
        setIsLoading(false);
      });
  }, []);
  
  async function fetchLoans() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/salary/loans');
      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }
      const data = await response.json();
      
      // Calculate totalPaid for each loan
      const processedLoans = data.map((loan: Loan) => ({
        ...loan,
        totalPaid: loan.amount - loan.remainingAmount
      }));
      
      setLoans(processedLoans);
      updateSummary(processedLoans);
      return processedLoans;
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch loans"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }

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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users',
      });
      return [];
    }
  }

  function updateSummary(loansData: Loan[]) {
    if (!loansData || loansData.length === 0) {
      setSummaryData({
        totalLoans: 0,
        activeLoans: 0,
        totalAmount: 0,
        totalRemainingAmount: 0,
        monthlyDeductions: 0
      });
      return;
    }

    // Calculate total paid for each loan
    const processedLoans = loansData.map(loan => ({
      ...loan,
      totalPaid: loan.amount - loan.remainingAmount
    }));

    const activeLoans = processedLoans.filter(loan => loan.active);
    
    setSummaryData({
      totalLoans: processedLoans.length,
      activeLoans: activeLoans.length,
      totalAmount: processedLoans.reduce((sum, loan) => sum + loan.amount, 0),
      totalRemainingAmount: processedLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0),
      monthlyDeductions: activeLoans.reduce((sum, loan) => sum + loan.monthlyDeduction, 0)
    });

    return processedLoans;
  }

  // Handle loan creation
  const handleCreateLoan = async (values: LoanFormValues) => {
    try {
      setIsLoading(true);
      
      const payload = {
        userId: values.userId,
        amount: values.amount,
        remainingAmount: values.amount, // Initially remaining amount equals total amount
        monthlyDeduction: values.monthlyDeduction,
        reason: values.reason,
        issueDate: values.issueDate.toISOString(),
        active: true,
      };
      
      const response = await fetch("/api/salary/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create loan");
      }
      
      const newLoan = await response.json();
      
      // Update state with the new loan
      setLoans(prevLoans => {
        const updatedLoans = [...prevLoans, newLoan];
        updateSummary(updatedLoans);
        return updatedLoans;
      });
      
      setAddDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating loan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Change the name of the original handleEditLoan function to saveLoanChanges
  const saveLoanChanges = async (values: LoanFormValues) => {
    if (!selectedLoan) return;
    
    try {
      setIsLoading(true);
      
      const payload = {
        amount: values.amount,
        remainingAmount: values.amount - (selectedLoan.amount - selectedLoan.remainingAmount),
        monthlyDeduction: values.monthlyDeduction,
        reason: values.reason,
        issueDate: values.issueDate.toISOString(),
      };
      
      const response = await fetch(`/api/salary/loans?id=${selectedLoan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update loan");
      }
      
      const updatedLoan = await response.json();
      
      // Update state with the updated loan
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan => 
          loan.id === selectedLoan.id ? updatedLoan : loan
        );
        updateSummary(updatedLoans);
        return updatedLoans;
      });
      
      setEditDialogOpen(false);
      setSelectedLoan(null);
    } catch (error) {
      console.error("Error updating loan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle loan deletion or marking as inactive
  const handleDeleteLoan = async () => {
    if (!selectedLoan) return;
    
    try {
      setIsLoading(true);
      
      // Instead of deleting, we'll mark the loan as inactive
      const payload = {
        active: false,
      };
      
      const response = await fetch(`/api/salary/loans?id=${selectedLoan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete loan");
      }
      
      const updatedLoan = await response.json();
      
      // Update state
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan => 
          loan.id === selectedLoan.id ? updatedLoan : loan
        );
        updateSummary(updatedLoans);
        return updatedLoans;
      });
      
      // Close the dialog and show success message
      setConfirmDeleteDialogOpen(false);
      setSelectedLoan(null);
      toast({
        title: "Success",
        description: "Loan has been closed successfully",
      });
    } catch (error) {
      console.error("Error deleting loan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to close loan. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a function to update just the reason of a loan
  const updateLoanReason = async () => {
    if (!selectedLoan) return;
    
    try {
      setIsLoading(true);
      
      const payload = {
        reason: reasonInput
      };
      
      const response = await fetch(`/api/salary/loans?id=${selectedLoan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update loan reason");
      }
      
      const updatedLoan = await response.json();
      
      // Update state with the updated loan
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan => 
          loan.id === selectedLoan.id ? updatedLoan : loan
        );
        return updatedLoans;
      });
      
      setEditReasonDialogOpen(false);
      setSelectedLoan(null);
      toast({
        title: "Success",
        description: "Loan reason updated successfully",
      });
    } catch (error) {
      console.error("Error updating loan reason:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update loan reason",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modify handleEditLoan to check if loan is closed and open different dialog
  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    
    if (!loan.active) {
      // For closed loans, only allow editing the reason
      setReasonInput(loan.reason || '');
      setEditReasonDialogOpen(true);
    } else {
      // For active loans, allow editing all fields
      form.reset({
        userId: loan.userId,
        amount: loan.amount,
        monthlyDeduction: loan.monthlyDeduction,
        reason: loan.reason || "",
        issueDate: new Date(loan.issueDate),
      });
      setEditDialogOpen(true);
    }
  };
  
  // Modify handleDeleteLoan to use the confirmation dialog
  const handleDeleteConfirmation = (loan: Loan) => {
    setSelectedLoan(loan);
    setConfirmDeleteDialogOpen(true);
  };

  // Add this function to handle clearing the remaining loan amount
  async function handleClearRemainingAmount(loan: Loan) {
    if (!loan || loan.active || loan.remainingAmount <= 0) return;
    
    setSelectedLoan(loan);
    setClearRemainingDialogOpen(true);
  }

  // Add a function to confirm and process the clearing of the remaining amount
  async function confirmClearRemainingAmount() {
    if (!selectedLoan) return;
    
    try {
      setIsLoading(true);
      
      // First, create a loan payment record for the remaining amount
      const paymentResponse = await fetch('/api/salary/loan-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          userId: selectedLoan.userId,
          amount: selectedLoan.remainingAmount,
          notes: 'Remaining amount cleared manually by admin',
        }),
      });
      
      if (!paymentResponse.ok) {
        throw new Error('Failed to record loan payment');
      }
      
      // Then update the loan to set remaining amount to zero
      const updateResponse = await fetch(`/api/salary/loans?id=${selectedLoan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remainingAmount: 0,
          active: false,
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update loan');
      }
      
      toast({
        title: 'Success',
        description: `Remaining amount of ${formatCurrency(selectedLoan.remainingAmount)} has been cleared`,
      });
      
      setClearRemainingDialogOpen(false);
      fetchLoans(); // Refresh the loans data
    } catch (error) {
      console.error('Error clearing loan remaining amount:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear remaining amount',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Add this function to handle viewing loan history
  async function handleViewLoanHistory(loan: Loan) {
    setSelectedLoan(loan);
    setHistoryDialogOpen(true);
    await fetchLoanPaymentHistory(loan.id);
  }

  // Add this function to fetch loan payment history
  async function fetchLoanPaymentHistory(loanId: string) {
    setIsLoadingHistory(true);
    try {
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
      setIsLoadingHistory(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Loans Management</h2>
          <p className="text-muted-foreground mt-1">Manage employee loans and deductions</p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4 items-start md:items-center">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
            <Input
              placeholder="Search loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            
            <div className="flex space-x-2">
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as 'active' | 'closed' | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Loans</SelectItem>
                  <SelectItem value="active">Active Loans</SelectItem>
                  <SelectItem value="closed">Closed Loans</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={employeeFilter} 
                onValueChange={setEmployeeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={() => setAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Loans */}
        <Card className="border rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summaryData.totalLoans}</div>
            <div className="mt-1 text-xs text-green-700">
              <span className="font-medium">Active:</span> {summaryData.activeLoans}
            </div>
          </CardContent>
        </Card>
        
        {/* Total Amount */}
        <Card className="border rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Lended Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summaryData.totalAmount)}</div>
            <div className="mt-1 text-xs text-gray-700">
              <span className="font-medium">Amount yet to receive:</span> {formatCurrency(summaryData.totalRemainingAmount)}
            </div>
          </CardContent>
        </Card>
        
        {/* Monthly Deduction */}
        <Card className="border rounded-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Monthly Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summaryData.monthlyDeductions)}</div>
            <div className="mt-1 text-xs text-gray-700">
              <span className="font-medium">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Total Paid</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Monthly Deduction</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-6 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            ) : filteredLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchQuery.trim() !== '' ? (
                    <div>No loans match your search</div>
                  ) : (
                    <div>No loans found</div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredLoans.map(loan => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    {loan.user.firstName} {loan.user.lastName}
                    <div className="text-xs text-muted-foreground">{loan.user.username}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{formatCurrency(loan.remainingAmount)}</TableCell>
                  <TableCell>{formatCurrency(loan.totalPaid || (loan.amount - loan.remainingAmount))}</TableCell>
                  <TableCell>{new Date(loan.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(loan.monthlyDeduction)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={loan.reason}>
                    {loan.reason}
                  </TableCell>
                  <TableCell>
                    {loan.active ? (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                        Closed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewLoanHistory(loan)}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Payment History</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditLoan(loan)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{loan.active ? "Edit Loan" : "Edit Reason Only"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfirmation(loan)}
                              disabled={!loan.active}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Close Loan</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedLoan(loan); setDeleteDialogOpen(true); }}
                            >
                              <Trash2Icon className="h-4 w-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Permanently Delete Loan</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Clear Remaining button for closed loans with remaining amount */}
                      {!loan.active && loan.remainingAmount > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => handleClearRemainingAmount(loan)}
                              >
                                Clear Remaining
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Clear the remaining amount of {formatCurrency(loan.remainingAmount)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Loan Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogDescription>
              Create a new loan for an employee
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateLoan)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="monthlyDeduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Deduction</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <div className="relative flex space-x-2">
                      {/* Native date input for direct editing */}
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : new Date();
                            field.onChange(date);
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      
                      {/* Calendar popover as alternative option */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="px-2" 
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-3 bg-white dark:bg-slate-950 shadow-lg rounded-md border border-slate-200 dark:border-slate-800 z-[100]" 
                          align="end"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) field.onChange(date);
                            }}
                            initialFocus
                            className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950"
                            classNames={{
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-medium",
                              nav: "flex items-center space-x-1",
                              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-slate-500 dark:text-slate-400 rounded-md w-9 font-medium text-[0.8rem]",
                              row: "flex w-full mt-2",
                              cell: "text-center text-sm relative p-0 rounded-md focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100 [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected][aria-disabled=true])]:bg-slate-100/50",
                              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md",
                              day_today: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
                              day_selected: "bg-blue-600 text-slate-50 hover:bg-blue-600 hover:text-slate-50 focus:bg-blue-600 focus:text-slate-50",
                              day_outside: "opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30",
                              day_disabled: "opacity-50 cursor-not-allowed",
                              day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                              day_hidden: "invisible",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  Create Loan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
            <DialogDescription>
              Update loan details
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveLoanChanges)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="monthlyDeduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Deduction</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <div className="relative flex space-x-2">
                      {/* Native date input for direct editing */}
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : new Date();
                            field.onChange(date);
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      
                      {/* Calendar popover as alternative option */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="px-2" 
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-3 bg-white dark:bg-slate-950 shadow-lg rounded-md border border-slate-200 dark:border-slate-800 z-[100]" 
                          align="end"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) field.onChange(date);
                            }}
                            initialFocus
                            className="rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950"
                            classNames={{
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-medium",
                              nav: "flex items-center space-x-1",
                              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-slate-500 dark:text-slate-400 rounded-md w-9 font-medium text-[0.8rem]",
                              row: "flex w-full mt-2",
                              cell: "text-center text-sm relative p-0 rounded-md focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100 [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected][aria-disabled=true])]:bg-slate-100/50",
                              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md",
                              day_today: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50",
                              day_selected: "bg-blue-600 text-slate-50 hover:bg-blue-600 hover:text-slate-50 focus:bg-blue-600 focus:text-slate-50",
                              day_outside: "opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30",
                              day_disabled: "opacity-50 cursor-not-allowed",
                              day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                              day_hidden: "invisible",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  Update Loan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Reason Dialog (for closed loans) */}
      <Dialog open={editReasonDialogOpen} onOpenChange={setEditReasonDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Loan Reason</DialogTitle>
            <DialogDescription>
              This loan is closed. You can only edit the reason/notes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Notes</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason or notes for this loan"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReasonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateLoanReason} disabled={isLoading}>
              Update Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this loan? This will mark the loan as inactive and it won't be deducted from salary anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedLoan && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium">Employee</p>
                  <p>{selectedLoan.user.firstName} {selectedLoan.user.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p>{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Remaining</p>
                  <p>{formatCurrency(selectedLoan.remainingAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Monthly Deduction</p>
                  <p>{formatCurrency(selectedLoan.monthlyDeduction)}</p>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLoan();
              }}
              className="bg-destructive text-destructive-foreground"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>Closing...</span>
                </div>
              ) : (
                "Close Loan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add the Clear Remaining confirmation dialog */}
      <AlertDialog open={clearRemainingDialogOpen} onOpenChange={setClearRemainingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Remaining Loan Amount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear the remaining amount of {selectedLoan && formatCurrency(selectedLoan.remainingAmount)} for {selectedLoan && `${selectedLoan.user.firstName} ${selectedLoan.user.lastName}`}?
              
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                This action will mark the remaining amount as paid without actual payment collection. This cannot be undone.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearRemainingAmount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear Remaining Amount
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loan Payment History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Loan Payment History</DialogTitle>
            {selectedLoan && (
              <DialogDescription>
                Payment history for {selectedLoan.user.firstName} {selectedLoan.user.lastName}'s loan issued on {format(new Date(selectedLoan.issueDate), "d MMMM yyyy")}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedLoan && (
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
                      <span className="text-blue-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-600 font-medium">Closed</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium">Reason</p>
                <p className="text-base">{selectedLoan.reason || "-"}</p>
              </div>
            </div>
          )}
          
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
                {isLoadingHistory ? (
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
            <Button onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Loan Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this loan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedLoan) return;
                setIsLoading(true);
                try {
                  const response = await fetch(`/api/salary/loans?id=${selectedLoan.id}`, {
                    method: 'DELETE',
                  });
                  if (!response.ok) throw new Error('Failed to delete loan');
                  setLoans(loans => loans.filter(l => l.id !== selectedLoan.id));
                  setFilteredLoans(loans => loans.filter(l => l.id !== selectedLoan.id));
                  toast({ title: 'Deleted', description: 'Loan permanently deleted.' });
                } catch (error) {
                  toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete loan.' });
                } finally {
                  setIsLoading(false);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 