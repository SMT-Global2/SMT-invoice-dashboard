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
import { PlusIcon, Pencil, Trash2, Eye, EyeOff, Search, FilterX } from "lucide-react"
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

export default function EmployeePage() {
  const { users, fetchUsers, deleteUser, setSelectedUser, isLoading } = useUsersStore()
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [debugUsers, setDebugUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

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
      phoneNumber: "",
      email: "",
      address: "",
      department: ["RECEIPT_MANAGEMENT"],
      type: "USER",
    })
  }

  const formatDepartment = (departments: string[] | undefined): string => {
    if (!departments?.length) return '-';

    return departments
      .map(dept => dept
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

  // Filter users based on search query
  const filteredUsers = users?.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Employee Management</h1>
      </div>
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col space-y-4 justify-between items-start">
            <CardTitle className="m-2">Employee List</CardTitle>
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
                    <Button onClick={handleAddNew} size="sm" className="h-9 px-3">
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Employee
                    </Button>
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
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && users?.length === 0 ? (
                  <TableSkeleton rows={5} cols={9} />
                ) : filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No employees found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{user.firstName}</TableCell>
                      <TableCell>{user.lastName}</TableCell>
                      <TableCell>{user.username}</TableCell>
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
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell>
                        {user.email?.trim() ? user.email : '-'}
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
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </div>
  )
}