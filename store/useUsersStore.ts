import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for User validation
export const UserSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required").optional(),
  visiblePassword: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  department: z.enum(["RECEIPT_MANAGEMENT", "INVOICE_MANAGEMENT", "ALL_ROUNDER"]),
  type: z.enum(["USER", "ADMIN"]),
})

export type User = z.infer<typeof UserSchema>

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
}

export const useUsersStore = create<UserStore>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  selectedUser: null,

  fetchUsers: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      set({ users: data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch users', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      })
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
  }
}))