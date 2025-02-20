import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for User validation
export const UserSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  type: z.enum(['ADMIN', 'USER']).default('USER'),
  username: z.string().min(3),
  password: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type User = z.infer<typeof UserSchema>

interface UserStore {
  users: User[]
  isLoading: boolean
  error: string | null
  selectedUser: User | null
  
  // Actions
  fetchUsers: () => Promise<void>
  createUser: (user: Omit<User, 'id'>) => Promise<void>
  updateUser: (id: string, user: Partial<User>) => Promise<void>
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
      const validatedUser = UserSchema.parse(user)
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedUser)
      })
      if (!response.ok) throw new Error('Failed to create user')
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
      const validatedUser = UserSchema.partial().parse(user)
      const response = await fetch(`/api/user/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...validatedUser })
      })
      if (!response.ok) throw new Error('Failed to update user')
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
      const response = await fetch(`/api/user/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete user')
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