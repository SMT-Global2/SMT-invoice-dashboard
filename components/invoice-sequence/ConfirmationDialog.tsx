'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useInvoiceSequenceStore } from '@/store/useInvoiceSequenceStore'
import { SlideToConfirm } from './SlideToConfirm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-1">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`h-2 rounded-full transition-all duration-300 ${
            step < current
              ? 'w-4 bg-primary'
              : step === current
              ? 'w-6 bg-primary'
              : 'w-2 bg-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

export function ConfirmationDialog() {
  const {
    confirmStep,
    records,
    editingId,
    originalValues,
    editValues,
    passwordError,
    isCommitting,
    advanceStep,
    verifyPassword,
    commitChanges,
    resetConfirmation
  } = useInvoiceSequenceStore()

  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifiedPassword, setVerifiedPassword] = useState('')

  useEffect(() => {
    if (confirmStep === 0) {
      setPassword('')
      setVerifiedPassword('')
      setIsVerifying(false)
    }
  }, [confirmStep])

  const editingRecord = records.find((r) => r.id === editingId)

  const newStartNo = editValues.startNo ? parseInt(editValues.startNo, 10) : null
  const newEndNo = editValues.endNo !== '' ? parseInt(editValues.endNo, 10) : null

  const displayDate = editingRecord
    ? (() => {
        try {
          return format(parseISO(editingRecord.date), 'd MMM yyyy')
        } catch {
          return editingRecord.date
        }
      })()
    : ''

  const handleVerify = async () => {
    if (!password || isVerifying) return
    setIsVerifying(true)
    const valid = await verifyPassword(password)
    setIsVerifying(false)
    if (valid) {
      setVerifiedPassword(password)
      advanceStep(3)
    }
  }

  const handleConfirm = async () => {
    await commitChanges(verifiedPassword)
  }

  return (
    <Dialog open={confirmStep > 0} onOpenChange={(open) => { if (!open) resetConfirmation() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <StepDots current={confirmStep as number} />
          {confirmStep === 1 && (
            <>
              <DialogTitle>Confirm Changes</DialogTitle>
              <DialogDescription>
                Slide to confirm you want to proceed with editing this invoice sequence record.
              </DialogDescription>
            </>
          )}
          {confirmStep === 2 && (
            <>
              <DialogTitle>Verify Identity</DialogTitle>
              <DialogDescription>
                Enter your admin password to continue.
              </DialogDescription>
            </>
          )}
          {confirmStep === 3 && (
            <>
              <DialogTitle>Final Confirmation</DialogTitle>
              <DialogDescription>
                Review the changes below before applying them.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Step 1 — Slide to Confirm */}
        {confirmStep === 1 && (
          <div className="py-2">
            <SlideToConfirm
              onConfirmed={() => advanceStep(2)}
              label="Slide to proceed"
              resetKey={confirmStep}
            />
          </div>
        )}

        {/* Step 2 — Password */}
        {confirmStep === 2 && (
          <div className="space-y-4 py-2">
            {passwordError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }}
                placeholder="Enter your password"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 3 — Diff + Final Confirm */}
        {confirmStep === 3 && (
          <div className="space-y-4 py-2">
            {/* Irreversible warning */}
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              These changes are IRREVERSIBLE. Review carefully before confirming.
            </div>

            {/* Deletion warnings — shown only when invoices will actually be removed */}
            {newEndNo !== null && originalValues.endNo !== null && newEndNo < originalValues.endNo && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Invoices on this date with numbers{' '}
                  <span className="font-mono font-semibold">{newEndNo + 1}–{originalValues.endNo}</span>{' '}
                  will be permanently deleted.
                </span>
              </div>
            )}
            {newStartNo !== null && newStartNo > originalValues.startNo && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Invoices on this date with numbers below{' '}
                  <span className="font-mono font-semibold">{newStartNo}</span>{' '}
                  will be permanently deleted.
                </span>
              </div>
            )}

            {/* Date */}
            <p className="text-sm text-muted-foreground text-center">
              Modifying record for date:{' '}
              <span className="font-semibold text-foreground">{displayDate}</span>
            </p>

            {/* Before / After */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
                  Before
                </p>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start No: </span>
                    <span className="font-mono font-semibold">{originalValues.startNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End No: </span>
                    <span className="font-mono font-semibold">
                      {originalValues.endNo !== null ? originalValues.endNo : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                  After
                </p>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start No: </span>
                    <span className="font-mono font-semibold">{newStartNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End No: </span>
                    <span className="font-mono font-semibold">
                      {newEndNo !== null ? newEndNo : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={resetConfirmation} disabled={isCommitting}>
            Cancel
          </Button>

          {confirmStep === 2 && (
            <Button onClick={handleVerify} disabled={isVerifying || !password}>
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verify
            </Button>
          )}

          {confirmStep === 3 && (
            <Button variant="destructive" onClick={handleConfirm} disabled={isCommitting}>
              {isCommitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm & Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
