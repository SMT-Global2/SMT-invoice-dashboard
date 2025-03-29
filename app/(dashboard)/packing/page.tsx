'use client';

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
import { Camera, Loader2, Upload, FilterX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { usePackingInvoiceStore } from '@/store/usePackingInvoiceStore';
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
import moment from 'moment';

export default function PackingPage() {
  const { toast } = useToast();
  const { 
    unpackedInvoices,
    packedInvoices,
    fetchUnpackedInvoices,
    fetchPackedInvoices,
    packInvoice,
    updatePackInvoiceImage,
    isLoading,
    
    // Pagination
    unpackedCurrentPage,
    unpackedTotalPages,
    packedCurrentPage,
    packedTotalPages,
    itemsPerPage,
    setUnpackedCurrentPage,
    setPackedCurrentPage,
    setItemsPerPage,
    
    // Search
    unpackedSearchTerm,
    packedSearchTerm,
    setUnpackedSearchTerm,
    setPackedSearchTerm,

    // Regional code filters
    unpackedSelectedRegionalCodes,
    packedSelectedRegionalCodes,
    availableRegionalCodes,
    setUnpackedSelectedRegionalCodes,
    setPackedSelectedRegionalCodes,
    fetchAvailableRegionalCodes,
    clearAllFilters
  } = usePackingInvoiceStore();

  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  useEffect(() => {
    fetchUnpackedInvoices();
    fetchPackedInvoices();
    fetchAvailableRegionalCodes();
  }, [fetchUnpackedInvoices, fetchPackedInvoices, fetchAvailableRegionalCodes]);

  const handlePackInvoice = async (invoiceNumber: number) => {
    try {
      await packInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Invoice packed successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to pack invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to pack invoice',
        duration: 2000,
      });
    }
  }

  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(invoiceNumber);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      //find invoice generated date

      const invoiceGeneratedDate = unpackedInvoices.find(invoice => invoice.invoiceNumber === invoiceNumber)?.generatedDate;
      const prefixKeyId = `packing/invoice_number#${invoiceNumber}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      const uploadedImage = await uploadFileToS3(compressedFile , prefixKeyId);

      updatePackInvoiceImage(invoiceNumber, uploadedImage.key);

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
      <Tabs defaultValue="unpacked" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unpacked">Unpacked</TabsTrigger>
          <TabsTrigger value="packed">Packed</TabsTrigger>
        </TabsList>

        <TabsContent value="unpacked">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Unpacked Invoices</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2">
                  {/* Mobile Layout: Stacked */}
                  <div className="flex flex-col gap-2 lg:hidden">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={unpackedSearchTerm}
                      onChange={(e) => setUnpackedSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <RegionalCodeFilter
                        selectedRegionalCodes={unpackedSelectedRegionalCodes}
                        availableRegionalCodes={availableRegionalCodes}
                        setSelectedRegionalCodes={setUnpackedSelectedRegionalCodes}
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
                  
                  {/* Desktop Layout: Row */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={unpackedSearchTerm}
                      onChange={(e) => setUnpackedSearchTerm(e.target.value)}
                      className="w-[200px]"
                    />
                    <RegionalCodeFilter
                      selectedRegionalCodes={unpackedSelectedRegionalCodes}
                      availableRegionalCodes={availableRegionalCodes}
                      setSelectedRegionalCodes={setUnpackedSelectedRegionalCodes}
                      label="Regions"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        clearAllFilters();
                      }}
                      className="flex items-center gap-1"
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
                      <TableHead>Image</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && unpackedInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : unpackedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      unpackedInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{(unpackedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>{invoice.regionalCode}</TableCell>
                          <TableCell>
                            <TakeImage
                              imageKey={invoice.invoiceNumber}
                              handleImageUpload={handleImageUpload}
                              isUploading={uploadingImage === invoice.invoiceNumber}
                              isDisabled={uploadingImage === invoice.invoiceNumber}
                              showImages={[...invoice.image, ...invoice.packImage]}
                              takeType='BOTH'
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={"default"}
                              disabled={isLoading}
                              onClick={async () => await handlePackInvoice(invoice.invoiceNumber)}
                            >
                              Pack
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
                        onClick={() => unpackedCurrentPage > 1 && setUnpackedCurrentPage(unpackedCurrentPage - 1)}
                        className={unpackedCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {displayedPages(unpackedCurrentPage - 1, unpackedTotalPages).map((pageIndex, i) => (
                      <PaginationItem key={i}>
                        {pageIndex === -1 ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setUnpackedCurrentPage(pageIndex + 1)}
                            isActive={unpackedCurrentPage === pageIndex + 1}
                          >
                            {pageIndex + 1}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => unpackedCurrentPage < unpackedTotalPages && setUnpackedCurrentPage(unpackedCurrentPage + 1)}
                        className={unpackedCurrentPage >= unpackedTotalPages ? 'pointer-events-none opacity-50' : ''}
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

        <TabsContent value="packed">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Packed Invoices</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2">
                  {/* Mobile Layout: Stacked */}
                  <div className="flex flex-col gap-2 lg:hidden">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={packedSearchTerm}
                      onChange={(e) => setPackedSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <RegionalCodeFilter
                        selectedRegionalCodes={packedSelectedRegionalCodes}
                        availableRegionalCodes={availableRegionalCodes}
                        setSelectedRegionalCodes={setPackedSelectedRegionalCodes}
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
                  
                  {/* Desktop Layout: Row */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={packedSearchTerm}
                      onChange={(e) => setPackedSearchTerm(e.target.value)}
                      className="w-[200px]"
                    />
                    <RegionalCodeFilter
                      selectedRegionalCodes={packedSelectedRegionalCodes}
                      availableRegionalCodes={availableRegionalCodes}
                      setSelectedRegionalCodes={setPackedSelectedRegionalCodes}
                      label="Regions"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        clearAllFilters();
                      }}
                      className="flex items-center gap-1"
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
                      <TableHead>Image</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pack Time</TableHead>  
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && packedInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={9} />
                    ) : packedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      packedInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{(packedCurrentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>{invoice.regionalCode}</TableCell>
                          <TableCell>
                            <ShowImage images={[...invoice.image, ...invoice.packImage]} />  
                          </TableCell>
                          <TableCell>
                            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                              Packed
                            </span>
                          </TableCell>
                          <TableCell>{tweleHrFormatDateString(invoice.packageTimestamp!)}</TableCell>
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
                        onClick={() => packedCurrentPage > 1 && setPackedCurrentPage(packedCurrentPage - 1)}
                        className={packedCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {displayedPages(packedCurrentPage - 1, packedTotalPages).map((pageIndex, i) => (
                      <PaginationItem key={i}>
                        {pageIndex === -1 ? (
                          <span className="px-4 py-2">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => setPackedCurrentPage(pageIndex + 1)}
                            isActive={packedCurrentPage === pageIndex + 1}
                          >
                            {pageIndex + 1}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => packedCurrentPage < packedTotalPages && setPackedCurrentPage(packedCurrentPage + 1)}
                        className={packedCurrentPage >= packedTotalPages ? 'pointer-events-none opacity-50' : ''}
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
