'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { History, ArrowRight, Trash2, User, Calendar, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useInvoiceSequenceStore, SequenceHistoryEntry } from '@/store/useInvoiceSequenceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function formatDateTime(isoStr: string) {
  try {
    return format(new Date(isoStr), 'd MMM yyyy, h:mm a')
  } catch {
    return isoStr
  }
}

function ChangeArrow({ prev, next }: { prev: number | null; next: number | null }) {
  const prevLabel = prev !== null ? prev : '—'
  const nextLabel = next !== null ? next : '—'
  const changed = prev !== next
  return (
    <span className="flex items-center gap-1 font-mono text-sm">
      <span className={changed ? 'line-through text-muted-foreground' : ''}>{prevLabel}</span>
      {changed && (
        <>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-primary font-semibold">{nextLabel}</span>
        </>
      )}
    </span>
  )
}

function HistoryRow({ entry }: { entry: SequenceHistoryEntry }) {
  const startChanged = entry.prevStartNo !== entry.newStartNo
  const endChanged = entry.prevEndNo !== entry.newEndNo
  const hasChanges = startChanged || endChanged

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDate(entry.date)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {entry.changedBy}
          </span>
          <span>{formatDateTime(entry.changedAt)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">Start</span>
          <ChangeArrow prev={entry.prevStartNo} next={entry.newStartNo} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">End</span>
          <ChangeArrow prev={entry.prevEndNo} next={entry.newEndNo} />
        </div>
        {entry.deletedCount > 0 && (
          <div className="flex items-center gap-1 text-destructive text-xs">
            <Trash2 className="h-3 w-3" />
            <span>{entry.deletedCount} invoice{entry.deletedCount === 1 ? '' : 's'} deleted</span>
          </div>
        )}
        {!hasChanges && (
          <span className="text-muted-foreground text-xs italic">No value changes</span>
        )}
      </div>
    </div>
  )
}

export function HistoryCard() {
  const { history, isHistoryLoading } = useInvoiceSequenceStore()

  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter by the invoice date that was modified (entry.date)
  const filtered = useMemo(() => {
    if (!dateFilter) return history
    return history.filter((e) => e.date === dateFilter)
  }, [history, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleDateChange = (value: string) => {
    setDateFilter(value)
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
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Change History
            </CardTitle>
            {!isHistoryLoading && filtered.length > 0 && (
              <Badge variant="secondary">{filtered.length} entries</Badge>
            )}
          </div>
          {/* Date filter — filters by the invoice date that was modified */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              className="pl-8 h-8 w-44 text-sm"
              title="Filter history by invoice date"
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
        {isHistoryLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-30" />
            {dateFilter ? (
              <>
                <p className="text-sm">No changes found for this date</p>
                <button
                  onClick={() => handleDateChange('')}
                  className="text-xs mt-1 text-primary hover:underline"
                >
                  Clear filter
                </button>
              </>
            ) : (
              <>
                <p className="text-sm">No changes recorded yet</p>
                <p className="text-xs mt-1">Changes made through this panel will appear here</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>

            {/* Pagination footer */}
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
