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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import { FilterX } from 'lucide-react';
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
import { compressImage, convertImage, uploadFileToS3 } from '@/lib/helper';
import moment from 'moment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function InTransitTable() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const { toast } = useToast();
  const { 
    inTransitInvoices,
    deliverInvoice,
    updateDeliveryInvoiceImage,
    isLoading,
    clearAllFilters,
    
    // Date state
    inTransitSelectedDate,
    setInTransitSelectedDate,
    
    // Search state
    inTransitSearchTerm,
    setInTransitSearchTerm,
    
    // Regional code filter
    inTransitSelectedRegionalCodes,
    availableRegionalCodes,
    setInTransitSelectedRegionalCodes,
    
    // Pagination
    inTransitPage,
    inTransitTotalPages,
    setInTransitPage,
    itemsPerPage,
    setItemsPerPage
  } = useDeliveryInvoiceStore();

  const [lastInteractedInvoice, setLastInteractedInvoice] = useState<number | null>(null);

  const handleDeliver = async (invoiceNumber: number) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      // Get current location using browser's Geolocation API
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await deliverInvoice(invoiceNumber, location);
      toast({
        title: 'Success',
        description: 'Package delivered successfully',
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to deliver package',
        duration: 2000,
      });
    }
  }

  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(invoiceNumber);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const prefixKeyId = `delivery/invoice_number#${invoiceNumber}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      const uploadedImage = await uploadFileToS3(compressedFile, prefixKeyId);

      updateDeliveryInvoiceImage(invoiceNumber, uploadedImage.key);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
        duration: 2000,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        duration: 2000,
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleInTransitDateChange = (date: Date | undefined) => {
    setInTransitSelectedDate(date);
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
          <CardTitle>Packages in Transit | Out for Delivery</CardTitle>
          
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
            <div className="flex flex-col gap-2">
              <Input
                type="text"
                placeholder="Search invoice number..."
                value={inTransitSearchTerm}
                onChange={(e) => setInTransitSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-row gap-2">
              <DatePicker date={inTransitSelectedDate} setDate={setInTransitSelectedDate} />
              {/* <Button
                variant={'outline'}
                disabled={!inTransitSelectedDate || moment(inTransitSelectedDate).isSame(moment(), 'day')}
                onClick={() => setInTransitSelectedDate(undefined)}
              >Clear Date</Button> */}
            </div>

            <div className="flex items-center gap-2">
              <RegionalCodeFilter
                selectedRegionalCodes={inTransitSelectedRegionalCodes}
                availableRegionalCodes={availableRegionalCodes}
                setSelectedRegionalCodes={setInTransitSelectedRegionalCodes}
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
                <TableHead>Payment Mode</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && inTransitInvoices?.length === 0 ? (
                <TableSkeleton rows={5} cols={8} />
              ) : inTransitInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No packages in transit</TableCell>
                </TableRow>
              ) : (
                inTransitInvoices?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}
                    className={cn(
                      "border-gray-400",
                      lastInteractedInvoice === invoice.invoiceNumber && "bg-yellow-600 hover:bg-yellow-600"
                    )}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {invoice.generatedDate && format(new Date(invoice.generatedDate), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>{invoice.regionalCode}</TableCell>
                    <TableCell>{invoice.paymodeMode}</TableCell>
                    <TableCell>
                      <TakeImage
                        imageKey={invoice.invoiceNumber}
                        handleImageUpload={handleImageUpload}
                        isUploading={uploadingImage === invoice.invoiceNumber}
                        isDisabled={uploadingImage === invoice.invoiceNumber}
                        showImages={[...invoice.image]}
                        takeType='CAMERA'
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        disabled={isLoading}
                        onClick={() => handleDeliver(invoice.invoiceNumber)}
                      >
                        Deliver
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
                  onClick={() => inTransitPage > 1 && setInTransitPage(inTransitPage - 1)}
                  className={inTransitPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {displayedPages(inTransitPage - 1, inTransitTotalPages).map((pageIndex, i) => (
                <PaginationItem key={i}>
                  {pageIndex === -1 ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setInTransitPage(pageIndex + 1)}
                      isActive={inTransitPage === pageIndex + 1}
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => inTransitPage < inTransitTotalPages && setInTransitPage(inTransitPage + 1)}
                  className={inTransitPage >= inTransitTotalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className="ml-4 border-l pl-4">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setInTransitPage(1);
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