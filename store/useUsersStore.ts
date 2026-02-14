import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'
import { Department } from '@prisma/client'
import { convertImage, compressImage } from '@/lib/helper'

// Zod schema for User validation
export const UserSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  visiblePassword: z.string().optional(),
  phoneNumber: z.array(z.string().regex(/^\d{0,15}$/, "Phone number must contain only digits").or(z.literal(""))),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  profileImage: z.string().optional().or(z.literal("")),
  aadhaarImage: z.string().optional().or(z.literal("")),
  department: z.array(z.enum([
    Department.ALL_ROUNDER, 
    Department.INVOICE_MANAGEMENT, 
    Department.RECEIPT_MANAGEMENT,
    Department.PURCHASE_MANAGEMENT,
    Department.DELIVERY_MEMO_MANAGEMENT,
    Department.ATTENDANCE_MANAGEMENT
  ])).min(1, "At least one department is required"),
  type: z.enum(["USER", "ADMIN"]),
  gender: z.enum(["MALE", "FEMALE", "NOT_SPECIFIED"]).default("NOT_SPECIFIED"),
  employmentStatus: z.enum(["ACTIVE", "EX_EMPLOYEE"]).default("ACTIVE"),
  exitType: z.enum(["RESIGNED", "TERMINATED"]).optional(),
  exitReason: z.string().optional(),
  employmentStart: z.coerce.date().default(new Date()),
  employmentEnd: z.coerce.date().optional(),
})

export type User = Omit<z.infer<typeof UserSchema>, 'phoneNumber'> & { phoneNumber: string[] }

interface UserStore {
  users: User[] 
  isLoading: boolean
  error: string | null
  selectedUser: User | null
  
  // Actions
  fetchUsers: () => Promise<void>
  createUser: (user: User) => Promise<void>
  updateUser: (id: string, user: User) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  setSelectedUser: (user: User | null) => void
  logoutFromAllDevices: (userId: string) => Promise<void>
  uploadUserImage: (userId: string, imageType: 'profileImage' | 'aadhaarImage', file: File) => Promise<string>
}

export const useUsersStore = create<UserStore>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  selectedUser: null,

  fetchUsers: async () => {
    try {
      console.log('Starting to fetch users from safe API');
      set({ isLoading: true, error: null })
      
      // Try the new safe API endpoint first
      const response = await fetch('/api/user/list');
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Successfully fetched users, count:', data?.length || 0);
      // Add empty department array to each user to prevent UI errors
      const usersWithDepartment = data.map((user: { department?: Department[] }) => ({
        ...user,
        department: user.department || []
      }));
      set({ users: usersWithDepartment, isLoading: false });
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      set({ error: 'Failed to fetch users', isLoading: false, users: [] });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      });
    }
  },

  createUser: async (user) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const data = await response.json()
      set(state => ({
        users: [...state.users, data],
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "User created successfully"
      })
    } catch (error) {
      set({ error: 'Failed to create user', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user"
      })
    }
  },

  updateUser: async (id, user) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...user })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const data = await response.json()
      set(state => ({
        users: state.users.map(u => u.id === id ? data : u),
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "User updated successfully"
      })
    } catch (error) {
      set({ error: 'Failed to update user', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user"
      })
    }
  },

  deleteUser: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/user?id=${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      set(state => ({
        users: state.users.filter(u => u.id !== id),
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "User deleted successfully"
      })
    } catch (error) {
      set({ error: 'Failed to delete user', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user"
      })
    }
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user })
  },

  logoutFromAllDevices: async (userId) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/user/logout-all-devices?id=${userId}`, {
        method: 'POST'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      toast({
        title: "Success",
        description: "User logged out from all devices"
      })
      set({ isLoading: false })
    } catch (error) {
      set({ error: 'Failed to logout user from all devices', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout user from all devices"
      })
    }
  },

  uploadUserImage: async (userId, imageType, file) => {
    try {
      set({ isLoading: true, error: null })
      // Get user info for naming
      const user = get().users.find(u => u.id === userId);
      const firstName = user?.firstName || 'unknown';
      const lastName = user?.lastName || 'unknown';
      // Determine type for API and correct field name for update
      const type = imageType === 'profileImage' ? 'profile' : 'aadhaar';
      const imageField = imageType === 'profileImage' ? 'profileImage' : 'aadhaarImage';
      // Convert and compress the image before upload
      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      // First, get a presigned URL for S3 upload
      const getPresignedUrlResponse = await fetch('/api/s3/presignedUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: `${imageType}-${userId}-${compressedFile.name}`,
          contentType: compressedFile.type,
          type,
          firstName,
          lastName
        })
      })
      if (!getPresignedUrlResponse.ok) {
        throw new Error('Failed to get presigned URL')
      }
      const { presignedUrl, key } = await getPresignedUrlResponse.json()
      // Upload the file to S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': compressedFile.type },
        body: compressedFile
      })
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3')
      }
      // Update the user with the new image URL
      const updateResponse = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: userId, 
          [imageField]: key 
        })
      })
      if (!updateResponse.ok) {
        throw new Error('Failed to update user with image URL')
      }
      const updatedUser = await updateResponse.json()
      // Update the user in the store
      set(state => ({
        users: state.users.map(u => u.id === userId ? updatedUser : u),
        isLoading: false
      }))
      toast({
        title: "Success",
        description: `${imageType === 'profileImage' ? 'Profile' : 'Aadhaar'} image uploaded successfully`
      })
      return key
    } catch (error) {
      set({ error: `Failed to upload ${imageType}`, isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to upload ${imageType}`
      })
      throw error
    }
  }
}))