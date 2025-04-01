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
import { tweleHrFormatDateString } from '@/lib/helper';
import Link from 'next/link';
import TableSkeleton from '@/components/table-skeleton';
import { FilterX, Map } from 'lucide-react';
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

export function DeliveredTable() {
  const { 
    deliveredInvoices,
    isLoading,
    clearAllFilters,
    
    // Date state
    deliveredSelectedDate,
    setDeliveredSelectedDate,
    
    // Search state
    deliveredSearchTerm,
    setDeliveredSearchTerm,
    
    // Regional code filter
    deliveredSelectedRegionalCodes,
    availableRegionalCodes,
    setDeliveredSelectedRegionalCodes,
    
    // Pagination
    deliveredPage,
    deliveredTotalPages,
    setDeliveredPage,
    itemsPerPage,
    setItemsPerPage
  } = useDeliveryInvoiceStore();
  
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
          <CardTitle>Delivered Packages</CardTitle>
          
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder="Search invoice number..."
                value={deliveredSearchTerm}
                onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-row gap-2">
              <DatePicker date={deliveredSelectedDate} setDate={setDeliveredSelectedDate} />
              {/* <Button
                variant={'outline'}
                disabled={!deliveredSelectedDate || moment(deliveredSelectedDate).isSame(moment(), 'day')}
                onClick={() => setDeliveredSelectedDate(undefined)}
              >Clear Date</Button> */}
            </div>

            <div className="flex items-center gap-2">
              <RegionalCodeFilter
                selectedRegionalCodes={deliveredSelectedRegionalCodes}
                availableRegionalCodes={availableRegionalCodes}
                setSelectedRegionalCodes={setDeliveredSelectedRegionalCodes}
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
                <TableHead>Pickup Time</TableHead>
                <TableHead>Delivery Time</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && deliveredInvoices?.length === 0 ? (
                <TableSkeleton rows={5} cols={10} />
              ) : deliveredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">No delivered packages</TableCell>
                </TableRow>
              ) : (
                deliveredInvoices?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>{invoice.regionalCode}</TableCell>
                    <TableCell>{tweleHrFormatDateString(invoice.pickupTimestamp!)}</TableCell>
                    <TableCell>{tweleHrFormatDateString(invoice.deliveredTimestamp!)}</TableCell>
                    <TableCell>{invoice.paymodeMode}</TableCell>
                    <TableCell>
                      <ShowImage images={invoice.image} />
                    </TableCell>
                    <TableCell>
                      {invoice.deliveredLocationLink ? (
                        <Button variant="default" asChild>
                          <Link 
                            href={`https://www.google.com/maps?q=${invoice.deliveredLocationLink!.replace(',', '+')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Map className="h-4 w-4" />
                            Open in Map
                          </Link>
                        </Button>
                      ) : (
                        <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                          </svg>
                          OTC
                        </span>
                      )}
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
                  onClick={() => deliveredPage > 1 && setDeliveredPage(deliveredPage - 1)}
                  className={deliveredPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {displayedPages(deliveredPage - 1, deliveredTotalPages).map((pageIndex, i) => (
                <PaginationItem key={i}>
                  {pageIndex === -1 ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setDeliveredPage(pageIndex + 1)}
                      isActive={deliveredPage === pageIndex + 1}
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => deliveredPage < deliveredTotalPages && setDeliveredPage(deliveredPage + 1)}
                  className={deliveredPage >= deliveredTotalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className="ml-4 border-l pl-4">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setDeliveredPage(1);
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