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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { Calendar, RotateCcw, FilterX, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import { tweleHrFormatDateString } from '@/lib/helper';
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
import { cn } from '@/lib/utils';
import { ShowImage } from '@/components/show-image';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';

export function BilledTable() {
  const { toast } = useToast();
  const { 
    billedInvoices, 
    fetchBilledInvoices,
    isBilledLoading,
    resetBilledInvoice,
    
    // Pagination
    billedCurrentPage,
    billedTotalPages,
    billedItemsPerPage,
    setBilledCurrentPage,
    setBilledItemsPerPage,
    
    // Search and filter
    billedSearchTerm,
    billedSelectedDate,
    setBilledSearchTerm,
    setBilledSelectedDate
  } = useBillingInvoiceStore();

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchBilledInvoices();
  }, [fetchBilledInvoices]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '9999'); // fetch all
      if (billedSelectedDate) {
        params.append('date', moment(billedSelectedDate).format('YYYY-MM-DD'));
      }

      const response = await fetch(`/api/invoice/bill/billed?${params.toString()}`);
      const result = await response.json();
      const invoicesToDownload = (result.data || []).map((item: any) => ({
        ...item,
        medicalName: item?.party?.customerName || '-',
        city: item?.party?.city || '-',
      }));

      if (invoicesToDownload.length === 0) {
        toast({ variant: 'default', title: 'No Data', description: 'No billed invoices found for the selected filters.' });
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      const headerText = 'Sanjivan Medico Traders';
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(headerText, (pageWidth - doc.getTextWidth(headerText)) / 2, 15);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const reportDate = billedSelectedDate ? format(billedSelectedDate, 'dd MMM yyyy') : 'All Dates';
      doc.text(`Billed Invoices Report - ${reportDate}`, margin, 22);

      const tableColumns = ['Sr.', 'Inv No', 'Date', 'Party Code', 'Medical Name', 'City', 'Paymode', 'Type', 'Billed At'];
      const tableRows = invoicesToDownload.map((invoice: any, index: number) => [
        index + 1,
        invoice.invoiceNumber,
        invoice.generatedDate ? format(new Date(invoice.generatedDate), 'dd/MM/yy') : '-',
        invoice.partyCode || '-',
        invoice.medicalName || '-',
        invoice.city || '-',
        invoice.paymodeMode || '-',
        invoice.isOtc ? 'OTC' : 'Regular',
        invoice.billedTimestamp ? format(new Date(invoice.billedTimestamp), 'dd/MM/yy') : '-',
      ]);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 27,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [29, 78, 216], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 15 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          6: { cellWidth: 15 },
          7: { cellWidth: 15 },
          8: { cellWidth: 18 },
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 6);
        }
      });

      doc.save(`Billed-Invoices-${reportDate.replace(/ /g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleResetInvoice = async (invoiceNumber: number) => {
    try {
      await resetBilledInvoice(invoiceNumber);
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Billed Invoices</CardTitle>
          
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
            <div className="w-full md:w-[250px]">
              <Input
                type="text"
                placeholder="Search invoice number..."
                value={billedSearchTerm}
                onChange={(e) => setBilledSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                defaultValue="all"
                onValueChange={(value) => {
                  // Handle filter by invoice type (all, regular, otc)
                  if (value === "all") {
                    setBilledSearchTerm("");
                  } else if (value === "regular") {
                    setBilledSearchTerm("type:regular");
                  } else if (value === "otc") {
                    setBilledSearchTerm("type:otc");
                  }
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Invoice Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular Only</SelectItem>
                  <SelectItem value="otc">OTC Only</SelectItem>
                </SelectContent>
              </Select>
              <DatePicker
                date={billedSelectedDate}
                setDate={setBilledSelectedDate}
              />
              <Button 
                variant="outline" 
                onClick={() => {
                  setBilledSelectedDate(undefined);
                  setBilledSearchTerm("");
                }}
                className="flex items-center gap-1"
                size="sm"
              >
                <FilterX className="h-4 w-4" />
                <span>Clear All</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-1"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </>
                )}
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
                  <TableHead>Party Code</TableHead>
                  <TableHead>Medical Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Paymode</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Bill Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isBilledLoading && billedInvoices?.length === 0 ? (
                  <TableSkeleton rows={5} cols={11} />
                ) : billedInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">No billed invoices found</TableCell>
                  </TableRow>
                ) : (
                  billedInvoices?.map((invoice, index) => (
                    <TableRow key={invoice.invoiceNumber}
                      className={cn(
                        "border-gray-400",
                      )}
                    >
                      <TableCell>{(billedCurrentPage - 1) * billedItemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        {invoice.generatedDate && format(new Date(invoice.generatedDate), 'd MMM yyyy')}
                      </TableCell>
                      <TableCell>{invoice.partyCode}</TableCell>
                      <TableCell>{invoice.medicalName || '-'}</TableCell>
                      <TableCell>{invoice.city || '-'}</TableCell>
                      <TableCell>
                        {invoice.isOtc ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            OTC
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            Regular
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.paymodeMode === 'CASH' ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Cash
                          </span>
                        ) : invoice.paymodeMode === 'CREDIT' ? (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                            Credit
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <ShowImage
                          images={[...invoice.image, ...invoice.billImage]}
                        />
                      </TableCell>
                      <TableCell>
                        {invoice.billedTimestamp ? tweleHrFormatDateString(invoice.billedTimestamp) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          disabled={isBilledLoading}
                          onClick={() => handleResetInvoice(invoice.invoiceNumber)}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Reset</span>
                        </Button>
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
                  onClick={() => billedCurrentPage > 1 && setBilledCurrentPage(billedCurrentPage - 1)}
                  className={billedCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {displayedPages(billedCurrentPage - 1, billedTotalPages).map((pageIndex, i) => (
                <PaginationItem key={i}>
                  {pageIndex === -1 ? (
                    <span className="px-4 py-2">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setBilledCurrentPage(pageIndex + 1)}
                      isActive={billedCurrentPage === pageIndex + 1}
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => billedCurrentPage < billedTotalPages && setBilledCurrentPage(billedCurrentPage + 1)}
                  className={billedCurrentPage >= billedTotalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className="ml-4 border-l pl-4">
                <Select
                  value={billedItemsPerPage.toString()}
                  onValueChange={(value) => {
                    setBilledItemsPerPage(parseInt(value));
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
