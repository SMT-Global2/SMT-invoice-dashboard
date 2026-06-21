'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Pencil, X, Save, ChevronLeft, ChevronRight, Search, AlertTriangle } from 'lucide-react'
import { useInvoiceSequenceStore, DayStartInvoiceRecord } from '@/store/useInvoiceSequenceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy')
  } catch {
    return dateStr
  }
}

function EditableRow({ record }: { record: DayStartInvoiceRecord }) {
  const { editValues, updateEditValues, cancelEdit, beginConfirmation } = useInvoiceSequenceStore()

  return (
    <TableRow className="bg-primary/5">
      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={editValues.startNo}
          onChange={(e) => updateEditValues({ startNo: e.target.value })}
          className="w-28 h-8 text-sm"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={editValues.endNo}
          onChange={(e) => updateEditValues({ endNo: e.target.value })}
          placeholder="—"
          className="w-28 h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={beginConfirmation} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function DisplayRow({
  record,
  isAnomalous
}: {
  record: DayStartInvoiceRecord
  isAnomalous: boolean
}) {
  const { editingId, startEdit } = useInvoiceSequenceStore()
  const isAnotherEditing = editingId !== null && editingId !== record.id

  return (
    <TableRow
      className={[
        isAnotherEditing ? 'opacity-40 pointer-events-none' : '',
        isAnomalous ? 'bg-amber-50 dark:bg-amber-950/20' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{record.invoiceStartNo}</span>
          {isAnomalous && (
            <span title="Start number is higher than the latest date's start number">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {record.invoiceEndNo !== null ? (
          <span className="font-mono text-sm">{record.invoiceEndNo}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startEdit(record)}
          className="h-8 w-8"
          disabled={isAnotherEditing}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function SequenceTable() {
  const { records, isLoading, editingId } = useInvoiceSequenceStore()

  const [dateFilter, setDateFilter] = useState('')
  const [showConflicts, setShowConflicts] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Records are sorted date desc, so index 0 is the latest date.
  // Any older record whose invoiceStartNo exceeds the latest date's invoiceStartNo
  // is anomalous — its sequence is out of sync.
  const anomalousIds = useMemo(() => {
    if (records.length < 2) return new Set<string>()
    const latestStartNo = records[0].invoiceStartNo
    const latestDate = records[0].date
    return new Set(
      records
        .filter((r) => r.date < latestDate && r.invoiceStartNo > latestStartNo)
        .map((r) => r.id)
    )
  }, [records])

  const filtered = useMemo(() => {
    let result = records
    if (dateFilter) result = result.filter((r) => r.date === dateFilter)
    if (showConflicts) result = result.filter((r) => anomalousIds.has(r.id))
    return result
  }, [records, dateFilter, showConflicts, anomalousIds])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Always include the row being edited even if it got filtered out
  const editingRecord = editingId ? records.find((r) => r.id === editingId) : null
  const editingInView = paginated.some((r) => r.id === editingId)
  const visibleRecords =
    editingRecord && !editingInView ? [editingRecord, ...paginated] : paginated

  const handleDateChange = (value: string) => {
    setDateFilter(value)
    setPage(1)
  }

  const handleToggleConflicts = () => {
    setShowConflicts((v) => !v)
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value))
    setPage(1)
  }

  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, filtered.length)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle>Day Start Invoice Records</CardTitle>
            {!isLoading && (
              <Badge variant="secondary">{filtered.length} records</Badge>
            )}
            {!isLoading && anomalousIds.size > 0 && (
              <button onClick={handleToggleConflicts}>
                <Badge
                  variant="outline"
                  className={[
                    'gap-1 cursor-pointer transition-colors',
                    showConflicts
                      ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-500 text-amber-700 dark:text-amber-300'
                      : 'border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  ].join(' ')}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {anomalousIds.size} sequence conflict{anomalousIds.size > 1 ? 's' : ''}
                  {showConflicts && <X className="h-3 w-3 ml-0.5" />}
                </Badge>
              </button>
            )}
          </div>
          {/* Date filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              className="pl-8 h-8 w-44 text-sm"
            />
            {dateFilter && (
              <button
                onClick={() => handleDateChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Start No.</TableHead>
              <TableHead>End No.</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                </TableRow>
              ))
            ) : visibleRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  {dateFilter ? 'No record found for this date' : 'No records found'}
                </TableCell>
              </TableRow>
            ) : (
              visibleRecords.map((record) =>
                editingId === record.id ? (
                  <EditableRow key={record.id} record={record} />
                ) : (
                  <DisplayRow
                    key={record.id}
                    record={record}
                    isAnomalous={anomalousIds.has(record.id)}
                  />
                )
              )
            )}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {start}–{end} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-1">{safePage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
