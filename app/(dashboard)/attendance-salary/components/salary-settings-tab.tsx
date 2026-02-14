'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  type?: string;
};

type SalarySetting = {
  id: string;
  userId: string;
  monthlySalary: number;
  dailySalary: number;
  workingDays: number;
  lateDeduction: number;
  halfDayDeduction: number;
  absentDeduction: number;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
};

// Form schema for salary settings
const salarySettingsSchema = z.object({
  userId: z.string({
    required_error: 'Please select an employee',
  }),
  monthlySalary: z.coerce
    .number({
      required_error: 'Please enter monthly salary',
      invalid_type_error: 'Monthly salary must be a number',
    })
    .positive('Salary must be a positive number'),
  workingDays: z.coerce
    .number({
      required_error: 'Please enter working days',
      invalid_type_error: 'Working days must be a number',
    })
    .min(1, 'Working days must be at least 1')
    .max(31, 'Working days cannot exceed 31'),
  lateDeduction: z.coerce
    .number({
      required_error: 'Please enter late deduction percentage',
      invalid_type_error: 'Late deduction must be a number',
    })
    .min(0, 'Deduction cannot be negative')
    .max(100, 'Deduction cannot exceed 100%'),
  halfDayDeduction: z.coerce
    .number({
      required_error: 'Please enter half day deduction percentage',
      invalid_type_error: 'Half day deduction must be a number',
    })
    .min(0, 'Deduction cannot be negative')
    .max(100, 'Deduction cannot exceed 100%'),
  absentDeduction: z.coerce
    .number({
      required_error: 'Please enter absent deduction percentage',
      invalid_type_error: 'Absent deduction must be a number',
    })
    .min(0, 'Deduction cannot be negative')
    .max(100, 'Deduction cannot exceed 100%'),
});

