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
import { useRef } from 'react';

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
  const printRef = useRef<HTMLDivElement>(null);

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

  const handlePrintInvoices = () => {
    // Define a reliable print function 
    const printContent = () => {
      // Create a hidden iframe for printing to isolate styles
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.top = '-9999px';
      printFrame.style.left = '-9999px';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      document.body.appendChild(printFrame);
      
      // Format current date
      const currentDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      // Format filters for display
      const filterParts = [];
      if (toDeliverSelectedDate) {
        filterParts.push(`<span class="filter-item">Date: ${toDeliverSelectedDate.toLocaleDateString()}</span>`);
      }
      if (toDeliverSearchTerm) {
        filterParts.push(`<span class="filter-item">Search: ${toDeliverSearchTerm}</span>`);
      }
      if (toDeliverSelectedRegionalCodes.length > 0) {
        filterParts.push(`<span class="filter-item">Regions: ${toDeliverSelectedRegionalCodes.join(', ')}</span>`);
      }
      
      const filterDisplay = filterParts.length > 0 
        ? filterParts.join(' ')
        : '<span class="filter-item filter-none">No filters applied</span>';
      
      // Get the document in the iframe
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Packages to be Delivered - ${currentDate}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 1cm;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                background: white;
              }
              .print-container {
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
              }
              .header {
                padding-bottom: 8px;
                margin-bottom: 20px;
                border-bottom: 2px solid #2563eb;
              }
              .title-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              .title {
                font-size: 22px;
                font-weight: bold;
                color: #2563eb;
                margin: 0 0 5px 0;
              }
              .company {
                font-size: 14px;
                font-weight: normal;
                margin: 0;
              }
              .date {
                font-size: 12px;
                color: #666;
                margin: 4px 0;
              }
              .logo {
                text-align: right;
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
                letter-spacing: 1px;
              }
              .filters {
                margin: 12px 0;
                font-size: 12px;
              }
              .filter-item {
                display: inline-block;
                padding: 3px 8px;
                margin-right: 8px;
                background-color: #f3f4f6;
                border-radius: 4px;
                border-left: 3px solid #2563eb;
              }
              .filter-none {
                border-left-color: #9ca3af;
              }
              .table-container {
                width: 100%;
                margin: 0 auto;
                page-break-inside: avoid;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 20px;
              }
              th {
                background-color: #2563eb;
                color: white;
                font-weight: bold;
                text-align: left;
                padding: 8px;
                border: 1px solid #ddd;
              }
              td {
                padding: 6px 8px;
                border: 1px solid #ddd;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .summary {
                margin-top: 20px;
                text-align: right;
                font-size: 12px;
                font-weight: bold;
              }
              .summary-box {
                display: inline-block;
                padding: 8px 16px;
                background-color: #f3f4f6;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .footer {
                margin-top: 30px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #666;
              }
              .signature-line {
                margin-top: 50px;
                border-top: 1px solid #ddd;
                width: 200px;
                padding-top: 5px;
                text-align: center;
                font-size: 10px;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="header">
                <div class="title-section">
                  <div>
                    <h1 class="title">Packages to be Delivered</h1>
                    <p class="company">Medical Distribution System</p>
                    <p class="date">Generated on: ${currentDate}</p>
                  </div>
                  <div class="logo">SMT</div>
                </div>
                <div class="filters">
                  ${filterDisplay}
                </div>
              </div>
              
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Date</th>
                      <th>Invoice No.</th>
                      <th>Party Code</th>
                      <th>Medical Name</th>
                      <th>City</th>
                      <th>Regional Code</th>
                      <th>Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${toDeliverInvoices.map((invoice, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${new Date(invoice.generatedDate!).toLocaleDateString()}</td>
                        <td>${invoice.invoiceNumber}</td>
                        <td>${invoice.partyCode}</td>
                        <td>${invoice.medicalName}</td>
                        <td>${invoice.city}</td>
                        <td>${invoice.regionalCode}</td>
                        <td>${invoice.paymodeMode}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="summary">
                <div class="summary-box">
                  Total Invoices: ${toDeliverInvoices.length}
                </div>
              </div>
              
              <div class="footer">
                <div>This is a computer-generated document. No signature required.</div>
                <div>Page 1 of 1</div>
              </div>
              
              <div class="signature-line">
                Authorized Signature
              </div>
            </div>
          </body>
          </html>
        `);
        frameDoc.close();
        
        // Wait a moment for styles to apply then print
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            
            // Clean up after printing or on error
            printFrame.onload = () => {
              // This executes after printing or if user cancels
              setTimeout(() => {
                document.body.removeChild(printFrame);
              }, 100);
            };
          } catch (error) {
            document.body.removeChild(printFrame);
            toast({
              variant: 'destructive',
              title: 'Print Error',
              description: 'Something went wrong with printing. Please try again.',
            });
          }
        }, 300);
      }
    };
    
    // Execute the print function
    try {
      printContent();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Print Failed',
        description: 'Unable to prepare document for printing.',
      });
    }
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
              <Button variant="outline" className='w-full gap-2' onClick={handlePrintInvoices}>
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