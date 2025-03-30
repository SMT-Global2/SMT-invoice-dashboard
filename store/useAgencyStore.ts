import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for AgencyCode validation
export const AgencyCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Agency code is required"),
  companyName: z.string().optional(),
  shortName: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type AgencyCode = z.infer<typeof AgencyCodeSchema>

interface Pagination {
  page: number
  limit: number
}

interface AgencyStore {
  agencies: AgencyCode[]
  isLoading: boolean
  error: string | null
  selectedAgency: AgencyCode | null
  
  // Pagination properties
  pagination: Pagination
  totalPages: number
  
  // Actions
  fetchAgencies: (search?: string) => Promise<void>
  createAgency: (agency: Omit<AgencyCode, 'id'>) => Promise<void>
  updateAgency: (id: string, agency: Partial<AgencyCode>) => Promise<void>
  deleteAgency: (id: string) => Promise<void>
  setSelectedAgency: (agency: AgencyCode | null) => void
  
  // Pagination actions
  setPagination: (pagination: Pagination) => void
  setPage: (page: number) => void
  setItemsPerPage: (limit: number) => void
}

export const useAgencyStore = create<AgencyStore>((set, get) => ({
  agencies: [],
  isLoading: false,
  error: null,
  selectedAgency: null,
  pagination: {
    page: 0,
    limit: 10,
  },
  totalPages: 0,

  fetchAgencies: async (search = "") => {
    try {
      const { pagination } = get()
      set({ isLoading: true, error: null })
      const response = await fetch(
        `/api/agency?page=${pagination.page}&limit=${pagination.limit}&search=${search}`
      )
      if (!response.ok) throw new Error('Failed to fetch agencies')
      const { data, total } = await response.json()
      set({ 
        agencies: data, 
        totalPages: Math.ceil(total / pagination.limit),
        isLoading: false 
      })
    } catch (error) {
      set({ error: 'Failed to fetch agencies', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch agencies"
      })
    }
  },

  createAgency: async (agency) => {
    try {
      set({ isLoading: true, error: null })
      const validatedAgency = AgencyCodeSchema.parse(agency)
      const response = await fetch('/api/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedAgency)
      })
      if (!response.ok) throw new Error('Failed to create agency')
      await get().fetchAgencies()
      toast({
        title: "Success",
        description: "Agency created successfully"
      })
    } catch (error) {
      set({ error: 'Failed to create agency', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create agency"
      })
    }
  },

  updateAgency: async (id, agency) => {
    try {
      set({ isLoading: true, error: null })
      const validatedAgency = AgencyCodeSchema.partial().parse(agency)
      const response = await fetch(`/api/agency?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...validatedAgency })
      })
      if (!response.ok) throw new Error('Failed to update agency')
      await get().fetchAgencies()
      toast({
        title: "Success",
        description: "Agency updated successfully"
      })
    } catch (error) {
      set({ error: 'Failed to update agency', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update agency"
      })
    }
  },

  deleteAgency: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/agency?id=${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) throw new Error(data.message)

      await get().fetchAgencies()

      toast({
        title: "Success",
        description: "Agency deleted successfully"
      })

    } catch (error : any) {
      set({ error: 'Failed to delete agency', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete agency : " + error.message
      })
    }
  },

  setSelectedAgency: (agency) => {
    set({ selectedAgency: agency })
  },

  setPagination: (pagination) => {
    set({ pagination })
  },
  
  // New convenience methods for pagination
  setPage: (page) => {
    set((state) => ({ 
      pagination: { ...state.pagination, page } 
    }))
  },
  
  setItemsPerPage: (limit) => {
    set((state) => ({ 
      pagination: { ...state.pagination, limit, page: 0 } // Reset to first page when changing limit
    }))
    get().fetchAgencies()
  }
}))
