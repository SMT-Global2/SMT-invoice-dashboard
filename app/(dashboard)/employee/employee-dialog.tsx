"use client"

import { useEffect, useCallback, useState, useRef } from "react"
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
import { Check, X, Camera, Upload, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Image from "next/image"
import dynamic from 'next/dynamic'

// Add your S3 bucket and region here
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = 'ap-south-1';

const Webcam = dynamic(() => import('react-webcam') as any, { ssr: false }) as any;

function getS3Url(key: string | null) {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

export function EmployeeDialog() {
  const { selectedUser, setSelectedUser, createUser, updateUser, uploadUserImage } = useUsersStore()
  
  const open = selectedUser !== undefined && selectedUser !== null
  
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [aadhaarImageFile, setaadhaarImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [aadhaarImagePreview, setaadhaarImagePreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState<{ type: 'profile' | 'aadhaar' | null }>({ type: null });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""])
  
  const form = useForm<User>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      phoneNumber: [],
      email: "",
      address: "",
      department: ["INVOICE_MANAGEMENT"],
      type: "USER",
      profileImage: "",
      aadhaarImage: "",
      gender: "NOT_SPECIFIED",
    },
  })

  const webcamRef = useRef<any>(null);

  useEffect(() => {
    if (selectedUser) {
      form.reset({
        firstName: selectedUser.firstName || "",
        lastName: selectedUser.lastName || "",
        username: selectedUser.username || "",
        password: selectedUser.visiblePassword || "",
        visiblePassword: selectedUser.visiblePassword || "",
        phoneNumber: Array.isArray(selectedUser.phoneNumber) ? selectedUser.phoneNumber : (selectedUser.phoneNumber ? [selectedUser.phoneNumber] : [""]),
        email: selectedUser.email || "",
        address: selectedUser.address || "",
        department: selectedUser.department || ["INVOICE_MANAGEMENT"],
        type: selectedUser.type || "USER",
        profileImage: selectedUser.profileImage || "",
        aadhaarImage: selectedUser.aadhaarImage || "",
        gender: selectedUser.gender || "NOT_SPECIFIED",
        employmentStatus: selectedUser.employmentStatus || "ACTIVE",
        employmentStart: selectedUser.employmentStart ? new Date(selectedUser.employmentStart) : new Date(),
        employmentEnd: selectedUser.employmentEnd ? new Date(selectedUser.employmentEnd) : undefined,
        exitType: selectedUser.exitType || undefined,
        exitReason: selectedUser.exitReason || "",
      })
      
      // Reset image previews
      setProfileImagePreview(selectedUser.profileImage ? getS3Url(selectedUser.profileImage) : null)
      setaadhaarImagePreview(selectedUser.aadhaarImage ? getS3Url(selectedUser.aadhaarImage) : null)
      setPhoneNumbers(Array.isArray(selectedUser.phoneNumber) ? selectedUser.phoneNumber : (selectedUser.phoneNumber ? [selectedUser.phoneNumber] : [""]))
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        username: "",
        password: "",
        visiblePassword: "",
        phoneNumber: [""],
        email: "",
        address: "",
        department: ["INVOICE_MANAGEMENT"],
        type: "USER",
        profileImage: "",
        aadhaarImage: "",
        gender: "NOT_SPECIFIED",
        employmentStatus: "ACTIVE",
        employmentStart: new Date(),
        employmentEnd: undefined,
        exitType: undefined,
        exitReason: "",
      })
      
      // Reset image previews
      setProfileImagePreview(null)
      setaadhaarImagePreview(null)
      setPhoneNumbers([""])
    }
    
    // Reset file states when dialog opens/closes
    setProfileImageFile(null)
    setaadhaarImageFile(null)
  }, [selectedUser, form])

  // Set employmentEnd to today if status changes to EX_EMPLOYEE and employmentEnd is not set
  useEffect(() => {
    if (form.watch('employmentStatus') === 'EX_EMPLOYEE' && !form.getValues('employmentEnd')) {
      form.setValue('employmentEnd', new Date())
    }
  }, [form.watch('employmentStatus')])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'aadhaar') => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === 'profile') {
        setProfileImageFile(file)
        setProfileImagePreview(reader.result as string)
      } else {
        setaadhaarImageFile(file)
        setaadhaarImagePreview(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }, [])
  
  const removeImage = useCallback((type: 'profile' | 'aadhaar') => {
    if (type === 'profile') {
      setProfileImageFile(null)
      setProfileImagePreview(null)
      form.setValue('profileImage', '')
    } else {
      setaadhaarImageFile(null)
      setaadhaarImagePreview(null)
      form.setValue('aadhaarImage', '')
    }
  }, [form])

  const handleCapture = (type: 'profile' | 'aadhaar', imageSrc: string) => {
    if (type === 'profile') {
      setProfileImagePreview(imageSrc);
      setProfileImageFile(dataURLtoFile(imageSrc, 'profile.jpg'));
    } else {
      setaadhaarImagePreview(imageSrc);
      setaadhaarImageFile(dataURLtoFile(imageSrc, 'aadhaar.jpg'));
    }
    setCameraOpen({ type: null });
  };

  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg', bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  }

  const handlePhoneChange = (idx: number, value: string) => {
    const updated = [...phoneNumbers]
    updated[idx] = value
    setPhoneNumbers(updated)
    form.setValue("phoneNumber", updated)
  }

  const handleAddPhone = () => {
    setPhoneNumbers([...phoneNumbers, ""])
  }

  const handleRemovePhone = (idx: number) => {
    const updated = phoneNumbers.filter((_, i) => i !== idx)
    setPhoneNumbers(updated.length ? updated : [""])
    form.setValue("phoneNumber", updated.length ? updated : [""])
  }

  const onSubmit = async (data: User) => {
    try {
      data.phoneNumber = phoneNumbers.filter(num => num.trim() !== "")
      let profileImageKey = data.profileImage
      let aadhaarImageKey = data.aadhaarImage
      
      // If there's a new profile image, upload it first
      if (profileImageFile && selectedUser?.id) {
        profileImageKey = await uploadUserImage(selectedUser.id, 'profileImage', profileImageFile)
        setProfileImagePreview(getS3Url(profileImageKey))
      }
      
      // If there's a new aadhaar image, upload it
      if (aadhaarImageFile && selectedUser?.id) {
        aadhaarImageKey = await uploadUserImage(selectedUser.id, 'aadhaarImage', aadhaarImageFile)
        setaadhaarImagePreview(getS3Url(aadhaarImageKey))
      }
      
      // Update the data with the new image keys
      const updatedData = {
        ...data,
        profileImage: profileImageKey,
        aadhaarImage: aadhaarImageKey
      }
      
      if (selectedUser?.id) {
        await updateUser(selectedUser.id, updatedData)
      } else {
        await createUser(updatedData)

        // After creating the user, find the newly created user by username to upload images
        if (profileImageFile || aadhaarImageFile) {
          const { users } = useUsersStore.getState()
          const newUser = users.find(u => u.username === data.username)
          if (newUser?.id) {
            if (profileImageFile) {
              await uploadUserImage(newUser.id, 'profileImage', profileImageFile)
            }
            if (aadhaarImageFile) {
              await uploadUserImage(newUser.id, 'aadhaarImage', aadhaarImageFile)
            }
          }
        }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[99vw] max-w-4xl p-4 sm:p-8 gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">
            {selectedUser?.id ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6"
            autoComplete="off"
          >
            {/* Image upload section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6 items-start">
              {/* Profile Image */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Profile Image</p>
                <div className="relative h-40 w-40 bg-muted rounded-full overflow-hidden border-2 border-border">
                  {profileImagePreview ? (
                    <>
                      <Image 
                        src={profileImagePreview} 
                        alt="Profile Preview" 
                        fill 
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage('profile')}
                        className="absolute top-1 right-1 bg-background/80 p-1 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md text-xs flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      <span>Upload</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, 'profile')}
                    />
                  </label>
                  <button
                    type="button"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-3 py-2 rounded-md text-xs flex items-center gap-1"
                    onClick={() => setCameraOpen({ type: 'profile' })}
                  >
                    <Camera className="h-3 w-3" />
                    <span>Camera</span>
                  </button>
                </div>
              </div>
              {/* aadhaar Image */}
              <div className="flex flex-col items-center gap-2 md:col-span-2">
                <p className="text-sm font-medium">aadhaar Card Image</p>
                <div className="relative h-40 w-full max-w-md bg-muted rounded-md overflow-hidden border-2 border-border">
                  {aadhaarImagePreview ? (
                    <>
                      <Image 
                        src={aadhaarImagePreview} 
                        alt="aadhaar Preview" 
                        fill 
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage('aadhaar')}
                        className="absolute top-1 right-1 bg-background/80 p-1 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md text-xs flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      <span>Upload</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, 'aadhaar')}
                    />
                  </label>
                  <button
                    type="button"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-3 py-2 rounded-md text-xs flex items-center gap-1"
                    onClick={() => setCameraOpen({ type: 'aadhaar' })}
                  >
                    <Camera className="h-3 w-3" />
                    <span>Camera</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main form fields in a 3-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">First Name</FormLabel>
                  <FormControl><Input className="bg-background" {...field} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Last Name</FormLabel>
                  <FormControl><Input className="bg-background" {...field} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'NOT_SPECIFIED'}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NOT_SPECIFIED">-</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Username</FormLabel>
                  <FormControl><Input className="bg-background" {...field} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="visiblePassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Password</FormLabel>
                  <FormControl>
                    <Input className="bg-background" autoComplete="off" {...field} value={field.value || ''} onChange={(e) => { field.onChange(e.target.value); form.setValue('password', e.target.value); }} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Phone Numbers</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {phoneNumbers.map((phone, index) => (
                      <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                        <Input
                          type="text"
                          value={phone}
                          onChange={(e) => handlePhoneChange(index, e.target.value)}
                          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="Phone number"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhone(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddPhone}
                      className="h-8 px-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Phone
                    </Button>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" className="bg-background" placeholder="Enter email address" {...field} value={field.value || ''} onChange={(e) => { const value = e.target.value.trim(); field.onChange(value); }} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Address (Optional)</FormLabel>
                  <FormControl><Input className="bg-background" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">User Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              )} />
            </div>

            {/* Department and status row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Departments</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}>{field.value?.length ? `${field.value.length} department(s) selected` : "Select departments"}<X className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", field.value?.length > 0 ? "block" : "hidden")} onClick={(e) => { e.stopPropagation(); field.onChange([]); }} /></Button>
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
                              <CommandItem key={option.value} value={option.value} onSelect={() => { if (isSelected) { field.onChange(field.value?.filter((value) => value !== option.value)) } else { field.onChange([...(field.value || []), option.value]) } }}>
                                <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
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
                      return (<Badge key={dept} variant={variant} className="mb-1 rounded-full text-xs px-2 py-0.5 font-normal">{departmentOptions.find(opt => opt.value === dept)?.label}<X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => { field.onChange(field.value?.filter(value => value !== dept)) }} /></Badge>);
                    })}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="employmentStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Employee Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'ACTIVE'}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active Employee</SelectItem>
                      <SelectItem value="EX_EMPLOYEE">Ex-Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </div>

            {/* Dates and exit info row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="employmentStart" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Employment Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="bg-background" value={field.value ? new Date(field.value).toISOString().substring(0, 10) : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              {form.watch('employmentStatus') === 'EX_EMPLOYEE' && <>
                <FormField control={form.control} name="employmentEnd" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Employment End Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background" value={field.value ? new Date(field.value).toISOString().substring(0, 10) : ''} onChange={e => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="exitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Exit Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select exit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RESIGNED">Resigned</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="exitReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Exit Reason (Optional)</FormLabel>
                    <FormControl>
                      <Input className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </>}
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
        {cameraOpen.type && (
          <Dialog open={!!cameraOpen.type} onOpenChange={() => setCameraOpen({ type: null })}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Capture {cameraOpen.type === 'profile' ? 'Profile' : 'Aadhaar'} Image</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user' }}
                  className="rounded-md border"
                />
                <Button
                  onClick={() => {
                    if (webcamRef.current) {
                      const imageSrc = webcamRef.current.getScreenshot();
                      if (imageSrc) handleCapture(cameraOpen.type as 'profile' | 'aadhaar', imageSrc);
                    }
                  }}
                >
                  Capture
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
