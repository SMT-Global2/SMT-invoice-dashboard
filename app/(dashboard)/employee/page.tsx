"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlusIcon, Pencil, Trash2, Eye, EyeOff, Search, FilterX, LogOut, ChevronDown, PhoneIcon } from "lucide-react"
import { useUsersStore } from "@/store/useUsersStore"
import { EmployeeDialog } from "./employee-dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import TableSkeleton from '@/components/table-skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge'
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User } from '@/store/useUsersStore';
import { ShowImage } from '@/components/show-image';
import { getS3BucketUrl } from '@/lib/helper';

function getEmploymentDuration(start: Date | string | undefined, end?: Date | string): string {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return '-';
  let result = '';
  if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) {
    if (result) result += ' ';
    result += `${months} month${months > 1 ? 's' : ''}`;
  }
  return result || '0 months';
}

export default function EmployeePage() {
  const { users, fetchUsers, deleteUser, setSelectedUser, isLoading, logoutFromAllDevices } = useUsersStore()
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [userToLogout, setUserToLogout] = useState<string | null>(null)
  const [debugUsers, setDebugUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EX_EMPLOYEE'>('ALL')
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL')
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [salarySort, setSalarySort] = useState<'NONE' | 'ASC' | 'DESC'>('NONE');
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [selectedUserForPhone, setSelectedUserForPhone] = useState<User | null>(null);

  // Manual fetch to debug
  const fetchUsersDirectly = async () => {
    try {
      console.log("Manually fetching users...");
      const response = await fetch('/api/user');
      const data = await response.json();
      console.log("API Response:", data);
      setDebugUsers(data);
      return data;
    } catch (error) {
      console.error("Error manually fetching users:", error);
      return [];
    }
  }

  useEffect(() => {
    console.log("EmployeePage mounted, fetching users");
    fetchUsers();
    fetchUsersDirectly();
  }, [fetchUsers]);

  useEffect(() => {
    console.log("Users from store:", users);
  }, [users]);

  const handleEdit = (user: any) => {
    setSelectedUser(user)
  }

  const handleDelete = async (id: string) => {
    setUserToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete)
      await fetchUsers()
    }
    setDeleteConfirmOpen(false)
    setUserToDelete(null)
  }

  const handleAddNew = () => {
    setSelectedUser({
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      phoneNumber: [""],
      email: "",
      address: "",
      department: ["RECEIPT_MANAGEMENT"],
      type: "USER",
      gender: "NOT_SPECIFIED",
      employmentStatus: "ACTIVE",
      employmentStart: new Date(),
    })
  }

  const formatDepartment = (departments: string[] | undefined): string => {
    if (!departments?.length) return '-';

    return departments
      .map(dept => dept
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      )
      .join(',');
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const handleLogoutAllDevices = async (id: string) => {
    setUserToLogout(id)
    setLogoutConfirmOpen(true)
  }

  const confirmLogout = async () => {
    if (userToLogout) {
      await logoutFromAllDevices(userToLogout)
    }
    setLogoutConfirmOpen(false)
    setUserToLogout(null)
  }

  // Filter users based on search query and filters
  const filteredUsers = users?.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesName = fullName.includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'ALL' || user.gender === genderFilter;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? (user.employmentStatus === 'ACTIVE' || !user.employmentStatus) : user.employmentStatus === 'EX_EMPLOYEE');
    return matchesName && matchesGender && matchesStatus;
  }) || [];

  const sortedUsers = [...filteredUsers];

  // Analytics counts
  console.log("All users for analytics:", users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    type: u.type,
    gender: u.gender || 'NOT_SPECIFIED',
    employmentStatus: u.employmentStatus || 'ACTIVE'
  })));
  
  const adminAccounts = users.filter(u => u.type === 'ADMIN').length;
  const employeeUsers = users.filter(u => u.type === 'USER');
  const totalEmployees = employeeUsers.length;
  const activeEmployees = employeeUsers.filter(u => u.employmentStatus === 'ACTIVE' || !u.employmentStatus).length;
  const exEmployees = employeeUsers.filter(u => u.employmentStatus === 'EX_EMPLOYEE').length;
  const maleEmployees = employeeUsers.filter(u => u.gender === 'MALE').length;
  const femaleEmployees = employeeUsers.filter(u => u.gender === 'FEMALE').length;
  
  console.log("Analytics counts:", {
    adminAccounts,
    totalEmployees,
    activeEmployees,
    exEmployees,
    maleEmployees,
    femaleEmployees
  });

  // Analytics counts
  const isAnalyticsLoading = isLoading && users.length === 0;

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Employee Management</h1>
      </div>
      {/* Analytics Cards */}
      <div className="w-full flex flex-wrap gap-4 mb-2">
        <div className="flex-1 min-w-[160px] bg-background border border-yellow-400 rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold text-yellow-700">Admin Accounts</span>
          <span className="text-2xl font-bold mt-1 text-yellow-700">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : adminAccounts}
          </span>
        </div>
        <div className="flex-1 min-w-[160px] bg-background border rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">Total Employees</span>
          <span className="text-2xl font-bold mt-1">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : totalEmployees}
          </span>
        </div>
        <div className="flex-1 min-w-[160px] bg-background border rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">Active Employees</span>
          <span className="text-2xl font-bold mt-1">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : activeEmployees}
          </span>
        </div>
        <div className="flex-1 min-w-[160px] bg-background border rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">Ex-Employees</span>
          <span className="text-2xl font-bold mt-1">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : exEmployees}
          </span>
        </div>
        <div className="flex-1 min-w-[160px] bg-background border rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">Male</span>
          <span className="text-2xl font-bold mt-1">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : maleEmployees}
          </span>
        </div>
        <div className="flex-1 min-w-[160px] bg-background border rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">Female</span>
          <span className="text-2xl font-bold mt-1">
            {isAnalyticsLoading ? <span className="animate-pulse bg-gray-700 rounded w-10 h-6 inline-block" /> : femaleEmployees}
          </span>
        </div>
      </div>
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col space-y-4 justify-between items-start">
            <CardTitle className="m-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span>Employee List</span>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button onClick={handleAddNew} size="sm" className="h-9 px-3">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Employee
                </Button>
                <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9 px-3">Filters</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-4 space-y-2">
                    <div>
                      <div className="font-semibold mb-1">Gender</div>
                      <div className="flex flex-col gap-1">
                        <Button variant={genderFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setGenderFilter('ALL')}>
                          {genderFilter === 'ALL' && <Check className="w-4 h-4 mr-2" />}All
                        </Button>
                        <Button variant={genderFilter === 'MALE' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setGenderFilter('MALE')}>
                          {genderFilter === 'MALE' && <Check className="w-4 h-4 mr-2" />}Male
                        </Button>
                        <Button variant={genderFilter === 'FEMALE' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setGenderFilter('FEMALE')}>
                          {genderFilter === 'FEMALE' && <Check className="w-4 h-4 mr-2" />}Female
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold mb-1">Employee Status</div>
                      <div className="flex flex-col gap-1">
                        <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setStatusFilter('ALL')}>
                          {statusFilter === 'ALL' && <Check className="w-4 h-4 mr-2" />}All
                        </Button>
                        <Button variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setStatusFilter('ACTIVE')}>
                          {statusFilter === 'ACTIVE' && <Check className="w-4 h-4 mr-2" />}Active Employee
                        </Button>
                        <Button variant={statusFilter === 'EX_EMPLOYEE' ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setStatusFilter('EX_EMPLOYEE')}>
                          {statusFilter === 'EX_EMPLOYEE' && <Check className="w-4 h-4 mr-2" />}Ex-Employee
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardTitle>
            <div className="flex flex-col w-full gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-start sm:justify-end">
                  <div className="inline-flex flex-wrap items-center gap-2">
                    {searchQuery && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery('')}
                        className="h-9 inline-flex items-center gap-1 px-3"
                      >
                        <FilterX className="h-4 w-4 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Employee Status</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && users?.length === 0 ? (
                  <TableSkeleton rows={5} cols={9} />
                ) : sortedUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No employees found</TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.firstName}</TableCell>
                      <TableCell>{user.lastName}</TableCell>
                      <TableCell>{user.gender === 'MALE' ? 'Male' : user.gender === 'FEMALE' ? 'Female' : '-'}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.employmentStatus === 'EX_EMPLOYEE' ? 'Ex-Employee' : 'Active'}</TableCell>
                      <TableCell className="relative">
                        {user.visiblePassword ? (
                          <>
                            <span className="font-mono">
                              {showPasswords[user.id!] ? user.visiblePassword : '••••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 absolute top-1/2 -translate-y-1/2 ml-2"
                              onClick={() => togglePasswordVisibility(user.id!)}
                              title="Toggle Password Visibility"
                            >
                              {showPasswords[user.id!] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {user.department?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {user.department.map(dept => {
                              let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
                              if (dept === "INVOICE_MANAGEMENT") variant = "secondary";
                              if (dept === "RECEIPT_MANAGEMENT") variant = "default";
                              if (dept === "PURCHASE_MANAGEMENT") variant = "destructive";
                              if (dept === "DELIVERY_MEMO_MANAGEMENT") variant = "outline";
                              if (dept === "ATTENDANCE_MANAGEMENT") variant = "outline";
                              if (dept === "ALL_ROUNDER") variant = "outline";
                              return (
                                <Badge 
                                  key={dept} 
                                  variant={variant} 
                                  className="whitespace-nowrap text-xs px-2 py-0.5 rounded-full font-normal"
                                >
                                  {dept
                                    .split('_')
                                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{user.type}</TableCell>
                      <TableCell className="text-right">
                        <div className="grid grid-cols-2 grid-rows-2 gap-2 min-w-[160px]">
                          {/* Row 1: Call, Logout */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 col-span-1 row-span-1"
                            title="Call Phone Numbers"
                            disabled={!user.phoneNumber || user.phoneNumber.length === 0 || !user.phoneNumber[0]}
                            onClick={() => {
                              if (!user.phoneNumber || user.phoneNumber.length === 0 || !user.phoneNumber[0]) return;
                              if (user.phoneNumber.length === 1) {
                                window.open(`tel:${user.phoneNumber[0]}`);
                              } else {
                                setSelectedUserForPhone(user);
                                setPhoneDialogOpen(true);
                              }
                            }}
                          >
                            <PhoneIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 col-span-1 row-span-1"
                            onClick={() => handleLogoutAllDevices(user.id!)}
                            title="Logout from all devices"
                            aria-label="Logout from all devices"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                          {/* Row 2: Edit, Delete, Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 col-span-1 row-start-2"
                            onClick={() => handleEdit(user)}
                            aria-label="Edit employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 col-span-1 row-start-2"
                            onClick={() => handleDelete(user.id!)}
                            aria-label="Delete employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 col-span-1 row-start-2"
                            onClick={() => setDetailsUser(user)}
                            aria-label="Employee Details"
                            title="Employee Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log out the user from all devices. They will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!detailsUser} onOpenChange={() => setDetailsUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {detailsUser && (
            <div className="space-y-4">
              {/* Images */}
              <div className="flex flex-row items-center justify-center gap-10 mb-4">
                {/* Profile Image Preview */}
                <div className="h-20 w-20 rounded-full border-2 border-gray-300 shadow-md overflow-hidden flex items-center justify-center bg-background">
                  {detailsUser.profileImage ? (
                    <ShowImage
                      images={[detailsUser.profileImage]}
                      text=""
                      trigger={
                        <img
                          src={getS3BucketUrl(detailsUser.profileImage)}
                          alt="Profile"
                          className="h-20 w-20 rounded-full object-cover cursor-pointer transition-transform duration-200 hover:scale-105"
                        />
                      }
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                {/* Aadhaar Image Preview */}
                <div className="h-20 w-20 rounded-lg border-2 border-gray-300 shadow-md overflow-hidden flex items-center justify-center bg-background">
                  {detailsUser.aadhaarImage ? (
                    <ShowImage
                      images={[detailsUser.aadhaarImage]}
                      text=""
                      trigger={
                        <img
                          src={getS3BucketUrl(detailsUser.aadhaarImage)}
                          alt="Aadhaar"
                          className="h-20 w-20 rounded object-cover cursor-pointer transition-transform duration-200 hover:scale-105"
                        />
                      }
                    />
                  ) : (
                    <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
              </div>
              <div className="border-b border-gray-300 mb-4" />
              {/* Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-[15px]">
                <div><span className="font-semibold text-gray-300">Name:</span> <span className="text-white">{detailsUser.firstName} {detailsUser.lastName}</span></div>
                <div><span className="font-semibold text-gray-300">Username:</span> <span className="text-white">{detailsUser.username}</span></div>
                <div><span className="font-semibold text-gray-300">Gender:</span> <span className="text-white">{detailsUser.gender?.replace('_', ' ')}</span></div>
                <div><span className="font-semibold text-gray-300">Phone:</span> <span className="text-white">{Array.isArray(detailsUser.phoneNumber) && detailsUser.phoneNumber.length > 0 ? detailsUser.phoneNumber.join(', ') : (detailsUser.phoneNumber || '-')}</span></div>
                <div><span className="font-semibold text-gray-300">Email:</span> <span className="text-white">{detailsUser.email || '-'}</span></div>
                <div><span className="font-semibold text-gray-300">Address:</span> <span className="text-white">{detailsUser.address || '-'}</span></div>
                <div><span className="font-semibold text-gray-300">Department:</span> <span className="text-white">{formatDepartment(detailsUser.department)}</span></div>
                <div><span className="font-semibold text-gray-300">User Type:</span> <span className="text-white">{detailsUser.type}</span></div>
                <div><span className="font-semibold text-gray-300">Status:</span> <span className="text-white">{detailsUser.employmentStatus}</span></div>
                <div><span className="font-semibold text-gray-300">Employment Start:</span> <span className="text-white">{detailsUser.employmentStart ? new Date(detailsUser.employmentStart).toLocaleDateString() : '-'}</span></div>
                <div><span className="font-semibold text-gray-300">Employment End:</span> <span className="text-white">{detailsUser.employmentEnd ? new Date(detailsUser.employmentEnd).toLocaleDateString() : '-'}</span></div>
                <div><span className="font-semibold text-gray-300">Duration:</span> <span className="text-white">{getEmploymentDuration(detailsUser.employmentStart, detailsUser.employmentEnd)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Phone Numbers</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedUserForPhone?.phoneNumber && selectedUserForPhone.phoneNumber.length > 0 ? (
              selectedUserForPhone.phoneNumber.map((num, idx) => (
                <button
                  key={idx}
                  className="px-3 py-2 bg-muted rounded flex items-center w-full text-left hover:bg-primary/10 transition"
                  onClick={() => window.open(`tel:${num}`)}
                >
                  <span className="font-mono text-base">{num}</span>
                </button>
              ))
            ) : (
              <div className="text-muted-foreground">No phone numbers available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}