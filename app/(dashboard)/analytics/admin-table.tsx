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
import { Button } from '@/components/ui/button';
import useAnalyticsStore from '@/store/useAnalyticsStore';
import { useEffect, useState } from 'react';
import { Capsule } from '@/components/capsule';
import { Input } from "@/components/ui/input"
import { CheckCircle, CreditCard, FileText, Package, Search, Store, Truck, X, Download, Loader2 } from "lucide-react"
import TableSkeleton from "@/components/table-skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { InvoiceCard } from "./invoice-card"
import { tweleHrFormatDateString } from '@/lib/helper';
import { RegionalCodeFilter } from '@/components/regional-code-filter';
import { FilterX } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Progress } from "@/components/ui/progress"

export default function AdminInvoiceTable() {
  const {
    fetchAnalytics,
    fetchAvailableRegionalCodes,
    fetchTransporters,
    allInvoices,
    analytics,
    filteredAnalytics,
    isLoading,
    pagination,
    setPagination,
    filters,
    setFilters,
    totalPages,
    availableRegionalCodes,
    setSelectedRegionalCodes,
    transporters,
    clearAllFilters,
    fetchInvoicesForPDF
  } = useAnalyticsStore()
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics, pagination.page, pagination.limit, filters])
  
  useEffect(() => {
    fetchAvailableRegionalCodes()
    fetchTransporters()
  }, [fetchAvailableRegionalCodes, fetchTransporters])

  const displayedPages = () => {
    const currentPage = pagination.page
    const total = totalPages
    const delta = 1

    const range = []
    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(total - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        range.unshift(-1)
      }
      range.unshift(0)
    }

    if (range[range.length - 1] < total - 1) {
      if (range[range.length - 1] < total - 2) {
        range.push(-1)
      }
      range.push(total - 1)
    }

    return range
  }

  const StatusBadge = ({ status }: { status: boolean }) => (
    <span className={`px-2 py-1 rounded-full text-md font-semibold inline-flex items-center gap-1 ${status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
      {status ?
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
        </svg> :
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      }
    </span>
  );

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sortField !== field) return <ChevronsUpDown className="h-4 w-4" />;
    return filters.sortOrder === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  const handleSort = (field: string) => {
    if (filters.sortField === field) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      });
      setPagination({ ...pagination, page: 0 });
    } else {
      setFilters({
        ...filters,
        sortField: field as any,
        sortOrder: 'desc'
      });
      setPagination({ ...pagination, page: 0 });
    }
  };

  const calculateProgress = (invoice : any) => {
    let stages = 0;
    let completed = 0;
    
    stages++;
    completed++;
    
    stages++;
    if (invoice.checkTimestamp) completed++;
    
    stages++;
    if (invoice.packageTimestamp) completed++;
    
    stages += 2;
    if (invoice.deliveryStatus === 'PICKED_UP') completed++;
    if (invoice.deliveryStatus === 'DELIVERED') completed += 2;
    
    stages++;
    if (invoice.billedStatus === 'BILLED') completed++;
    
    return Math.round((completed / stages) * 100);
  };

  const handleDownloadPDF = async () => {
    if (!filters.date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a date to download the PDF.",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const invoicesToDownload = await fetchInvoicesForPDF(
        filters.date,
        filters.selectedRegionalCodes
      );

      if (invoicesToDownload.length === 0) {
        toast({
          variant: "default",
          title: "No Data",
          description: "No invoices found for the selected date and filters.",
        });
        return;
      }

      const doc = new jsPDF();
      const tableRows: any[] = [];
      const tableColumns = [
        "Sr.", "Inv No", "Date", "Party Code", "Medical Name", "City", "Region", "Paymode", ""
      ];

      invoicesToDownload.forEach((invoice: any, index: number) => {
        const invoiceData = [
          index + 1,
          invoice.invoiceNumber,
          format(new Date(invoice.generatedDate!), 'dd/MM/yy'),
          invoice.partyCode,
          invoice.partyName || '-',
          invoice.cityName || '-',
          invoice.regionalCode || '-',
          invoice.paymodeMode,
          ''
        ];
        tableRows.push(invoiceData);
      });

      const reportDate = format(new Date(filters.date), 'dd MMM yyyy');
      
      // --- PDF Header --- 
      const headerText = 'Sanjivan Medico Traders';
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerFontSize = 16;
      const subHeaderFontSize = 12; // Use a consistent font size for the sub-header line

      doc.setFontSize(headerFontSize);
      doc.setFont('helvetica', 'bold');
      const headerWidth = doc.getTextWidth(headerText);
      const headerX = (pageWidth - headerWidth) / 2;
      doc.text(headerText, headerX, 15);

      doc.setFontSize(subHeaderFontSize); // Set font size for the sub-header line
      doc.setFont('helvetica', 'normal'); // Reset font style if needed

      // Sub-header line: Title on left, Regions on right
      const dateText = `Invoice Report - ${reportDate}`;
      const regionsText = `Regions: ${
        filters.selectedRegionalCodes.length > 0 ? filters.selectedRegionalCodes.join(', ') : 'All'
      }`;

      const regionsTextWidth = doc.getTextWidth(regionsText);

      const margin = 14; // Left and right margin for the page
      const dateTextX = margin; // Position date text at left margin
      const regionsTextX = pageWidth - margin - regionsTextWidth; // Position regions text aligned to the right margin
      const subHeaderY = 22; // Y position for this single line containing both texts

      // Draw both text elements at the same Y coordinate (subHeaderY)
      doc.text(dateText, dateTextX, subHeaderY);
      doc.text(regionsText, regionsTextX, subHeaderY);

      // --- PDF Table --- 
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
        description: "Failed to generate PDF. Please try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className='w-full max-w-full overflow-x-hidden relative'>
    
      <Card className="w-full">
        <CardHeader className="flex flex-col space-y-4 pb-4">
          <CardTitle className="text-xl md:text-2xl">Invoice Analytics</CardTitle>
          
          <div className="flex flex-col md:flex-row w-full gap-3">
            <div className="relative w-full md:w-64 flex items-center">
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search invoices..."
                className="pl-8 h-9 text-sm"
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters({ ...filters, searchQuery: e.target.value });
                  setPagination({ ...pagination, page: 0 });
                }}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full md:w-[200px] h-9 justify-start text-left font-normal",
                    !filters.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date ? format(new Date(filters.date), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.date ? new Date(filters.date) : undefined}
                  className="w-[300px] md:w-auto"
                  onSelect={(date) => {
                    setFilters({
                      ...filters,
                      date: date ? format(date, 'yyyy-MM-dd') : null
                    });
                    setPagination({ ...pagination, page: 0 });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <div className='max-w-[200px]'>
              <RegionalCodeFilter
                selectedRegionalCodes={filters.selectedRegionalCodes}
                availableRegionalCodes={availableRegionalCodes}
                setSelectedRegionalCodes={setSelectedRegionalCodes}
                label="Regions"
              />
            </div>

            <Select
              value={filters.transporterFilter}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  transporterFilter: value
                });
                setPagination({ ...pagination, page: 0 });
              }}
            >
              <SelectTrigger className="w-full md:w-auto h-9">
                <SelectValue placeholder="Transport Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {transporters.map((transporter) => (
                  <SelectItem key={transporter.id} value={transporter.id}>
                    {transporter.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.progressStage || 'all'}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  progressStage: value as any
                });
                setPagination({ ...pagination, page: 0 });
              }}
            >
              <SelectTrigger className="w-full md:w-auto h-9">
                <SelectValue placeholder="Process Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="generated">Generated Only</SelectItem>
                <SelectItem value="checked">Checked</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="billed">Billed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-row gap-2">
              <Select
                value={`${filters.sortField}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  setFilters({
                    ...filters,
                    sortField: field as any,
                    sortOrder: order as 'asc' | 'desc'
                  });
                  setPagination({ ...pagination, page: 0 });
                }}
              >
                <SelectTrigger className="w-full md:w-auto h-9">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoiceTimestamp-desc">Latest First</SelectItem>
                  <SelectItem value="invoiceTimestamp-asc">Oldest First</SelectItem>
                  <SelectItem value="invoiceNumber-desc">Invoice Number (High to Low)</SelectItem>
                  <SelectItem value="invoiceNumber-asc">Invoice Number (Low to High)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={!filters.date || isDownloading}
                className="h-9 flex items-center gap-1"
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
                    <Download className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="h-9 flex items-center gap-1"
            >
              <FilterX className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardHeader>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4 md:px-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Generated</CardTitle>
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalGenerated 
                  : analytics.totalGenerated}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Invoices' 
                  : 'Invoices Generated'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Checked</CardTitle>
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalChecked 
                  : analytics.totalChecked}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Checked' 
                  : 'Invoices Checked'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Packed</CardTitle>
              <Package className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalPacked 
                  : analytics.totalPacked}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Packed' 
                  : 'Invoices Packed'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Picked Up</CardTitle>
              <Truck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalPickedUp 
                  : analytics.totalPickedUp}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Picked Up' 
                  : 'Invoices Picked Up'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Transport Deliveries</CardTitle>
              <Truck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalTransportDeliveries 
                  : analytics.totalTransportDeliveries}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Transport' 
                  : 'Via Transport'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Delivered</CardTitle>
              <Truck className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalDelivered 
                  : analytics.totalDelivered}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Delivered' 
                  : 'Invoices Delivered'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">OTC</CardTitle>
              <Store className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalOTC 
                  : analytics.totalOTC}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered OTC' 
                  : 'Invoices OTC'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] sm:text-sm font-medium truncate mr-2">Billed</CardTitle>
              <CreditCard className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? filteredAnalytics.totalBilled 
                  : analytics.totalBilled}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {filters.progressStage !== 'all' || filters.searchQuery || filters.date || filters.selectedRegionalCodes.length > 0 || filters.transporterFilter !== 'all'
                  ? 'Filtered Billed' 
                  : 'Invoices Billed'}
              </p>
            </CardContent>
          </Card>
          
        </div>

        <CardContent className="pt-6 overflow-hidden">
          <div className="overflow-auto w-full border rounded-lg">
            <div className="w-full lg:min-w-[800px] xl:min-w-[1200px]">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sr. No.</TableHead>
                    <TableHead className="w-24">
                      <button
                        className="flex items-center gap-1"
                        onClick={() => handleSort('invoiceNumber')}
                      >
                        Invoice No.
                        <SortIcon field="invoiceNumber" />
                      </button>
                    </TableHead>
                    <TableHead className="w-24">
                      <button
                        className="flex items-center gap-1"
                        onClick={() => handleSort('invoiceTimestamp')}
                      >
                        Date
                        <SortIcon field="invoiceTimestamp" />
                      </button>
                    </TableHead>
                    <TableHead className="w-24">Party Code</TableHead>
                    <TableHead className="w-36">Medical Name</TableHead>
                    <TableHead className="w-24">City</TableHead>
                    <TableHead className="w-24">Regional Code</TableHead>
                    <TableHead className="w-24 text-center">Generated</TableHead>
                    <TableHead className="w-24 text-center">Checked</TableHead>
                    <TableHead className="w-24 text-center">Packed</TableHead>
                    <TableHead className="w-24 text-center">Picked Up</TableHead>
                    <TableHead className="w-24 text-center">Delivered</TableHead>
                    <TableHead className="w-24 text-center">Billed</TableHead>
                    <TableHead className="w-36">Last Updated</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton rows={5} cols={14} />
                  ) : allInvoices.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allInvoices.invoices.map((invoice, index) => (
                      <TableRow key={invoice.invoiceNumber}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceTimestamp!), 'd MMM yyyy')}</TableCell>
                        <TableCell>{invoice.partyCode}</TableCell>
                        <TableCell className="truncate max-w-[140px]">{invoice.party?.customerName}</TableCell>
                        <TableCell>{invoice.party?.city}</TableCell>
                        <TableCell>{invoice.party?.regionalCode}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.invoiceTimestamp} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.checkTimestamp} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.packageTimestamp} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.pickupTimestamp} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.deliveredTimestamp} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={!!invoice.billedTimestamp} /></TableCell>
                        <TableCell>{tweleHrFormatDateString(new Date(invoice.updatedAt))}</TableCell>
                        <TableCell>
                          <Capsule
                            text={invoice.isOtc ? 'OTC' : 'Normal'}
                            bgColor={invoice.isOtc ? 'bg-yellow-100' : 'bg-green-100'}
                            textColor={invoice.isOtc ? 'text-yellow-800' : 'text-green-800'}
                            showIcon='none'
                          />
                        </TableCell>
                        <TableCell>
                          <InvoiceCard invoice={invoice} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => pagination.page > 0 && setPagination({
                      ...pagination,
                      page: pagination.page - 1
                    })}
                    className={pagination.page === 0 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {displayedPages().map((pageIndex, i) => (
                  <PaginationItem key={i}>
                    {pageIndex === -1 ? (
                      <span className="px-4 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setPagination({ ...pagination, page: pageIndex })}
                        isActive={pagination.page === pageIndex}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => pagination.page < totalPages - 1 && setPagination({
                      ...pagination,
                      page: pagination.page + 1
                    })}
                    className={pagination.page >= totalPages - 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                <div className="ml-4 border-l pl-4">
                  <Select
                    value={pagination.limit.toString()}
                    onValueChange={(value) => {
                      setPagination({
                        ...pagination,
                        limit: parseInt(value),
                        page: 0
                      });
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
                      <SelectItem value="100">100 / page</SelectItem>
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