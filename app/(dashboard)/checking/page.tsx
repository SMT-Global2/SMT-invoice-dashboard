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
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { tweleHrFormatDateString, formatDateOnly } from '@/lib/helper';
import TableSkeleton from '@/components/table-skeleton';
import { Capsule } from '@/components/capsule';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { useCheckingInvoiceStore } from '@/store/useCheckingInvoiceStore';
import { RegionalCodeFilter } from '@/components/regional-code-filter';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import moment from 'moment';
import { PaymodeMode } from '@prisma/client';
import { FilterX, ImageIcon } from 'lucide-react';

export default function CheckingPage() {
  const { toast } = useToast();
  const {
    uncheckedInvoices,
    checkedInvoices,
    fetchUncheckedInvoices,
    fetchCheckedInvoices,
    checkInvoice,
    isLoading,

    setUncheckedInvoices,
    setCheckedInvoices,

    // Date
    uncheckedSelectedDate,
    checkedSelectedDate,
    setUncheckedSelectedDate,
    setCheckedSelectedDate,

    // Pagination
    uncheckedCurrentPage,
    uncheckedTotalPages,
    checkedCurrentPage,
    checkedTotalPages,
    itemsPerPage,
    setUncheckedCurrentPage,
    setCheckedCurrentPage,
    setItemsPerPage,

    // Search
    uncheckedSearchTerm,
    checkedSearchTerm,
    setUncheckedSearchTerm,
    setCheckedSearchTerm,

    // Regional code filters
    uncheckedSelectedRegionalCodes,
    checkedSelectedRegionalCodes,
    availableRegionalCodes,
    setUncheckedSelectedRegionalCodes,
    setCheckedSelectedRegionalCodes,
    fetchAvailableRegionalCodes,
    clearAllFilters
  } = useCheckingInvoiceStore();



  useEffect(() => {
    fetchUncheckedInvoices();
    fetchCheckedInvoices();
    fetchAvailableRegionalCodes();
  }, [fetchUncheckedInvoices, fetchCheckedInvoices, fetchAvailableRegionalCodes]);

  const handleCheckInvoice = async (invoiceNumber: number) => {
    try {
      await checkInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Invoice checked successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to check invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to check invoice',
        duration: 2000,
      });
    }
  }

  // Helper function to display pagination pages
  const displayedPages = (currentPage: number, totalPages: number) => {
    const delta = 1;
    const range = [];

    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        range.unshift(-1);
      }
      range.unshift(0);
    }

    if (range[range.length - 1] < totalPages - 1) {
      if (range[range.length - 1] < totalPages - 2) {
        range.push(-1);
      }
      range.push(totalPages - 1);
    }

    return range;
  };

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-2'>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Invoice Checking</h1>
      </div>
      <Tabs defaultValue="unchecked" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unchecked">Unchecked</TabsTrigger>
          <TabsTrigger value="checked">Checked</TabsTrigger>
        </TabsList>

        <TabsContent value="unchecked">
          <Card>
            <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Unchecked Invoices</CardTitle>
              
              <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder="Search invoice number..."
                    value={uncheckedSearchTerm}
                    onChange={(e) => setUncheckedSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <DatePicker date={uncheckedSelectedDate} setDate={setUncheckedSelectedDate} />
                  <RegionalCodeFilter
                    selectedRegionalCodes={uncheckedSelectedRegionalCodes}
                    availableRegionalCodes={availableRegionalCodes}
                    setSelectedRegionalCodes={setUncheckedSelectedRegionalCodes}
                  />
                  {(uncheckedSelectedDate || uncheckedSelectedRegionalCodes.length > 0) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={clearAllFilters}
                      title="Clear all filters"
                    >
                      <FilterX className="h-4 w-4" />
                    </Button>
                  )}
                </div>

              </div>
            </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr. No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Medical Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Regional Code</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    <TableSkeleton rows={10} cols={10} />
                  ) : uncheckedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    uncheckedInvoices.map((invoice, index) => (
                      <TableRow key={invoice.invoiceNumber}>
                        <TableCell>{(uncheckedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{invoice.generatedDate ? formatDateOnly(invoice.generatedDate) : '-'}</TableCell>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.partyCode}</TableCell>
                        <TableCell>{invoice.medicalName}</TableCell>
                        <TableCell>{invoice.city}</TableCell>
                        <TableCell>{invoice.regionalCode}</TableCell>
                        <TableCell>
                          <Select
                            value={invoice.paymodeMode || ""}
                            onValueChange={(value) => {
                              try {
                                const newData = [...uncheckedInvoices];
                                const index = newData.findIndex(item => item.invoiceNumber === invoice.invoiceNumber);
                                if (index !== -1) {
                                  newData[index] = {
                                    ...newData[index],
                                    paymodeMode: value as PaymodeMode
                                  };
                                  setUncheckedInvoices(newData);
                                }
                              } catch (error) {
                                console.error("Error updating payment mode:", error);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Payment mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PaymodeMode.CASH}>Cash</SelectItem>
                              <SelectItem value={PaymodeMode.CREDIT}>Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {invoice.image && invoice.image.length > 0 ? (
                            <Button size="sm" className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleCheckInvoice(invoice.invoiceNumber)}
                            disabled={isLoading}
                          >
                            Check
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {uncheckedTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setUncheckedCurrentPage(Math.max(1, uncheckedCurrentPage - 1));
                          }}
                          aria-disabled={uncheckedCurrentPage === 1}
                          className={uncheckedCurrentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {displayedPages(uncheckedCurrentPage - 1, uncheckedTotalPages).map((pageIndex, i) => (
                        pageIndex === -1 ? (
                          <PaginationItem key={`ellipsis-${i}`}>
                            <span className="px-4 py-2">...</span>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`page-${pageIndex}`}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setUncheckedCurrentPage(pageIndex + 1);
                              }}
                              className={cn(pageIndex + 1 === uncheckedCurrentPage && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                              isActive={pageIndex + 1 === uncheckedCurrentPage}
                            >
                              {pageIndex + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setUncheckedCurrentPage(Math.min(uncheckedTotalPages, uncheckedCurrentPage + 1));
                          }}
                          aria-disabled={uncheckedCurrentPage === uncheckedTotalPages}
                          className={uncheckedCurrentPage === uncheckedTotalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checked">
          <Card>
            <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Checked Invoices</CardTitle>
              
              <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder="Search invoice number..."
                    value={checkedSearchTerm}
                    onChange={(e) => setCheckedSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <DatePicker date={checkedSelectedDate} setDate={setCheckedSelectedDate} />
                  <RegionalCodeFilter
                    selectedRegionalCodes={checkedSelectedRegionalCodes}
                    availableRegionalCodes={availableRegionalCodes}
                    setSelectedRegionalCodes={setCheckedSelectedRegionalCodes}
                  />
                  {(checkedSelectedDate || checkedSelectedRegionalCodes.length > 0) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={clearAllFilters}
                      title="Clear all filters"
                    >
                      <FilterX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr. No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Medical Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Regional Code</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Checked By</TableHead>
                      <TableHead>Checked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    <TableSkeleton rows={10} cols={11} />
                  ) : checkedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    checkedInvoices.map((invoice, index) => (
                      <TableRow key={invoice.invoiceNumber}>
                        <TableCell>{(checkedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{invoice.generatedDate ? formatDateOnly(invoice.generatedDate) : '-'}</TableCell>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.partyCode}</TableCell>
                        <TableCell>{invoice.medicalName}</TableCell>
                        <TableCell>{invoice.city}</TableCell>
                        <TableCell>{invoice.regionalCode}</TableCell>
                        <TableCell><Capsule text={invoice.paymodeMode?.toString() || '-'} /></TableCell>
                        <TableCell>
                          {invoice.image && invoice.image.length > 0 ? (
                            <Button size="sm" className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              <span>View</span>
                            </Button>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{invoice.checkUsername || '-'}</TableCell>
                        <TableCell>{invoice.checkTimestamp ? formatDateOnly(invoice.checkTimestamp) : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {checkedTotalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCheckedCurrentPage(Math.max(1, checkedCurrentPage - 1));
                          }}
                          aria-disabled={checkedCurrentPage === 1}
                          className={checkedCurrentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {displayedPages(checkedCurrentPage - 1, checkedTotalPages).map((pageIndex, i) => (
                        pageIndex === -1 ? (
                          <PaginationItem key={`ellipsis-${i}`}>
                            <span className="px-4 py-2">...</span>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`page-${pageIndex}`}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCheckedCurrentPage(pageIndex + 1);
                              }}
                              className={cn(pageIndex + 1 === checkedCurrentPage && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
                              isActive={pageIndex + 1 === checkedCurrentPage}
                            >
                              {pageIndex + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCheckedCurrentPage(Math.min(checkedTotalPages, checkedCurrentPage + 1));
                          }}
                          aria-disabled={checkedCurrentPage === checkedTotalPages}
                          className={checkedCurrentPage === checkedTotalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
