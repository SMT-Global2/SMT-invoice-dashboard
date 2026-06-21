'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import moment from 'moment'
import { Loader2, Pencil, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/helper'
import { useReceiptStore } from '@/store/useReceiptStore'

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10] as const
export type DenominationBills = Record<(typeof DENOMINATIONS)[number], number>

const emptyBills: DenominationBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 }

export function totalOf(bills: DenominationBills): number {
  return DENOMINATIONS.reduce((sum, d) => sum + d * (bills[d] || 0), 0)
}

export function TodayDenominationCard() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const username = session?.user?.username
  const userType = session?.user?.type
  const { selectedDate } = useReceiptStore()

  const dateStr = moment(selectedDate ?? new Date()).format('YYYY-MM-DD')
  const isToday = dateStr === moment().format('YYYY-MM-DD')

  const [bills, setBills] = useState<DenominationBills>(emptyBills)
  const [allUserBills, setAllUserBills] = useState<{username: string, bills: DenominationBills, receiptAmount: number}[]>([])
  const [totalReceiptAmount, setTotalReceiptAmount] = useState(0)
  const [personalReceiptAmount, setPersonalReceiptAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    if (!username) return
    setIsLoading(true)
    try {
      // Fetch Receipt Summaries for difference calculation
      const summaryRes = await fetch(`/api/receipt/summary?date=${dateStr}`)
      const summaryJson = await summaryRes.json()
      const summaries = summaryJson.data || []
      
      const pSummary = summaries.find((s: any) => s.username === username)
      setPersonalReceiptAmount(pSummary?.totalAmount || 0)

      if (userType === 'ADMIN') {
        const res = await fetch(`/api/receipt/denomination/all?date=${dateStr}`)
        const json = await res.json()
        const users = json.data || []
        
        // Merge denominations and receipts
        const allUsernames = Array.from(new Set([
          ...users.map((u: any) => u.username),
          ...summaries.map((s: any) => s.username)
        ]))

        let grandReceipts = 0
        const combined = allUsernames.map(u => {
          const uBills = users.find((x: any) => x.username === u)?.bills || { ...emptyBills }
          const uReceipts = summaries.find((s: any) => s.username === u)?.totalAmount || 0
          grandReceipts += uReceipts
          return {
            username: u as string,
            bills: uBills,
            receiptAmount: uReceipts
          }
        })

        setAllUserBills(combined)
        setTotalReceiptAmount(grandReceipts)
        
        // Sum up for grand total
        const grandTotalBills = { ...emptyBills }
        combined.forEach((u: any) => {
          DENOMINATIONS.forEach(d => {
            grandTotalBills[d] += (u.bills[d] || 0)
          })
        })
        setBills(grandTotalBills)
      } else {
        const res = await fetch(`/api/receipt/denomination?date=${dateStr}&username=${encodeURIComponent(username)}`)
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.message || 'Failed to load')
        }
        const json = await res.json()
        setBills({ ...emptyBills, ...(json.data?.bills ?? {}) })
      }
    } catch (err) {
      console.error('Error loading daily denomination:', err)
    } finally {
      setIsLoading(false)
    }
  }, [dateStr, username, userType])

  useEffect(() => { fetchBills() }, [fetchBills])

  if (!username) return null

  const total = totalOf(bills)
  const isAdmin = userType === 'ADMIN'
  const relevantReceiptTotal = isAdmin ? totalReceiptAmount : personalReceiptAmount
  const diff = total - relevantReceiptTotal

  const getDiffColor = (d: number) => {
    if (d > 0) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (d < 0) return 'text-destructive bg-destructive/10 border-destructive/20'
    return 'text-muted-foreground bg-muted border-border'
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader 
          className="py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {isToday ? "Today's Denomination" : `Denomination — ${moment(dateStr).format('D MMM YYYY')}`}
              <span className="text-xs text-muted-foreground/80">({isAdmin ? 'Grand Total' : username})</span>
            </span>
            <span className="flex items-center gap-2">
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {!isAdmin && (
                <Button size="sm" variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  setEditingUser(username);
                }} className="h-7 gap-1">
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </span>
          </CardTitle>
        </CardHeader>
        {isOpen && (
          <CardContent className="py-3 pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {DENOMINATIONS.map((d) => {
                const count = bills[d] || 0
                return (
                  <div key={d} className={`flex flex-col border rounded-md overflow-hidden shadow-sm ${isAdmin ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                    <div className={`font-bold text-sm text-center py-1.5 border-b ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                      ₹{d}
                    </div>
                    <div className="p-3 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground mt-1 font-medium">
                        {formatCurrency(d * count)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Summary Bar */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex-1 flex justify-between sm:justify-start sm:gap-8 items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Receipts Total</span>
                  <span className="font-bold text-base">{formatCurrency(relevantReceiptTotal)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Cash Total</span>
                  <span className="font-bold text-base">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-md border flex items-center justify-between gap-4 ${getDiffColor(diff)}`}>
                <span className="text-xs font-semibold uppercase tracking-wider">Difference</span>
                <span className="font-bold text-lg">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</span>
              </div>
            </div>

            {/* User Summaries section moved to Collections by User */}
          </CardContent>
        )}
      </Card>

      <EditDenominationDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        date={dateStr}
        username={editingUser || username || ''}
        initial={isAdmin ? (allUserBills.find(u => u.username === editingUser)?.bills || emptyBills) : bills}
        onSaved={(saved) => {
          if (isAdmin) {
            fetchBills() // Refresh all to recalculate grand total
          } else {
            setBills(saved)
          }
          setEditingUser(null)
          toast({ title: 'Saved', description: 'Denomination updated.' })
        }}
      />
    </>
  )
}

export function EditDenominationDialog({
  open, onClose, date, username, initial, onSaved,
}: {
  open: boolean
  onClose: () => void
  date: string
  username: string
  initial: DenominationBills
  onSaved: (bills: DenominationBills) => void
}) {
  const { toast } = useToast()
  const [bills, setBills] = useState<DenominationBills>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setBills(initial) }, [open, initial])

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
      onSaved({ ...bills })
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
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
