'use client'

import { useEffect } from 'react'
import { Hash } from 'lucide-react'
import { useInvoiceSequenceStore } from '@/store/useInvoiceSequenceStore'
import { SequenceTable } from '@/components/invoice-sequence/SequenceTable'
import { ConfirmationDialog } from '@/components/invoice-sequence/ConfirmationDialog'
import { HistoryCard } from '@/components/invoice-sequence/HistoryCard'

export default function InvoiceSequencePage() {
  const { fetchRecords, fetchHistory } = useInvoiceSequenceStore()

  useEffect(() => {
    fetchRecords()
    fetchHistory()
  }, [fetchRecords, fetchHistory])

  return (
    <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <Hash className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoice Sequence Manager</h1>
          <p className="text-sm text-muted-foreground">
            View and correct invoice sequence start / end numbers per day
          </p>
        </div>
      </div>
      <SequenceTable />
      <HistoryCard />
      <ConfirmationDialog />
    </div>
  )
}
