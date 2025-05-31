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
import { Department } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
      department: ["INVOICE_MANAGEMENT"],
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
        department: selectedUser.department || ["INVOICE_MANAGEMENT"],
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
        department: ["INVOICE_MANAGEMENT"],
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

  const departmentOptions = [
    { label: "Receipt Management", value: Department.RECEIPT_MANAGEMENT },
    { label: "Invoice Management", value: Department.INVOICE_MANAGEMENT },
    { label: "Purchase Management", value: Department.PURCHASE_MANAGEMENT },
    { label: "Delivery Memo Management", value: Department.DELIVERY_MEMO_MANAGEMENT },
    { label: "Attendance Management", value: Department.ATTENDANCE_MANAGEMENT },
    { label: "All Rounder", value: Department.ALL_ROUNDER },
  ]

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
                    <FormLabel className="text-sm">Departments</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value?.length && "text-muted-foreground"
                            )}
                          >
                            {field.value?.length
                              ? `${field.value.length} department(s) selected`
                              : "Select departments"}
                            <X
                              className={cn(
                                "ml-2 h-4 w-4 shrink-0 opacity-50",
                                field.value?.length > 0 ? "block" : "hidden"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                field.onChange([])
                              }}
                            />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search departments..." />
                          <CommandEmpty>No department found.</CommandEmpty>
                          <CommandGroup>
                            {departmentOptions.map((option) => {
                              const isSelected = field.value?.includes(option.value)
                              return (
                                <CommandItem
                                  key={option.value}
                                  value={option.value}
                                  onSelect={() => {
                                    if (isSelected) {
                                      field.onChange(
                                        field.value?.filter(
                                          (value) => value !== option.value
                                        )
                                      )
                                    } else {
                                      field.onChange([
                                        ...(field.value || []),
                                        option.value,
                                      ])
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {field.value?.map((dept) => {
                        let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
                        if (dept === "INVOICE_MANAGEMENT") variant = "secondary";
                        if (dept === "RECEIPT_MANAGEMENT") variant = "default";
                        if (dept === "PURCHASE_MANAGEMENT") variant = "destructive";
                        if (dept === "DELIVERY_MEMO_MANAGEMENT") variant = "outline";
                        if (dept === "ATTENDANCE_MANAGEMENT") variant = "outline";
                        if (dept === "ALL_ROUNDER") variant = "outline";
                        
                        return (
                          <Badge key={dept} variant={variant} className="mb-1 rounded-full text-xs px-2 py-0.5 font-normal">
                            {departmentOptions.find(opt => opt.value === dept)?.label}
                            <X
                              className="ml-1 h-3 w-3 cursor-pointer"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter(value => value !== dept)
                                )
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">User Type</FormLabel>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedUser?.id ? "Update" : "Create"} Employee
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
