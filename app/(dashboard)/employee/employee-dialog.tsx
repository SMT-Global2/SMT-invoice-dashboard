"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsersStore , User, UserSchema } from "@/store/useUsersStore"

export function EmployeeDialog() {
  const { selectedUser, setSelectedUser, createUser, updateUser } = useUsersStore()
  
  const open = selectedUser !== undefined && selectedUser !== null
  
  const form = useForm<User>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      phoneNumber: "",
      email: "",
      address: "",
      department: "RECEIPT_MANAGEMENT",
      type: "USER",
    },
  })

  useEffect(() => {
    if (selectedUser) {
      form.reset({
        firstName: selectedUser.firstName || "",
        lastName: selectedUser.lastName || "",
        username: selectedUser.username || "",
        password: selectedUser.visiblePassword || "",
        visiblePassword: selectedUser.visiblePassword || "",
        phoneNumber: selectedUser.phoneNumber || "",
        email: selectedUser.email || "",
        address: selectedUser.address || "",
        department: selectedUser.department || "RECEIPT_MANAGEMENT",
        type: selectedUser.type || "USER",
      })
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        visiblePassword: "",
        phoneNumber: "",
        email: "",
        address: "",
        department: "RECEIPT_MANAGEMENT",
        type: "USER",
      })
    }
  }, [selectedUser, form])

  const onSubmit = async (data: User) => {
    try {
      if (selectedUser?.id) {
        await updateUser(selectedUser.id, data)
      } else {
        await createUser(data)
      }
      setSelectedUser(null)
      form.reset()
    } catch (error) {
      console.error("Failed to save employee:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => setSelectedUser(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] 2xl:w-[65vw] p-4 sm:p-6 gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">
            {selectedUser?.id ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-3" 
            autoComplete="off"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">First Name</FormLabel>
                    <FormControl>
                      <Input className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Last Name</FormLabel>
                    <FormControl>
                      <Input className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Username</FormLabel>
                    <FormControl>
                      <Input className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visiblePassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="bg-background" 
                        autoComplete="off"
                        {...field}
                        value={field.value || ''} 
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          form.setValue('password', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Phone Number</FormLabel>
                    <FormControl>
                      <Input className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        className="bg-background"
                        placeholder="Enter email address"
                        {...field} 
                        value={field.value || ''} 
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Address (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      className="bg-background"
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Department</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RECEIPT_MANAGEMENT">Receipt Management</SelectItem>
                        <SelectItem value="INVOICE_MANAGEMENT">Invoice Management</SelectItem>
                        <SelectItem value="ALL_ROUNDER">All-Rounder</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedUser(null)}
                className="bg-background h-8 text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-8 text-sm">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
