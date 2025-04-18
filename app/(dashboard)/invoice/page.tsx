'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { InvoiceData, useInvoiceStore } from '@/store/useInvoiceStore';
import {Check} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from '@/components/ui/use-toast';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import moment from 'moment';
import { Capsule } from '@/components/capsule';
import TableSkeleton from '@/components/table-skeleton';
import { TableEmpty } from '@/components/table-empty';
import { TakeImage } from '@/components/take-image';
import { Input } from "@/components/ui/input";
import { PartyCodeSelector, PartyCode } from '@/components/party-code-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymodeMode } from '@prisma/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { format } from "date-fns"

export default function InvoicePage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [lastInteractedInvoice, setLastInteractedInvoice] = useState<number | null>(null);
  const { toast } = useToast();
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  const {
    invoices,
    selectedDate,
    currentPage,
    itemsPerPage,
    isLoading,
    setInvoices,
    setSelectedDate,
    setCurrentPage,
    updateInvoiceImage,
    saveInvoice,
    resetInvoice,
    handleInvoices,
  } = useInvoiceStore();

  useEffect(() => {
    handleInvoices();
  }, [handleInvoices, selectedDate]);

  //prefixKeyId ? `invoice#${prefixKeyId}#${fileNameWithoutType}` : fileNameWithoutType) + new Date().toISOString() + '.' + fileType,
  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(invoiceNumber);
      
      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const prefixKeyId = `invoice/invoice_number#${invoiceNumber}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      const uploadedImage = await uploadFileToS3(compressedFile , prefixKeyId);

      updateInvoiceImage(invoiceNumber , uploadedImage.key);

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
      event.target.value = '';
    }
  };

  const handlePartyCodeSelect = (invoice: InvoiceData, partyCode: PartyCode) => {
    setLastInteractedInvoice(invoice.invoiceNumber);
    const newData = [...invoices];
    const index = newData.findIndex(item => item.invoiceNumber === invoice.invoiceNumber);
    if (index !== -1) {
      newData[index] = {
        ...newData[index],
        partyCode: partyCode.code,
        medicalName: partyCode.customerName || '-',
        city: partyCode.city || '-',
      };
      setInvoices(newData);
    }
  };

  const handleReset = async (invoiceNumber: number) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      await resetInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Invoice reset successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to reset invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to reset invoice',
        duration: 2000,
      });
    }
  };

  const handleSave = async (invoiceNumber: number) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      
      // Find the invoice to validate required fields
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Client-side validation
      if (!invoice.partyCode) {
        throw new Error('Party code is required');
      }
      
      if (!invoice.paymodeMode) {
        throw new Error('Payment mode is required');
      }
      
      if (!invoice.image || invoice.image.length === 0) {
        throw new Error('At least one image is required');
      }
      
      await saveInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Invoice saved successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Invoice not saved',
        duration: 3000,
      });
    }
  }

  const handleOtc = async (invoiceNumber: number) => {
    try {
      setLastInteractedInvoice(invoiceNumber);
      
      // Find the invoice to validate required fields
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Client-side validation
      if (!invoice.partyCode) {
        throw new Error('Party code is required');
      }
      
      if (!invoice.paymodeMode) {
        throw new Error('Payment mode is required');
      }
      
      // Check if image exists
      if (!invoice.image || invoice.image.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Image Required',
          description: 'Please upload at least one image before saving as OTC.',
          duration: 3000,
        });
        return; // Stop execution if no image
      }
      
      await saveInvoice(invoiceNumber, true);
      toast({
        title: 'Success',
        description: 'Invoice saved successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Invoice not saved',
        duration: 3000,
      });
    }
  }

  // Update filtering logic for invoices based on invoice search term
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoiceNumber.toString().includes(invoiceSearchTerm.trim())
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Invoice Generation</h1>
      </div>
      <Card>
        <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Invoices</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:max-w-[300px]">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={invoiceSearchTerm}
                  onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <DatePicker date={selectedDate} setDate={setSelectedDate} />
                <Button
                  variant={'outline'}
                  disabled={!selectedDate || moment(selectedDate).isSame(moment(), 'day')}
                  onClick={() => setSelectedDate(moment().startOf('day').toDate())}
                >Clear Date</Button>
              </div>
            </div>
          </div>

        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table className=''>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr No.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party Code</TableHead>
                    <TableHead>Medical Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Paymode</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Generated Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && invoices?.length === 0 ? (
                    <TableSkeleton rows={5} cols={10} />
                  ) : !moment(selectedDate).isSame(moment(), 'day') && invoices.length === 0 ?
                    (
                      <TableEmpty
                        text='No invoices created on this date'
                      />
                    ) :
                    (
                      currentInvoices.map((row, i) => (
                        <TableRow key={row.invoiceNumber}
                          className={cn(
                            "border-gray-400",
                            lastInteractedInvoice === row.invoiceNumber && "bg-yellow-600 hover:bg-yellow-600"
                          )}
                        >
                          <TableCell>{(currentPage - 1) * itemsPerPage + i + 1}</TableCell>
                          <TableCell>{
                            !row.invoiceTimestamp ?
                              <Capsule
                                text='Pending'
                                bgColor='bg-red-100'
                                textColor='text-red-700 font-sm'
                                showIcon='cross'
                              />
                              :
                              row.invoiceTimestamp && !moment(row.generatedDate).isSame(moment(row.invoiceTimestamp), 'day') ?
                                <Capsule
                                  text='Delayed'
                                  bgColor='bg-blue-100'
                                  textColor='text-blue-700'
                                  showIcon='ok'
                                />
                                :
                                <Capsule
                                  text='Generated'
                                  bgColor='bg-green-100'
                                  textColor='text-green-700'
                                  showIcon='ok'
                                />
                          }</TableCell>
                          <TableCell>{row.invoiceNumber}</TableCell>
                          <TableCell>{selectedDate ? format(selectedDate, 'd MMM yyyy') : format(new Date(), 'd MMM yyyy')}</TableCell>
                          <TableCell>
                            <PartyCodeSelector
                              value={row.partyCode || null}
                              onChange={(partyCode) => handlePartyCodeSelect(row, partyCode)}
                              disabled={row.isDisabled || row.invoiceTimestamp !== null}
                            />
                          </TableCell>
                          <TableCell>{row.medicalName}</TableCell>
                          <TableCell>{row.city}</TableCell>
                          
                          <TableCell>
                            <Select
                              disabled={row.isDisabled || row.invoiceTimestamp !== null}
                              value={row.paymodeMode || ""}
                              onValueChange={(value) => {
                                try {
                                  const newData = [...invoices];
                                  const index = newData.findIndex(item => item.invoiceNumber === row.invoiceNumber);
                                  if (index !== -1) {
                                    newData[index] = {
                                      ...newData[index],
                                      paymodeMode: value as PaymodeMode
                                    };
                                    setInvoices(newData);
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
                            <TakeImage
                                imageKey={row.invoiceNumber}
                                handleImageUpload={handleImageUpload}
                                isUploading={uploadingImage === row.invoiceNumber}
                                isDisabled={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                                showImages={[...row.image]}
                                takeType='BOTH'
                              />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      disabled={row.isDisabled || isLoading || row.invoiceTimestamp !== null}
                                      onClick={async () => await handleSave(row.invoiceNumber)}
                                      className={!row.image || row.image.length === 0 ? "border-red-500" : ""}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                {(!row.image || row.image.length === 0) && (
                                  <TooltipContent>
                                    <p>Image required before saving</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={row.isDisabled || isLoading}
                                  >
                                    Reset
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset Invoice</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reset this invoice {row.invoiceNumber}? This will clear all entered data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => await handleReset(row.invoiceNumber)}>Reset</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              {
                                row.invoiceTimestamp !== null && row.isOtc === true ? (
                                  <Capsule
                                    text='OTC'
                                    bgColor='bg-green-100'
                                    textColor='text-green-700'
                                    showIcon='ok'
                                  />
                                ) : (
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="default"
                                              size="sm"
                                              disabled={row.isDisabled || isLoading}
                                              className={!row.image || row.image.length === 0 ? "border-red-500" : ""}
                                            >
                                              OTC
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Confirm OTC</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to mark this invoice {row.invoiceNumber} as OTC? This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={async () => await handleOtc(row.invoiceNumber)}>
                                                Confirm
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TooltipTrigger>
                                    {(!row.image || row.image.length === 0) && (
                                      <TooltipContent>
                                        <p>Image required before saving as OTC</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                )
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.invoiceTimestamp !== null ? tweleHrFormatDateString(row.invoiceTimestamp) : '-'}
                          </TableCell>

                        </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {/* First page */}
                {totalPages > 0 && (
                  <PaginationItem className={currentPage === 1 ? 'hidden sm:block' : ''}>
                    <PaginationLink
                      onClick={() => handlePageChange(1)}
                      isActive={currentPage === 1}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}

                {/* Left ellipsis */}
                {currentPage > 3 && (
                  <PaginationItem className="hidden sm:block">
                    <PaginationLink className="cursor-default">...</PaginationLink>
                  </PaginationItem>
                )}

                {/* Mobile: Show only current page */}
                {currentPage !== 1 && currentPage !== totalPages && (
                  <PaginationItem className="sm:hidden">
                    <PaginationLink isActive>{currentPage}</PaginationLink>
                  </PaginationItem>
                )}

                {/* Desktop: Show surrounding pages */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 5) return true;
                    return page === currentPage - 1 || page === currentPage || page === currentPage + 1;
                  })
                  .filter(page => page !== 1 && page !== totalPages)
                  .map((page) => (
                    <PaginationItem key={page} className="hidden sm:block">
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                {/* Right ellipsis */}
                {currentPage < totalPages - 2 && (
                  <PaginationItem className="hidden sm:block">
                    <PaginationLink className="cursor-default">...</PaginationLink>
                  </PaginationItem>
                )}

                {/* Last page */}
                {totalPages > 1 && (
                  <PaginationItem className={currentPage === totalPages ? 'hidden sm:block' : ''}>
                    <PaginationLink
                      onClick={() => handlePageChange(totalPages)}
                      isActive={currentPage === totalPages}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
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