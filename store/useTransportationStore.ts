import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for Transportation validation
export const TransportationSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  contactPersonName: z.string().optional().or(z.literal("")),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  remarks: z.string().optional().or(z.literal("")),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

export type Transportation = z.infer<typeof TransportationSchema>

interface TransportationStore {
  transportations: Transportation[]
  isLoading: boolean
  error: string | null
  selectedTransportation: Transportation | null
  pagination: {
    page: number
    limit: number
  }
  totalPages: number
  
  // Actions
  fetchTransportations: (search?: string) => Promise<void>
  createTransportation: (transportation: Transportation) => Promise<void>
  updateTransportation: (id: string, transportation: Transportation) => Promise<void>
  deleteTransportation: (id: string) => Promise<void>
  setSelectedTransportation: (transportation: Transportation | null) => void
  setPage: (page: number) => void
  setItemsPerPage: (limit: number) => void
}

export const useTransportationStore = create<TransportationStore>((set, get) => ({
  transportations: [],
  isLoading: false,
  error: null,
  selectedTransportation: null,
  pagination: {
    page: 0,
    limit: 10
  },
  totalPages: 0,

  fetchTransportations: async (search = "") => {
    try {
      set({ isLoading: true, error: null })
      const { page, limit } = get().pagination
      
      let url = `/api/transportation?page=${page + 1}&limit=${limit}`
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch transportations')
      
      const data = await response.json()
      set({ 
        transportations: data.data || [], 
        totalPages: Math.ceil((data.total || 0) / limit),
        isLoading: false 
      })
    } catch (error) {
      set({ error: 'Failed to fetch transportations', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transportation companies"
      })
    }
  },

  createTransportation: async (transportation) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/transportation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transportation)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const data = await response.json()
      
      // Refresh the list
      get().fetchTransportations()
      
      set({ isLoading: false })
      toast({
        title: "Success",
        description: "Transportation company created successfully"
      })
    } catch (error) {
      set({ error: 'Failed to create transportation company', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create transportation company"
      })
    }
  },

  updateTransportation: async (id, transportation) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/transportation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...transportation })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      const data = await response.json()
      
      // Refresh the list
      get().fetchTransportations()
      
      set({ isLoading: false })
      toast({
        title: "Success",
        description: "Transportation company updated successfully"
      })
    } catch (error) {
      set({ error: 'Failed to update transportation company', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transportation company"
      })
    }
  },

  deleteTransportation: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/transportation?id=${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      // Refresh the list
      get().fetchTransportations()
      
      set({ isLoading: false })
      toast({
        title: "Success",
        description: "Transportation company deleted successfully"
      })
    } catch (error) {
      set({ error: 'Failed to delete transportation company', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete transportation company"
      })
    }
  },

  setSelectedTransportation: (transportation) => {
    set({ selectedTransportation: transportation })
  },
  
  setPage: (page) => {
    set(state => ({
      pagination: {
        ...state.pagination,
        page
      }
    }))
  },
  
  setItemsPerPage: (limit) => {
    set(state => ({
      pagination: {
        ...state.pagination,
        limit
      }
    }))
  }
})) 