"use client"

import {
    Input
  } from '@/components/ui/input';
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
  import { Loader2, RotateCcw, Save, Calendar } from 'lucide-react';
  import { useToast } from '@/components/ui/use-toast';
  import TableSkeleton from '@/components/table-skeleton';
  import { TakeImage } from '@/components/take-image';
  import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
  import { BilledStatus } from '@prisma/client';
  import { useBillingInvoiceStore } from '@/store/useBillingInvoiceStore';
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
  import moment from 'moment';
  import { cn } from '@/lib/utils';

  export default function BillingPage() {
    const { toast } = useToast();
    const { 
      billInvoices, 
      fetchBillInvoices,
      isLoading,
      billInvoice,
      updateBillInvoiceImage,
      
      // Pagination
      currentPage,
      totalPages,
      itemsPerPage,
      setCurrentPage,
      setItemsPerPage,
      
      // Search and filter
      searchTerm,
      selectedDate,
      setSearchTerm,
      setSelectedDate
    } = useBillingInvoiceStore();
  
    const [uploadingImage, setUploadingImage] = useState<number | null>(null);
    const [lastInteractedInvoice, setLastInteractedInvoice] = useState<number | null>(null);
  
    useEffect(() => {
      fetchBillInvoices();
    }, [fetchBillInvoices, currentPage]);
  
    const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setLastInteractedInvoice(invoiceNumber);
        const file = event.target.files?.[0];
        if (!file) return;
  
        setUploadingImage(invoiceNumber);

        
        const changedFile = await convertImage(file);
        const compressedFile = await compressImage(changedFile);
        const prefixKeyId = `billing/invoice_number#${invoiceNumber}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
        const uploadedImage = await uploadFileToS3(compressedFile , prefixKeyId);
  
        updateBillInvoiceImage(invoiceNumber, uploadedImage.key);
  
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

    const handleBillInvoice = async (invoiceNumber: number) => {
      try {
        setLastInteractedInvoice(invoiceNumber);
        await billInvoice(invoiceNumber);
        toast({
          title: 'Success',
          description: 'Invoice billed successfully',
          duration: 2000,
        });
      } catch (error) {
        console.error('Failed to bill invoice:', error);
        toast({
          variant: 'destructive',
          title: 'Failed',
          description: error instanceof Error ? error.message : 'Failed to bill invoice',
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
      <div className='space-y-4 overflow-hidden w-full'>
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Billing Invoices</CardTitle>
              <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                <div className="w-full">
                  <Input
                    type="text"
                    placeholder="Search invoice number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <DatePicker
                    date={selectedDate}
                    setDate={setSelectedDate}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedDate(undefined)}
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Clear</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full rounded-lg border">
              <div className="overflow-auto max-h-[65vh] relative">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[60px]">Sr. No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Medical Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Bill Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && billInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={9} />
                    ) : billInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      billInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}
                          className={cn(
                            "border-gray-400",
                            lastInteractedInvoice === invoice.invoiceNumber && "bg-yellow-600 hover:bg-yellow-600"
                          )}
                        >
                          <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName || '-'}</TableCell>
                          <TableCell>{invoice.city || '-'}</TableCell>
                          <TableCell>
                            <TakeImage
                              imageKey={invoice.invoiceNumber}
                              handleImageUpload={handleImageUpload}
                              isUploading={uploadingImage === invoice.invoiceNumber}
                              isDisabled={uploadingImage === invoice.invoiceNumber || invoice.billedStatus === BilledStatus.BILLED}
                              showImages={[...invoice.image, ...invoice.billImage]}
                              takeType='BOTH'
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                            <Button
                                variant={"default"}
                                disabled={isLoading || invoice.billedStatus === BilledStatus.BILLED}
                                onClick={async () => await handleBillInvoice(invoice.invoiceNumber)}
                              >
                                Bill Invoice
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invoice.billedTimestamp ? tweleHrFormatDateString(invoice.billedTimestamp) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* Pagination Controls */}
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {displayedPages(currentPage - 1, totalPages).map((pageIndex, i) => (
                    <PaginationItem key={i}>
                      {pageIndex === -1 ? (
                        <span className="px-4 py-2">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageIndex + 1)}
                          isActive={currentPage === pageIndex + 1}
                        >
                          {pageIndex + 1}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
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
      </div>
    );
  }