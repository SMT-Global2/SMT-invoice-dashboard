import { create } from 'zustand'
import { z } from 'zod'
import { toast } from '@/components/ui/use-toast'

// Zod schema for PartyCode validation
export const PartyCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  customerName: z.string().optional(),
  city: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export type PartyCode = z.infer<typeof PartyCodeSchema>

interface PartyStore {
  parties: PartyCode[]
  isLoading: boolean
  error: string | null
  selectedParty: PartyCode | null
  
  // Actions
  fetchParties: () => Promise<void>
  createParty: (party: Omit<PartyCode, 'id'>) => Promise<void>
  updateParty: (id: string, party: Partial<PartyCode>) => Promise<void>
  deleteParty: (id: string) => Promise<void>
  setSelectedParty: (party: PartyCode | null) => void
}

const useParty = create<PartyStore>((set, get) => ({
  parties: [],
  isLoading: false,
  error: null,
  selectedParty: null,

  fetchParties: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch('/api/partycode')
      if (!response.ok) throw new Error('Failed to fetch party codes')
      const { data } = await response.json()
      set({ parties: data, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch party codes', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch party codes"
      })
    }
  },

  createParty: async (party) => {
    try {
      set({ isLoading: true, error: null })
      const validatedParty = PartyCodeSchema.parse(party)
      const response = await fetch('/api/partycode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedParty)
      })
      if (!response.ok) throw new Error('Failed to create party code')
      const data = await response.json()
      set(state => ({
        parties: [...state.parties, data],
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "Party code created successfully"
      })
    } catch (error) {
      set({ error: 'Failed to create party code', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create party code"
      })
    }
  },

  updateParty: async (id, party) => {
    try {
      set({ isLoading: true, error: null })
      const validatedParty = PartyCodeSchema.partial().parse(party)
      const response = await fetch(`/api/partycode/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...validatedParty })
      })
      if (!response.ok) throw new Error('Failed to update party code')
      const data = await response.json()
      set(state => ({
        parties: state.parties.map(p => p.id === id ? data : p),
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "Party code updated successfully"
      })
    } catch (error) {
      set({ error: 'Failed to update party code', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update party code"
      })
    }
  },

  deleteParty: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const response = await fetch(`/api/partycode/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete party code')
      set(state => ({
        parties: state.parties.filter(p => p.id !== id),
        isLoading: false
      }))
      toast({
        title: "Success",
        description: "Party code deleted successfully"
      })
    } catch (error) {
      set({ error: 'Failed to delete party code', isLoading: false })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete party code"
      })
    }
  },

  setSelectedParty: (party) => {
    set({ selectedParty: party })
  }
}))