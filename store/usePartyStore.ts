import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for PartyCode validation
export const PartyCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Party code is required"),
  customerName: z.string().optional(),
  city: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type PartyCode = z.infer<typeof PartyCodeSchema>

interface Pagination {
  page: number
  limit: number
}

interface PartyStore {
  parties: PartyCode[]
  isLoading: boolean
  error: string | null
  selectedParty: PartyCode | null
  pagination: Pagination
  totalPages: number
  
  // Actions
  fetchParties: (search?: string) => Promise<void>
  createParty: (party: Omit<PartyCode, 'id'>) => Promise<void>
  updateParty: (id: string, party: Partial<PartyCode>) => Promise<void>
  deleteParty: (id: string) => Promise<void>
  setSelectedParty: (party: PartyCode | null) => void
  setPagination: (pagination: Pagination) => void
}

export const usePartyStore = create<PartyStore>((set, get) => ({
  parties: [],
  isLoading: false,
  error: null,
  selectedParty: null,
  pagination: {
    page: 0,
    limit: 10,
  },
  totalPages: 0,

  fetchParties: async (search = "") => {
    try {
      const { pagination } = get()
      set({ isLoading: true, error: null })
      const response = await fetch(
        `/api/party?page=${pagination.page}&limit=${pagination.limit}&search=${search}`
      )
      if (!response.ok) throw new Error('Failed to fetch parties')
      const { data, total } = await response.json()
      set({ 
        parties: data, 
        totalPages: Math.ceil(total / pagination.limit),
        isLoading: false 
      })
    } catch (error) {
      set({ error: 'Failed to fetch parties', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch parties"
      })
    }
  },

  createParty: async (party) => {
    try {
      set({ isLoading: true, error: null })
      const validatedParty = PartyCodeSchema.parse(party)
      const response = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedParty)
      })
      if (!response.ok) throw new Error('Failed to create party')
      await get().fetchParties()
      toast({
        title: "Success",
        description: "Party created successfully"
      })
    } catch (error) {
      set({ error: 'Failed to create party', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create party"
      })
    }
  },

  updateParty: async (id, party) => {
    try {
      set({ isLoading: true, error: null })
      const validatedParty = PartyCodeSchema.partial().parse(party)
      const response = await fetch(`/api/party?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...validatedParty })
      })
      if (!response.ok) throw new Error('Failed to update party')
      await get().fetchParties()
      toast({
        title: "Success",
        description: "Party updated successfully"
      })
    } catch (error) {
      set({ error: 'Failed to update party', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update party"
      })
    }
  },

  deleteParty: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/party?id=${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (!data.success) throw new Error(data.message)
      await get().fetchParties()
      toast({
        title: "Success",
        description: "Party deleted successfully"
      })
    } catch (error : any) {
      set({ error: 'Failed to delete party', isLoading: false })
      console.log({error})
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete party : " + error.message
      })
    }
  },

  setSelectedParty: (party) => {
    set({ selectedParty: party })
  },

  setPagination: (pagination) => {
    set({ pagination })
  }
}))