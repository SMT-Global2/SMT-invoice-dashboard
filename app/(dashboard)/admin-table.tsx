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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import useAnalyticsStore, { IInvoice } from '@/store/useAnalyticsStore';
import { useEffect } from 'react';
import { Capsule } from '@/components/capsule';
import { Input } from "@/components/ui/input"
import { CheckCircle, FileText, Package, Search, Truck } from "lucide-react"
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

export default function AdminInvoiceTable() {
  const {
    fetchAnalytics,
    invoiceAnalytics,
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
    <span className={`px-2 py-1 rounded-full text-md font-semibold inline-flex items-center gap-1 ${
      status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

  // const MoreInfoDialog = ({ invoice }: { invoice: IInvoice }) => (
  //   <Dialog>
  //     <DialogTrigger asChild>
  //       <Button variant="outline" size="sm">Show More</Button>
  //     </DialogTrigger>
  //     <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
  //       <DialogHeader>
  //         <DialogTitle className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</DialogTitle>
  //       </DialogHeader>
        
  //       <div className="space-y-6 pt-4">
  //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //           <Card className="p-4">
  //             <h3 className="font-semibold mb-2">Party Details</h3>
  //             <div className="space-y-2 text-sm">
  //               <p><span className="text-muted-foreground">Party Code:</span> {invoice.partyCode}</p>
  //               <p><span className="text-muted-foreground">Medical Name:</span> {invoice.party?.customerName}</p>
  //               <p><span className="text-muted-foreground">City:</span> {invoice.party?.city}</p>
  //             </div>
  //           </Card>

  //           <Card className="p-4">
  //             <h3 className="font-semibold mb-2">Invoice Details</h3>
  //             <div className="space-y-2 text-sm">
  //               <p><span className="text-muted-foreground">Generated Date:</span> {new Date(invoice.generatedDate).toLocaleString()}</p>
  //               <p><span className="text-muted-foreground">OTC:</span> {invoice.isOtc ? "Yes" : "No"}</p>
  //               <p><span className="text-muted-foreground">Created:</span> {new Date(invoice.createdAt).toLocaleString()}</p>
  //             </div>
  //           </Card>
  //         </div>

  //         <Card className="p-6 dark:bg-gray-800">
  //           <h3 className="font-semibold mb-6 text-lg">Order Status Timeline</h3>
  //           <div className="relative">
  //             <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 space-y-8 md:space-y-0">
  //               <div className="absolute h-full md:h-1 w-1 md:w-[calc(100%-2rem)] bg-gray-200 dark:bg-gray-600 left-4 md:left-4 top-0 md:top-[17px] transition-colors duration-500">
  //                 <div 
  //                   className="h-[calc(100%*0.25)] md:h-full w-full md:w-[calc(100%*0.25)] bg-green-500" 
  //                   style={{
  //                     height: `${invoice.deliveredTimestamp ? '100%' : 
  //                             invoice.pickupTimestamp ? '75%' :
  //                             invoice.packageTimestamp ? '50%' :
  //                             invoice.checkTimestamp ? '25%' : '0%'}`,
  //                     width: `${invoice.deliveredTimestamp ? '100%' : 
  //                            invoice.pickupTimestamp ? '75%' :
  //                            invoice.packageTimestamp ? '50%' :
  //                            invoice.checkTimestamp ? '25%' : '0%'}`
  //                   }}
  //                 />
  //               </div>
                
  //               <div className="relative z-10 flex items-start space-x-4 pl-8 md:pl-0 md:flex-col md:items-center">
  //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invoice.invoiceTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
  //                   <FileText className="h-6 w-6" />
  //                 </div>
  //                 <div className="flex flex-col">
  //                   <p className="font-medium">Invoiced</p>
  //                   {invoice.invoiceTimestamp && (
  //                     <div className="text-sm text-muted-foreground">
  //                       <p>{new Date(invoice.invoiceTimestamp).toLocaleString()}</p>
  //                       <p className="font-medium text-primary">{invoice.invoiceUsername}</p>
  //                     </div>
  //                   )}
  //                 </div>
  //               </div>

  //               <div className="relative z-10 flex items-start space-x-4 pl-8 md:pl-0 md:flex-col md:items-center">
  //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invoice.checkTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
  //                   <CheckCircle className="h-6 w-6" />
  //                 </div>
  //                 <div className="flex flex-col">
  //                   <p className="font-medium">Checked</p>
  //                   {invoice.checkTimestamp && (
  //                     <div className="text-sm text-muted-foreground">
  //                       <p>{new Date(invoice.checkTimestamp).toLocaleString()}</p>
  //                       <p className="font-medium text-primary">{invoice.checkUsername}</p>
  //                     </div>
  //                   )}
  //                 </div>
  //               </div>

  //               <div className="relative z-10 flex items-start space-x-4 pl-8 md:pl-0 md:flex-col md:items-center">
  //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invoice.packageTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
  //                   <Package className="h-6 w-6" />
  //                 </div>
  //                 <div className="flex flex-col">
  //                   <p className="font-medium">Packed</p>
  //                   {invoice.packageTimestamp && (
  //                     <div className="text-sm text-muted-foreground">
  //                       <p>{new Date(invoice.packageTimestamp).toLocaleString()}</p>
  //                       <p className="font-medium text-primary">{invoice.packageUsername}</p>
  //                     </div>
  //                   )}
  //                 </div>
  //               </div>

  //               <div className="relative z-10 flex items-start space-x-4 pl-8 md:pl-0 md:flex-col md:items-center">
  //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invoice.pickupTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
  //                   <Truck className="h-6 w-6" />
  //                 </div>
  //                 <div className="flex flex-col">
  //                   <p className="font-medium">Picked Up</p>
  //                   {invoice.pickupTimestamp && (
  //                     <div className="text-sm text-muted-foreground">
  //                       <p>{new Date(invoice.pickupTimestamp).toLocaleString()}</p>
  //                       <p className="font-medium text-primary">{invoice.pickupUsername}</p>
  //                     </div>
  //                   )}
  //                 </div>
  //               </div>

  //               <div className="relative z-10 flex items-start space-x-4 pl-8 md:pl-0 md:flex-col md:items-center">
  //                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invoice.deliveredTimestamp ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
  //                   <CheckCircle className="h-6 w-6" />
  //                 </div>
  //                 <div className="flex flex-col">
  //                   <p className="font-medium">Delivered</p>
  //                   {invoice.deliveredTimestamp && (
  //                     <div className="text-sm text-muted-foreground">
  //                       <p>{new Date(invoice.deliveredTimestamp).toLocaleString()}</p>
  //                       <p className="font-medium text-primary">{invoice.deliveredUsername}</p>
  //                     </div>
  //                   )}
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         </Card>

  //         {invoice.deliveredLocationLink && (
  //           <Card className="p-4 dark:bg-gray-800">
  //             <h3 className="font-semibold mb-2">Delivery Location</h3>
  //             <a href={invoice.deliveredLocationLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-2">
  //               <span>View Delivery Location</span>
  //               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  //               </svg>
  //             </a>
  //           </Card>
  //         )}
  //       </div>
  //     </DialogContent>
  //   </Dialog>
  // );

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
      date: null,
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
                ) : invoiceAnalytics.allInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoiceAnalytics.allInvoices.map((invoice, index) => (
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
                      <TableCell>{new Date(invoice.updatedAt).toLocaleString()}</TableCell>
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