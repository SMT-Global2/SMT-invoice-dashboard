import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { toast } from '@/components/ui/use-toast'

export interface DayStartInvoiceRecord {
  id: string
  date: string
  invoiceStartNo: number
  invoiceEndNo: number | null
}

export interface SequenceHistoryEntry {
  id: string
  date: string
  changedBy: string
  changedAt: string
  prevStartNo: number
  prevEndNo: number | null
  newStartNo: number
  newEndNo: number | null
  deletedCount: number
}

export type ConfirmStep = 0 | 1 | 2 | 3

export interface EditValues {
  startNo: string
  endNo: string
}

interface InvoiceSequenceState {
  records: DayStartInvoiceRecord[]
  isLoading: boolean
  error: string | null

  history: SequenceHistoryEntry[]
  isHistoryLoading: boolean

  editingId: string | null
  editValues: EditValues
  originalValues: { startNo: number; endNo: number | null }

  confirmStep: ConfirmStep
  isCommitting: boolean
  passwordError: string | null

  fetchRecords: () => Promise<void>
  fetchHistory: () => Promise<void>
  startEdit: (record: DayStartInvoiceRecord) => void
  updateEditValues: (values: Partial<EditValues>) => void
  cancelEdit: () => void
  beginConfirmation: () => void
  advanceStep: (step: ConfirmStep) => void
  verifyPassword: (password: string) => Promise<boolean>
  commitChanges: (password: string) => Promise<void>
  resetConfirmation: () => void
}

export const useInvoiceSequenceStore = create<InvoiceSequenceState>()(
  devtools(
    (set, get) => ({
      records: [],
      isLoading: false,
      error: null,
      history: [],
      isHistoryLoading: false,
      editingId: null,
      editValues: { startNo: '', endNo: '' },
      originalValues: { startNo: 0, endNo: null },
      confirmStep: 0,
      isCommitting: false,
      passwordError: null,

      fetchRecords: async () => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/admin/invoice-sequence')
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.message || 'Failed to fetch records')
          }
          set({ records: json.data, isLoading: false })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          set({ error: message, isLoading: false })
        }
      },

      fetchHistory: async () => {
        set({ isHistoryLoading: true })
        try {
          const res = await fetch('/api/admin/invoice-sequence/history')
          const json = await res.json()
          if (!res.ok || !json.success) {
            throw new Error(json.message || 'Failed to fetch history')
          }
          set({ history: json.data, isHistoryLoading: false })
        } catch {
          set({ isHistoryLoading: false })
        }
      },

      startEdit: (record) => {
        set({
          editingId: record.id,
          editValues: {
            startNo: String(record.invoiceStartNo),
            endNo: record.invoiceEndNo !== null ? String(record.invoiceEndNo) : ''
          },
          originalValues: { startNo: record.invoiceStartNo, endNo: record.invoiceEndNo }
        })
      },

      updateEditValues: (values) => {
        set((state) => ({ editValues: { ...state.editValues, ...values } }))
      },

      cancelEdit: () => {
        set({
          editingId: null,
          editValues: { startNo: '', endNo: '' },
          originalValues: { startNo: 0, endNo: null }
        })
      },

      beginConfirmation: () => {
        const { editValues } = get()
        const startNo = parseInt(editValues.startNo, 10)

        if (!editValues.startNo || isNaN(startNo) || startNo < 1) {
          toast({ title: 'Invalid start number', description: 'Start number must be a positive integer.', variant: 'destructive' })
          return
        }

        if (editValues.endNo !== '') {
          const endNo = parseInt(editValues.endNo, 10)
          if (isNaN(endNo) || endNo < 1) {
            toast({ title: 'Invalid end number', description: 'End number must be a positive integer.', variant: 'destructive' })
            return
          }
          if (endNo < startNo) {
            toast({ title: 'Invalid range', description: 'End number must be greater than or equal to start number.', variant: 'destructive' })
            return
          }
        }

        set({ confirmStep: 1 })
      },

      advanceStep: (step) => {
        set({ confirmStep: step, passwordError: null })
      },

      verifyPassword: async (password) => {
        try {
          const res = await fetch('/api/admin/invoice-sequence/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          })
          const json = await res.json()
          if (!res.ok) {
            set({ passwordError: json.message || 'Verification failed' })
            return false
          }
          if (!json.valid) {
            set({ passwordError: 'Incorrect password. Please try again.' })
            return false
          }
          set({ passwordError: null })
          return true
        } catch {
          set({ passwordError: 'Network error. Please try again.' })
          return false
        }
      },

      commitChanges: async (password) => {
        const { editingId, editValues } = get()
        if (!editingId) return

        set({ isCommitting: true })

        const invoiceStartNo = parseInt(editValues.startNo, 10)
        const invoiceEndNo = editValues.endNo !== '' ? parseInt(editValues.endNo, 10) : null

        try {
          const res = await fetch('/api/admin/invoice-sequence', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, invoiceStartNo, invoiceEndNo, password })
          })
          const json = await res.json()

          if (!res.ok || !json.success) {
            toast({
              title: 'Update failed',
              description: json.message || 'Could not update invoice sequence.',
              variant: 'destructive'
            })
            set({ isCommitting: false })
            return
          }

          const updated: DayStartInvoiceRecord = json.data
          set((state) => ({
            records: state.records.map((r) => (r.id === updated.id ? updated : r)),
            isCommitting: false
          }))

          get().resetConfirmation()
          get().cancelEdit()

          const deletedCount: number = json.deletedCount ?? 0
          const description = deletedCount > 0
            ? `Record for ${updated.date} updated. ${deletedCount} out-of-range invoice${deletedCount === 1 ? '' : 's'} deleted.`
            : `Record for ${updated.date} has been updated successfully.`

          toast({ title: 'Invoice sequence updated', description })

          // Refresh history after a successful change
          get().fetchHistory()
        } catch {
          toast({ title: 'Update failed', description: 'A network error occurred.', variant: 'destructive' })
          set({ isCommitting: false })
        }
      },

      resetConfirmation: () => {
        set({ confirmStep: 0, passwordError: null, isCommitting: false })
      }
    }),
    { name: 'invoice-sequence-store' }
  )
)
