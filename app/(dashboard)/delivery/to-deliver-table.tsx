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
import { useDeliveryInvoiceStore } from '@/store/useDeliveryInvoiceStore';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';
import { FilterX, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
import { RegionalCodeFilter } from '@/components/regional-code-filter';

export function ToDeliverTable() {
  const { toast } = useToast();
  const { 
    toDeliverInvoices,
    fetchAllDeliveryInvoices,
    pickupInvoice,
    isLoading,
    clearAllFilters,
    
    // Date state
    toDeliverSelectedDate,
    setToDeliverSelectedDate,
    
    // Search state
    toDeliverSearchTerm,
    setToDeliverSearchTerm,
    
    // Regional code filter
    toDeliverSelectedRegionalCodes,
    availableRegionalCodes,
    setToDeliverSelectedRegionalCodes,
    
    // Pagination
    toDeliverPage,
    toDeliverTotalPages,
    setToDeliverPage,
    itemsPerPage,
    setItemsPerPage
  } = useDeliveryInvoiceStore();

  const handlePickup = async (invoiceNumber: number) => {
    try {
      await pickupInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Package picked up successfully',
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to pickup package',
        duration: 2000,
      });
    }
  }

  const handleToDeliverDateChange = (date: Date | undefined) => {
    setToDeliverSelectedDate(date);
  };

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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Packages to be Delivered</CardTitle>
          
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder="Search invoice number..."
                value={toDeliverSearchTerm}
                onChange={(e) => setToDeliverSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-row gap-2">
              <DatePicker date={toDeliverSelectedDate} setDate={setToDeliverSelectedDate} />
              {/* <Button
                variant={'outline'}
                disabled={!toDeliverSelectedDate || moment(toDeliverSelectedDate).isSame(moment(), 'day')}
                onClick={() => setToDeliverSelectedDate(undefined)}
              >Clear Date</Button> */}
            </div>

            <div className="flex items-center gap-2">
              <RegionalCodeFilter
                selectedRegionalCodes={toDeliverSelectedRegionalCodes}
                availableRegionalCodes={availableRegionalCodes}
                setSelectedRegionalCodes={setToDeliverSelectedRegionalCodes}
                label="Regions"
              />
              <Button 
                variant="outline" 
                onClick={() => {
                  clearAllFilters();
                }}
                className="flex items-center gap-1 ml-auto"
                size="sm"
              >
                <FilterX className="h-4 w-4" />
                <span>Clear All</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className='w-full gap-2'>
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </Button>
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
              {isLoading && toDeliverInvoices?.length === 0 ? (
                <TableSkeleton rows={5} cols={8} />
              ) : toDeliverInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No packages to be delivered</TableCell>
                </TableRow>
              ) : (
                toDeliverInvoices?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>{invoice.regionalCode}</TableCell>
                    <TableCell>{invoice.paymodeMode}</TableCell>
                    <TableCell>
                      <ShowImage images={invoice.image} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        disabled={isLoading}
                        onClick={() => handlePickup(invoice.invoiceNumber)}
                      >
                        Pick Up
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
                  onClick={() => toDeliverPage > 1 && setToDeliverPage(toDeliverPage - 1)}
                  className={toDeliverPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {displayedPages(toDeliverPage - 1, toDeliverTotalPages).map((pageIndex, i) => (
                <PaginationItem key={i}>
                  {pageIndex === -1 ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setToDeliverPage(pageIndex + 1)}
                      isActive={toDeliverPage === pageIndex + 1}
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => toDeliverPage < toDeliverTotalPages && setToDeliverPage(toDeliverPage + 1)}
                  className={toDeliverPage >= toDeliverTotalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className="ml-4 border-l pl-4">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setToDeliverPage(1);
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
  );
} 