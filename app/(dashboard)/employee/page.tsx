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
import { PlusIcon, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
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

export default function EmployeePage() {
  const { users, fetchUsers, deleteUser, setSelectedUser, isLoading } = useUsersStore()
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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
      department: "RECEIPT_MANAGEMENT",
      type: "USER",
    })
  }

  const formatDepartment = (department: string | undefined) => {
    if (!department) return '-';
    return department
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="m-2" >Employee List</CardTitle>
          <Button onClick={handleAddNew} size="sm" className="h-8 px-2 text-xs">
            <PlusIcon className="h-3 w-3 mr-1" />
            Add Employee
          </Button>
        </CardHeader>
        <CardContent>
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
                {isLoading ? (
                  <TableSkeleton rows={5} cols={9} />
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No employees found</TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => (
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
                      <TableCell>{formatDepartment(user.department)}</TableCell>
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