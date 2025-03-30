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
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { tweleHrFormatDateString } from '@/lib/helper';
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

export default function CheckingPage() {
  const { toast } = useToast();
  const { 
    uncheckedInvoices,
    checkedInvoices,
    fetchUncheckedInvoices,
    fetchCheckedInvoices,
    checkInvoice,
    isLoading,
    
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
    setCheckedSearchTerm
  } = useCheckingInvoiceStore();

  useEffect(() => {
    fetchUncheckedInvoices();
    fetchCheckedInvoices();
  }, [fetchUncheckedInvoices, fetchCheckedInvoices]);

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
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={uncheckedSearchTerm}
                      onChange={(e) => setUncheckedSearchTerm(e.target.value)}
                      className="w-full"
                    />
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
                      <TableHead>Image</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && uncheckedInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : uncheckedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      uncheckedInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{(uncheckedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>
                            <ShowImage images={invoice.image} />  
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={"default"}
                              disabled={isLoading}
                              onClick={async () => await handleCheckInvoice(invoice.invoiceNumber)}
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
              
              {/* Pagination Controls */}
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => uncheckedCurrentPage > 1 && setUncheckedCurrentPage(uncheckedCurrentPage - 1)}
                        className={uncheckedCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {displayedPages(uncheckedCurrentPage - 1, uncheckedTotalPages).map((pageIndex, i) => (
                      <PaginationItem key={i}>
                        {pageIndex === -1 ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setUncheckedCurrentPage(pageIndex + 1)}
                            isActive={uncheckedCurrentPage === pageIndex + 1}
                          >
                            {pageIndex + 1}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => uncheckedCurrentPage < uncheckedTotalPages && setUncheckedCurrentPage(uncheckedCurrentPage + 1)}
                        className={uncheckedCurrentPage >= uncheckedTotalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    <div className="ml-4 border-l pl-4">
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue placeholder="Per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 / page</SelectItem>
                          <SelectItem value="10">10 / page</SelectItem>
                          <SelectItem value="20">20 / page</SelectItem>
                          <SelectItem value="50">50 / page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checked">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Checked Invoices</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={checkedSearchTerm}
                      onChange={(e) => setCheckedSearchTerm(e.target.value)}
                      className="w-full"
                    />
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
                      <TableHead>Image</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && checkedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : checkedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      checkedInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{(checkedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>
                            <ShowImage images={invoice.image} />  
                          </TableCell>
                          <TableCell>
                            <Capsule
                              text="Checked" 
                              showIcon="ok" 
                            />
                          </TableCell>
                          <TableCell>{tweleHrFormatDateString(invoice.checkTimestamp!)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => checkedCurrentPage > 1 && setCheckedCurrentPage(checkedCurrentPage - 1)}
                        className={checkedCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {displayedPages(checkedCurrentPage - 1, checkedTotalPages).map((pageIndex, i) => (
                      <PaginationItem key={i}>
                        {pageIndex === -1 ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setCheckedCurrentPage(pageIndex + 1)}
                            isActive={checkedCurrentPage === pageIndex + 1}
                          >
                            {pageIndex + 1}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => checkedCurrentPage < checkedTotalPages && setCheckedCurrentPage(checkedCurrentPage + 1)}
                        className={checkedCurrentPage >= checkedTotalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    <div className="ml-4 border-l pl-4">
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                        }}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue placeholder="Per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 / page</SelectItem>
                          <SelectItem value="10">10 / page</SelectItem>
                          <SelectItem value="20">20 / page</SelectItem>
                          <SelectItem value="50">50 / page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
