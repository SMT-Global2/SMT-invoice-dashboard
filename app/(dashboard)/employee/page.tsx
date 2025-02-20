"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import { useUsersStore } from "@/store/useUsersStore"
import { EmployeeDialog } from "./employee-dialog"

export default function EmployeePage() {
  const { users, fetchUsers, deleteUser, setSelectedUser } = useUsersStore()

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleEdit = (user: any) => {
    setSelectedUser(user)
  }

  const handleDelete = async (id: string) => {
    await deleteUser(id)
    await fetchUsers()
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee List</h1>
        <Button onClick={() => setSelectedUser(null)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.phoneNumber}</TableCell>
              <TableCell>{user.type}</TableCell>
              <TableCell className="text-right">
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
          ))}
        </TableBody>
      </Table>

      <EmployeeDialog />
    </div>
  )
}