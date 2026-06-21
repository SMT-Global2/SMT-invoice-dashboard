'use client'

import { useEffect, useState } from 'react'
import { FileText, FilterX, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { AgencyCodeSelector, AgencyCode } from '@/components/agency-code-selector'
import { ShowImage } from '@/components/show-image'
import { TakeImage } from '@/components/take-image'
import { useAgencyDeliveryMemoStore, SavedADMemo } from '@/store/useAgencyDeliveryMemoStore'
import { useToast } from '@/components/ui/use-toast'
import { toast as sonnerToast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { compressImage, convertImage, uploadFileToS3, tweleHrFormatDateString } from '@/lib/helper'
import { format, parseISO } from 'date-fns'
import moment from 'moment'

function formatDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy') } catch { return iso }
}

export default function AgencyDeliveryMemoPage() {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMemo, setEditMemo] = useState<SavedADMemo | null>(null)

  const {
    memos, isLoading, selectedDate, agencyFilter,
    currentPage, itemsPerPage,
    fetchMemos, resetMemo,
    setSelectedDate, setAgencyFilter, setCurrentPage, clearFilters,
  } = useAgencyDeliveryMemoStore()

  useEffect(() => { fetchMemos() }, [fetchMemos])

  const totalPages = Math.max(1, Math.ceil(memos.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * itemsPerPage
  const currentRows = memos.slice(startIdx, startIdx + itemsPerPage)

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p)
  }

  const handleAgencyFilterChange = (agency: AgencyCode) => {
    setAgencyFilter(agency.code)
    useAgencyDeliveryMemoStore.getState().fetchMemos()
  }

  const handleClearAgencyFilter = () => {
    setAgencyFilter('')
    useAgencyDeliveryMemoStore.getState().fetchMemos()
  }

  const handleReset = async (adNumber: number) => {
    try {
      await resetMemo(adNumber)
      toast({ title: 'Deleted', description: `AD Memo #${adNumber} deleted.` })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete memo',
      })
    }
  }

  const openCreate = () => {
    setEditMemo(null)
    setDialogOpen(true)
  }

  const openEdit = (memo: SavedADMemo) => {
    setEditMemo(memo)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4 overflow-hidden max-w-full px-2 sm:px-4 mt-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agency Delivery Memo</h1>
            <p className="text-sm text-muted-foreground">Manage agency delivery memos with LR details</p>
          </div>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New AD Memo
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle>Records</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative flex items-center gap-1">
                <div className="flex-1">
                  <AgencyCodeSelector
                    value={agencyFilter || null}
                    onChange={handleAgencyFilterChange}
                    placeholder="Filter by agency"
                  />
                </div>
                {agencyFilter && (
                  <button
                    onClick={handleClearAgencyFilter}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    title="Clear agency filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <DatePicker
                date={selectedDate ?? undefined}
                setDate={(d) => setSelectedDate(d ?? null)}
              />
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-9 inline-flex items-center gap-1 px-3"
              >
                <FilterX className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="overflow-x-auto w-full border rounded-lg scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Agency</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>LR Number</TableHead>
                    <TableHead className="w-28">LR Date</TableHead>
                    <TableHead className="w-28">Photos</TableHead>
                    <TableHead>Saved By</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : currentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentRows.map((memo, i) => (
                      <TableRow key={memo.id}>
                        <TableCell className="text-muted-foreground">{startIdx + i + 1}</TableCell>
                        <TableCell className="text-sm">{formatDate(memo.generatedDate)}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{memo.agencyCode}</div>
                          {memo.agencyName && (
                            <div className="text-xs text-muted-foreground">{memo.agencyName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{memo.voucherNumber || '—'}</TableCell>
                        <TableCell className="text-sm">{memo.lrNumber || '—'}</TableCell>
                        <TableCell className="text-sm">{formatDate(memo.lrDate)}</TableCell>
                        <TableCell>
                          <ShowImage images={memo.image} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{memo.createdBy}</div>
                          <div className="text-xs text-muted-foreground">{tweleHrFormatDateString(memo.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(memo)}
                              title="Edit memo"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete AD Memo #{memo.adNumber}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the AD memo for agency {memo.agencyCode}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReset(memo.adNumber)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!isLoading && memos.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(safePage - 1)}
                        className={safePage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {totalPages > 0 && (
                      <PaginationItem className="hidden sm:block">
                        <PaginationLink onClick={() => handlePageChange(1)} isActive={safePage === 1}>1</PaginationLink>
                      </PaginationItem>
                    )}
                    {safePage > 3 && (
                      <PaginationItem className="hidden sm:block"><span className="px-4 py-2">...</span></PaginationItem>
                    )}
                    {Array.from({ length: totalPages }, (_, k) => k + 1)
                      .filter((p) => {
                        if (totalPages <= 5) return p > 1 && p < totalPages
                        return p > 1 && p < totalPages && (p === safePage - 1 || p === safePage || p === safePage + 1)
                      })
                      .map((p) => (
                        <PaginationItem key={p} className="hidden sm:block">
                          <PaginationLink onClick={() => handlePageChange(p)} isActive={safePage === p}>{p}</PaginationLink>
                        </PaginationItem>
                      ))}
                    {safePage < totalPages - 2 && totalPages > 5 && (
                      <PaginationItem className="hidden sm:block"><span className="px-4 py-2">...</span></PaginationItem>
                    )}
                    {totalPages > 1 && (
                      <PaginationItem className="hidden sm:block">
                        <PaginationLink onClick={() => handlePageChange(totalPages)} isActive={safePage === totalPages}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    <div className="sm:hidden mx-2">
                      <span className="text-sm">Page {safePage} of {totalPages}</span>
                    </div>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(safePage + 1)}
                        className={safePage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    <div className="ml-2 sm:ml-4 border-l pl-2 sm:pl-4">
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => {
                          useAgencyDeliveryMemoStore.setState({ itemsPerPage: Number(v), currentPage: 1 })
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue placeholder="Per page" />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((n) => (
                            <SelectItem key={n} value={n.toString()}>{n} / page</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <MemoDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditMemo(null) }}
        memo={editMemo}
      />
    </div>
  )
}

// ─── Memo Dialog (Create / Edit) ────────────────────────────────────────────

interface FormState {
  agencyCode: string
  agencyName: string
  voucherNumber: string
  lrNumber: string
  lrDate: string
  generatedDate: Date
  images: string[]
}

const emptyForm = (): FormState => ({
  agencyCode: '',
  agencyName: '',
  voucherNumber: '',
  lrNumber: '',
  lrDate: moment().format('YYYY-MM-DD'),
  generatedDate: new Date(),
  images: [],
})

function MemoDialog({
  open,
  onClose,
  memo,
}: {
  open: boolean
  onClose: () => void
  memo: SavedADMemo | null
}) {
  const { toast } = useToast()
  const { saveMemo, updateMemo, isSaving } = useAgencyDeliveryMemoStore()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [isUploading, setIsUploading] = useState(false)
  const isEdit = !!memo

  useEffect(() => {
    if (!open) return
    if (memo) {
      setForm({
        agencyCode: memo.agencyCode,
        agencyName: memo.agencyName || '',
        voucherNumber: memo.voucherNumber || '',
        lrNumber: memo.lrNumber || '',
        lrDate: moment(memo.lrDate).format('YYYY-MM-DD'),
        generatedDate: new Date(memo.generatedDate),
        images: memo.image,
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, memo])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleAgencySelect = (agency: AgencyCode) => {
    setField('agencyCode', agency.code)
    setField('agencyName', agency.companyName || agency.shortName || agency.code)
  }

  const handleImageUpload = (_imageKey: number | string) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const converted = await convertImage(file)
      const compressed = await compressImage(converted)
      const prefixKeyId = `agency-delivery-memo/ad_${Date.now()}.${compressed.name.split('.').pop()}`
      const uploaded = await uploadFileToS3(compressed, prefixKeyId)
      setForm((f) => ({ ...f, images: [...f.images, uploaded.key] }))
    } catch {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Failed to upload image.' })
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))

  const handleSubmit = async () => {
    if (!form.agencyCode) {
      sonnerToast.error('Agency required', {
        description: 'Please select an agency before saving.',
        duration: 4000,
      })
      return
    }
    if (form.images.length === 0) {
      sonnerToast.error('Photo required', {
        description: 'Tap the Upload or Camera button to add at least one photo before saving.',
        duration: 5000,
      })
      return
    }

    try {
      if (isEdit && memo) {
        await updateMemo({
          adNumber: memo.adNumber,
          agencyCode: form.agencyCode,
          voucherNumber: form.voucherNumber || undefined,
          lrNumber: form.lrNumber || undefined,
          lrDate: new Date(form.lrDate).toISOString(),
          image: form.images,
          generatedDate: form.generatedDate.toISOString(),
        })
        toast({ title: 'Updated', description: `AD Memo #${memo.adNumber} updated successfully.` })
      } else {
        await saveMemo({
          agencyCode: form.agencyCode,
          voucherNumber: form.voucherNumber || undefined,
          lrNumber: form.lrNumber || undefined,
          lrDate: new Date(form.lrDate).toISOString(),
          image: form.images,
          generatedDate: form.generatedDate.toISOString(),
        })
        toast({ title: 'Saved', description: 'AD Memo created successfully.' })
      }
      onClose()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: isEdit ? 'Update failed' : 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save memo.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-lg p-4 sm:p-6 gap-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit AD Memo #${memo?.adNumber}` : 'Add New AD Memo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agency */}
          <div className="grid grid-cols-4 items-center gap-2">
            <label className="text-right text-sm font-medium">Agency <span className="text-destructive">*</span></label>
            <div className="col-span-3">
              <AgencyCodeSelector
                value={form.agencyCode || null}
                onChange={handleAgencySelect}
                placeholder="Select agency"
              />
              {form.agencyName && (
                <p className="text-xs text-muted-foreground mt-1">{form.agencyName}</p>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-2">
            <label className="text-right text-sm font-medium">Date</label>
            <div className="col-span-3">
              <DatePicker
                date={form.generatedDate}
                setDate={(d) => d && setField('generatedDate', d)}
              />
            </div>
          </div>

          {/* Voucher Number */}
          <div className="grid grid-cols-4 items-center gap-2">
            <label className="text-right text-sm font-medium">Voucher No.</label>
            <Input
              className="col-span-3"
              placeholder="Enter voucher number (optional)"
              value={form.voucherNumber}
              onChange={(e) => setField('voucherNumber', e.target.value)}
            />
          </div>

          {/* LR Number */}
          <div className="grid grid-cols-4 items-center gap-2">
            <label className="text-right text-sm font-medium">LR Number</label>
            <Input
              className="col-span-3"
              placeholder="Enter LR number (optional)"
              value={form.lrNumber}
              onChange={(e) => setField('lrNumber', e.target.value)}
            />
          </div>

          {/* LR Date */}
          <div className="grid grid-cols-4 items-center gap-2">
            <label className="text-right text-sm font-medium">LR Date</label>
            <div className="col-span-3">
              <DatePicker
                date={form.lrDate ? moment(form.lrDate).toDate() : undefined}
                setDate={(d) => d && setField('lrDate', moment(d).format('YYYY-MM-DD'))}
              />
            </div>
          </div>

          {/* Photos */}
          <div className="grid grid-cols-4 items-start gap-2">
            <label className="text-right text-sm font-medium pt-2">
              Photos <span className="text-destructive">*</span>
            </label>
            <div className="col-span-3 space-y-2">
              <TakeImage
                imageKey="agency-delivery-memo"
                handleImageUpload={handleImageUpload}
                isUploading={isUploading}
                isDisabled={isSaving}
                showImages={form.images}
                takeType="BOTH"
              />
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((key, idx) => (
                    <div
                      key={`${key}-${idx}`}
                      className="relative inline-flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs"
                    >
                      <span className="max-w-[160px] truncate">Photo {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isUploading}>
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              isEdit ? 'Update' : 'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
