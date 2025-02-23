'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import useAnalyticsStore from '@/store/useAnalyticsStore';
import { useEffect } from 'react';
import { Capsule } from '@/components/capsule';
import { Input } from "@/components/ui/input"
import { Car, CheckCircle, CheckSquare, FileText, Package, Search, Store, Truck } from "lucide-react"
import TableSkeleton from "@/components/table-skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { InvoiceCard } from "./invoice-card"
import { tweleHrFormatDateString } from '@/lib/helper';

export default function AdminInvoiceTable() {
  const {
    fetchAnalytics,
    allInvoices,
    analytics,
    isLoading,
    pagination,
    setPagination,
    filters,
    setFilters,
    totalPages
  } = useAnalyticsStore()

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics, pagination.page, pagination.limit, filters])

  const displayedPages = () => {
    const currentPage = pagination.page
    const total = totalPages
    const delta = 1

    const range = []
    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(total - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        range.unshift(-1)
      }
      range.unshift(0)
    }

    if (range[range.length - 1] < total - 1) {
      if (range[range.length - 1] < total - 2) {
        range.push(-1)
      }
      range.push(total - 1)
    }

    return range
  }

  const StatusBadge = ({ status }: { status: boolean }) => (
    <span className={`px-2 py-1 rounded-full text-md font-semibold inline-flex items-center gap-1 ${status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
      {status ?
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
        </svg> :
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      }
    </span>
  );

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sortField !== field) return <ChevronsUpDown className="h-4 w-4" />;
    return filters.sortOrder === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  const handleSort = (field: string) => {
    if (filters.sortField === field) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      });
      setPagination({ ...pagination, page: 0 });
    } else {
      setFilters({
        ...filters,
        sortField: field as any,
        sortOrder: 'desc'
      });
      setPagination({ ...pagination, page: 0 });
    }
  };

  const clearFilters = () => {
    setFilters({
      ...filters,
      searchQuery: '',
      date: new Date().toISOString(),
      sortField: 'invoiceTimestamp',
      sortOrder: 'desc'
    });
    setPagination({ ...pagination, page: 0 });
  };

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw]'>


      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
          <CardTitle className="m-2">Invoice Details</CardTitle>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search invoices..."
                className="pl-8 h-8 text-sm"
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters({ ...filters, searchQuery: e.target.value });
                  setPagination({ ...pagination, page: 0 });
                }}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[200px] h-8 justify-start text-left font-normal",
                    !filters.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(new Date(filters.date), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.date ? new Date(filters.date) : undefined}
                  className="w-[300px] sm:w-auto"
                  onSelect={(date) => {
                    setFilters({
                      ...filters,
                      date: date ? format(date, 'yyyy-MM-dd') : null
                    });
                    setPagination({ ...pagination, page: 0 });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select
              value={`${filters.sortField}-${filters.sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split('-');
                setFilters({
                  ...filters,
                  sortField: field as any,
                  sortOrder: order as 'asc' | 'desc'
                });
                setPagination({ ...pagination, page: 0 });
              }}
            >
              <SelectTrigger className="w-auto gap-2 h-8">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoiceTimestamp-desc">Latest First</SelectItem>
                <SelectItem value="invoiceTimestamp-asc">Oldest First</SelectItem>
                <SelectItem value="invoiceNumber-desc">Invoice Number (High to Low)</SelectItem>
                <SelectItem value="invoiceNumber-asc">Invoice Number (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardHeader>


        <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-6 m-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Generated</CardTitle>
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalGenerated}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices Generated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Checked</CardTitle>
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalChecked}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices Checked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Packed</CardTitle>
              <Package className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalPacked}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices Packed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Picked Up</CardTitle>
              <Truck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalPickedUp}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices Picked Up
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Delivered</CardTitle>
              <Truck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalDelivered}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices Delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">OTC</CardTitle>
              <Store className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{analytics.totalOTC}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Invoices OTC
              </p>
            </CardContent>
          </Card>


        </div>

        <CardContent>
          <div className="custom-scrollbar w-full border rounded-lg m-auto max-w-[100vw]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      Invoice No.
                      <SortIcon field="invoiceNumber" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort('invoiceTimestamp')}
                    >
                      Date
                      <SortIcon field="invoiceTimestamp" />
                    </button>
                  </TableHead>
                  <TableHead>Party Code</TableHead>
                  <TableHead>Medical Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Checked</TableHead>
                  <TableHead>Packed</TableHead>
                  <TableHead>Picked Up</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={5} cols={13} />
                ) : allInvoices.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  allInvoices.invoices.map((invoice, index) => (
                    <TableRow key={invoice.invoiceNumber}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{new Date(invoice.invoiceTimestamp!).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.partyCode}</TableCell>
                      <TableCell>{invoice.party?.customerName}</TableCell>
                      <TableCell>{invoice.party?.city}</TableCell>
                      <TableCell><StatusBadge status={!!invoice.invoiceTimestamp} /></TableCell>
                      <TableCell><StatusBadge status={!!invoice.checkTimestamp} /></TableCell>
                      <TableCell><StatusBadge status={!!invoice.packageTimestamp} /></TableCell>
                      <TableCell><StatusBadge status={!!invoice.pickupTimestamp} /></TableCell>
                      <TableCell><StatusBadge status={!!invoice.deliveredTimestamp} /></TableCell>
                      <TableCell>{tweleHrFormatDateString(new Date(invoice.updatedAt))}</TableCell>
                      <TableCell>
                        <Capsule
                          text={invoice.isOtc ? 'OTC' : 'Normal'}
                          bgColor={invoice.isOtc ? 'bg-yellow-100' : 'bg-green-100'}
                          textColor={invoice.isOtc ? 'text-yellow-800' : 'text-green-800'}
                          showIcon='none'
                        />
                      </TableCell>
                      <TableCell>
                        <InvoiceCard invoice={invoice} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent className="flex flex-wrap justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => pagination.page > 0 && setPagination({
                      ...pagination,
                      page: pagination.page - 1
                    })}
                    className={pagination.page === 0 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {displayedPages().map((pageIndex, i) => (
                  <PaginationItem key={i}>
                    {pageIndex === -1 ? (
                      <span className="px-4 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setPagination({ ...pagination, page: pageIndex })}
                        isActive={pagination.page === pageIndex}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => pagination.page < totalPages - 1 && setPagination({
                      ...pagination,
                      page: pagination.page + 1
                    })}
                    className={pagination.page >= totalPages - 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}