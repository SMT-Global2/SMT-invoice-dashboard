"use client"

import { useEffect, useState, useCallback } from 'react'
import moment from 'moment'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/helper'

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10] as const
export type DenominationBills = Record<(typeof DENOMINATIONS)[number], number>

const emptyBills: DenominationBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 }

function totalOf(bills: DenominationBills): number {
  return DENOMINATIONS.reduce((sum, d) => sum + d * (bills[d] || 0), 0)
}

export function EditDenominationDialog({
  open, onClose, date, username, onSaved,
}: {
  open: boolean
  onClose: () => void
  date: string
  username: string
  onSaved?: (bills: DenominationBills) => void
}) {
  const { toast } = useToast()
  const [bills, setBills] = useState<DenominationBills>(emptyBills)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchBills = useCallback(async () => {
    if (!username || !open) return
    setLoading(true)
    try {
      const res = await fetch(`/api/receipt/denomination?date=${date}&username=${encodeURIComponent(username)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to load')
      setBills({ ...emptyBills, ...(json.data?.bills ?? {}) })
    } catch (err) {
      console.error('Error loading daily denomination:', err)
      toast({ title: 'Error', description: 'Failed to load denomination.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [date, username, open, toast])

  useEffect(() => {
    if (open) {
      fetchBills()
    } else {
      setBills(emptyBills) // reset on close
    }
  }, [open, fetchBills])

  const handleChange = (d: (typeof DENOMINATIONS)[number]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10)
    const val = Number.isFinite(raw) && raw >= 0 ? raw : 0
    setBills((b) => ({ ...b, [d]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/receipt/denomination', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, username, bills }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to save')
      if (onSaved) onSaved({ ...bills })
      onClose()
      toast({ title: 'Saved', description: 'Denomination updated.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save denomination',
      })
    } finally {
      setSaving(false)
    }
  }

  const total = totalOf(bills)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Denomination — {moment(date).format('D MMM YYYY')}</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">User: <span className="font-semibold capitalize">{username}</span></div>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {DENOMINATIONS.map((d) => (
              <div key={d} className="grid grid-cols-4 items-center gap-2">
                <label className="text-right text-sm font-medium">₹{d} Notes</label>
                <Input
                  type="number"
                  min="0"
                  className="col-span-3"
                  value={bills[d] ?? 0}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={handleChange(d)}
                />
              </div>
            ))}
            <div className="flex justify-end items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-base font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
