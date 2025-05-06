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
import { cn } from "@/lib/utils"
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FilterX } from 'lucide-react';
import { RegionalCodeFilter } from '@/components/regional-code-filter';
import { useToast } from '@/components/ui/use-toast'

export default function InvoicePage() {
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [lastInteractedInvoice, setLastInteractedInvoice] = useState<number | null>(null);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
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
    availableRegionalCodes,
    selectedRegionalCodes,
    setSelectedRegionalCodes,
    fetchAvailableRegionalCodes,
  } = useInvoiceStore();

  useEffect(() => {
    handleInvoices();
    fetchAvailableRegionalCodes();
  }, [handleInvoices, selectedDate, fetchAvailableRegionalCodes]);

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

      await updateInvoiceImage(invoiceNumber , uploadedImage.key);

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
      
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
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
      
      const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      if (!invoice.partyCode) {
        throw new Error('Party code is required');
      }
      
      if (!invoice.paymodeMode) {
        throw new Error('Payment mode is required');
      }
      
      if (!invoice.image || invoice.image.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Image Required',
          description: 'Please upload at least one image before saving as OTC.',
          duration: 3000,
        });
        return;
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

  const filteredInvoicesByRegionalCode = invoices.filter(invoice => {
    if(selectedRegionalCodes.length === 0) {
      return true;
    }
    return selectedRegionalCodes.includes(invoice.regionalCode || '');
  });

  const filteredInvoices = filteredInvoicesByRegionalCode.filter(invoice => 
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

  const handleDownloadPDF = async () => {
    if (!selectedDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date to download the PDF.",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      params.append('date', formattedDate);
      params.append('regionalCodes', JSON.stringify(selectedRegionalCodes));

      const response = await fetch(`/api/analytics/invoices-for-pdf?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch invoices for PDF');
      }
      const data = await response.json();
      if (!data.success || !data.invoices) {
        throw new Error(data.message || 'Failed to parse invoice data for PDF');
      }
      const invoicesToDownload = data.invoices;

      if (invoicesToDownload.length === 0) {
        toast({
          variant: "default",
          title: "No Data",
          description: "No invoices found for the selected date to generate PDF.",
        });
        setIsDownloading(false);
        return;
      }

      const doc = new jsPDF();
      const tableRows: any[] = [];
      const tableColumns = [
        "Sr.", "Inv No", "Date", "Party Code", "Medical Name", "City", "Region", "Paymode", "OTC"
      ];

      // Sort invoices by city
      invoicesToDownload.sort((a : any, b : any) => {
        const cityA = a.cityName ? a.cityName.toLowerCase() : '';
        const cityB = b.cityName ? b.cityName.toLowerCase() : '';
        if (cityA === cityB) {
          return a.invoiceNumber - b.invoiceNumber;
        }
        return cityA.localeCompare(cityB);
      });

      invoicesToDownload.forEach((invoice: any, index: number) => {
        // Remove the currentStatus calculation and add an empty column at the end
        const invoiceData = [
          index + 1,
          invoice.invoiceNumber,
          format(new Date(invoice.generatedDate!), 'dd/MM/yy'),
          invoice.partyCode,
          invoice.partyName || '-',
          invoice.cityName || '-',
          invoice.regionalCode || '-',
          invoice.paymodeMode,
          invoice.isOtc ? 'Yes' : '-'
        ];
        tableRows.push(invoiceData);
      });

      const reportDate = format(new Date(selectedDate!), 'dd MMM yyyy');
      
      const headerText = 'Sanjivan Medico Traders';
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerFontSize = 16;
      const subHeaderFontSize = 12;

      doc.setFontSize(headerFontSize);
      doc.setFont('helvetica', 'bold');
      const headerWidth = doc.getTextWidth(headerText);
      const headerX = (pageWidth - headerWidth) / 2;
      doc.text(headerText, headerX, 15);

      doc.setFontSize(subHeaderFontSize);
      doc.setFont('helvetica', 'normal');

      const dateText = `Invoice Report - ${reportDate}`;
      const margin = 14;
      const dateTextX = margin;
      const subHeaderY = 22;

      doc.text(dateText, dateTextX, subHeaderY);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: subHeaderY + 5,
        theme: 'grid',
        styles: {
          fontSize: 8.5, 
          cellPadding: 2, 
        },
        headStyles: { 
          fillColor: [29, 78, 216], 
          textColor: 255, 
          fontSize: 9, 
          fontStyle: 'bold' 
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 15 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          7: { cellWidth: 15 },
          8: { cellWidth: 20 }
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${data.pageNumber}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 6
          );
        }
      });

      doc.save(`Invoice-Report-${reportDate.replace(/ /g, '_')}.pdf`);

    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 overflow-hidden max-w-full px-2 sm:px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Invoice Generation</h1>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col space-y-4 justify-between items-start">
            <CardTitle>Generated Invoices</CardTitle>
            <div className="flex flex-col w-full gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="w-full">
                  <Input
                    type="text"
                    placeholder="Search invoice number..."
                    value={invoiceSearchTerm}
                    onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                    className="w-full h-9"
                  />
                </div>
                <div className="w-full">
                  <RegionalCodeFilter
                    selectedRegionalCodes={selectedRegionalCodes}
                    availableRegionalCodes={availableRegionalCodes}
                    setSelectedRegionalCodes={setSelectedRegionalCodes}
                    label="Regions"
                  />
                </div>
                <div className="w-full">
                  <DatePicker date={selectedDate} setDate={setSelectedDate} />
                </div>
              </div>
              <div className="w-full">
                <div className="inline-flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={!selectedDate || isDownloading}
                    className="h-9 inline-flex items-center gap-1 px-3"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if(selectedDate && !moment(selectedDate).isSame(moment(), 'day')) {
                        setSelectedDate(moment().startOf('day').toDate())
                      }

                      if(selectedRegionalCodes.length > 0) {
                        setSelectedRegionalCodes([])
                      }
                      
                      setInvoiceSearchTerm('')
                    }} 
                    title="Reset to today's date"
                    className="h-9 inline-flex items-center gap-1 px-3"
                  >
                    <FilterX className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            <div className="overflow-x-auto w-full border rounded-lg max-w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                    <TableHead>Region</TableHead>
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
                          <TableCell>{row.regionalCode || '-'}</TableCell>
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
                                // isDisabled={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                                isDisabled={uploadingImage === row.invoiceNumber}
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
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {totalPages > 0 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink
                        onClick={() => handlePageChange(1)}
                        isActive={currentPage === 1}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                      <span className="px-4 py-2">...</span>
                    </PaginationItem>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return page > 1 && page < totalPages;
                      return page > 1 && page < totalPages && (page === currentPage - 1 || page === currentPage || page === currentPage + 1);
                    })
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
                  
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <PaginationItem className="hidden sm:block">
                      <span className="px-4 py-2">...</span>
                    </PaginationItem>
                  )}

                  {totalPages > 1 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink
                        onClick={() => handlePageChange(totalPages)}
                        isActive={currentPage === totalPages}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <div className="sm:hidden mx-2">
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  <div className="ml-2 sm:ml-4 border-l pl-2 sm:pl-4">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        useInvoiceStore.setState({ itemsPerPage: Number(value), currentPage: 1 });
                        handleInvoices();
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}