interface SalarySettingsTabProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export default function SalarySettingsTab({ dateRange }: SalarySettingsTabProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [salarySettings, setSalarySettings] = useState<SalarySetting[]>([]);
  const [filteredSettings, setFilteredSettings] = useState<SalarySetting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SalarySetting | null>(null);
  const [employeesWithoutSalary, setEmployeesWithoutSalary] = useState<User[]>([]);
  
  const form = useForm<z.infer<typeof salarySettingsSchema>>({
    resolver: zodResolver(salarySettingsSchema),
    defaultValues: {
      monthlySalary: 0,
      workingDays: 22,
      lateDeduction: 10,
      halfDayDeduction: 50,
      absentDeduction: 100,
    },
  });

  // Fetch data when component mounts
  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchSalarySettings()
    ]).catch(error => {
      console.error("Error fetching initial data:", error);
      setIsLoading(false);
    });
  }, []);
  
  // Filter salary settings based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSettings(salarySettings);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSettings(
        salarySettings.filter(
          (setting) =>
            setting.user.firstName.toLowerCase().includes(query) ||
            setting.user.lastName.toLowerCase().includes(query) ||
            setting.user.username.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, salarySettings]);

  // Update employees without salary list when users or salary settings change
  useEffect(() => {
    if (users.length > 0 && salarySettings.length >= 0) {
      const userIdsWithSalary = salarySettings.map(setting => setting.userId);
      const usersWithoutSalary = users.filter(user => !userIdsWithSalary.includes(user.id));
      setEmployeesWithoutSalary(usersWithoutSalary);
    }
  }, [users, salarySettings]);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/user/list');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      
      // Filter out ex-employees
      const activeUsers = data.filter((user: any) => user.employmentStatus !== 'EX_EMPLOYEE');
      console.log('Fetched users for salary settings:', activeUsers.length);
      setUsers(activeUsers);
      return activeUsers;
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

  async function fetchSalarySettings() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/salary/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch salary settings');
      }
      const data = await response.json();
      setSalarySettings(data);
      setFilteredSettings(data);
    } catch (error) {
      console.error('Error fetching salary settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch salary settings',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddNew() {
    // Reset form to default values
    form.reset({
      userId: '',
      monthlySalary: 0,
      workingDays: 22,
      lateDeduction: 10,
      halfDayDeduction: 50,
      absentDeduction: 100,
    });
    setEditingSetting(null);
    setIsDialogOpen(true);
  }

  function handleEdit(setting: SalarySetting) {
    form.reset({
      userId: setting.userId,
      monthlySalary: setting.monthlySalary,
      workingDays: setting.workingDays,
      lateDeduction: setting.lateDeduction,
      halfDayDeduction: setting.halfDayDeduction,
      absentDeduction: setting.absentDeduction,
    });
    setEditingSetting(setting);
    setIsDialogOpen(true);
  }

  async function handleDelete(settingId: string) {
    try {
      const response = await fetch(`/api/salary/settings?id=${settingId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete salary setting');
      }
      
      toast({
        title: 'Success',
        description: 'Salary setting deleted successfully',
      });
      
      // Refresh salary settings
      fetchSalarySettings();
    } catch (error) {
      console.error('Error deleting salary setting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete salary setting',
      });
    }
  }

  async function onSubmit(values: z.infer<typeof salarySettingsSchema>) {
    try {
      // Determine if we're creating a new record or updating an existing one
      const method = editingSetting ? 'PUT' : 'POST';
      const url = editingSetting 
        ? `/api/salary/settings` 
        : `/api/salary/settings`;
      
      const requestBody = editingSetting 
        ? { ...values, id: editingSetting.id } 
        : values;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save salary setting');
      }
      
      toast({
        title: 'Success',
        description: editingSetting 
          ? 'Salary setting updated successfully' 
          : 'New salary setting created successfully',
      });
      
      // Close dialog and refresh data
      setIsDialogOpen(false);
      fetchSalarySettings();
    } catch (error) {
      console.error('Error saving salary setting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save salary setting',
      });
    }
  }

  // Function to format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <div className="text-2xl font-bold">Salary Settings</div>
              <p className="text-muted-foreground mt-1">
                Configure employee salary and attendance deduction rules
              </p>
            </div>
            <div className="flex space-x-2">
              <div className="relative">
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-[200px]"
                />
              </div>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Settings Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Monthly Salary</TableHead>
              <TableHead className="text-right">Daily Salary</TableHead>
              <TableHead className="text-center">Working Days</TableHead>
              <TableHead className="text-center">Late Deduction</TableHead>
              <TableHead className="text-center">Half Day</TableHead>
              <TableHead className="text-center">Absent</TableHead>
              <TableHead className="text-center">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-[100px] ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-[80px] ml-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-[40px] mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-[60px] mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-[60px] mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-6 w-[60px] mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            ) : filteredSettings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchQuery.trim() !== '' ? (
                    <div>No salary settings match your search</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      <div className="text-lg font-medium">No salary settings found</div>
                      <div className="text-sm text-muted-foreground">
                        Add your first salary setting to get started
                      </div>
                      <Button size="sm" onClick={handleAddNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Salary Setting
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredSettings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-medium">
                    {setting.user.firstName} {setting.user.lastName}
                    <div className="text-xs text-muted-foreground">{setting.user.username}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(setting.monthlySalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(setting.dailySalary)}
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.workingDays}
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.lateDeduction}%
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.halfDayDeduction}%
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.absentDeduction}%
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(setting)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the salary setting for{' '}
                              <span className="font-semibold">
                                {setting.user.firstName} {setting.user.lastName}
                              </span>
                              . This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDelete(setting.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Salary Setting Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? 'Edit Salary Setting' : 'Add New Salary Setting'}
            </DialogTitle>
            <DialogDescription>
              {editingSetting
                ? 'Update the salary details and deduction rules'
                : 'Configure salary and attendance deduction rules for an employee'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      disabled={!!editingSetting}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {editingSetting ? (
                          <SelectItem value={editingSetting.userId}>
                            {
                              users.find(user => user.id === editingSetting.userId)?.firstName + ' ' +
                              users.find(user => user.id === editingSetting.userId)?.lastName
                            }
                          </SelectItem>
                        ) : (
                          employeesWithoutSalary.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.username})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlySalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Salary</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="workingDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Days (per month)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="31" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">Deduction Percentages</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="lateDeduction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="halfDayDeduction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Half Day (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="absentDeduction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Absent (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  Percentages represent daily salary deduction for each attendance status
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit">
                  {editingSetting ? 'Update Setting' : 'Save Setting'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 