'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from '@/components/ui/use-toast';
import { tweleHrFormatDateString } from '@/lib/helper';
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
import { TableEmpty } from '@/components/TableEmpty';
import { Spinner } from '@/components/icons';
import imageCompression from 'browser-image-compression';
import { TakeImage } from '@/components/take-image';
import heic2any from 'heic2any';

interface PartyCode {
  id: string;
  code: string;
  customerName: string | null;
  city: string | null;
}

export default function InvoicePage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const { toast } = useToast();

  const {
    invoices,
    selectedDate,
    currentPage,
    itemsPerPage,
    isLoading,
    error,
    invoiceStartNo,
    setInvoices,
    setSelectedDate,
    setCurrentPage,
    updateInvoiceImage,
    saveInvoice,
    resetInvoice,
    handleInvoices,
  } = useInvoiceStore();

  const [partyCodes, setPartyCodes] = useState<PartyCode[]>([]);
  const [partyCodeLoading, setPartyCodeLoading] = useState<boolean>(false)
  const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>({});
  const [openComboboxes, setOpenComboboxes] = useState<{ [key: number]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    handleInvoices();
  }, [handleInvoices, selectedDate]);

  const searchPartyCode = async (search: string) => {
    try {
      setPartyCodeLoading(true);
      const response = await fetch(`/api/partycode?search=${search}`);
      const { data } = await response.json();
      setPartyCodes(data);
    } catch (error) {
      console.error('Failed to fetch party codes:', error);
    } finally {
      setPartyCodeLoading(false);
    }
  };

  const handleSearchChange = (invoiceNumber: number, value: string) => {
    setSearchTerms(prev => ({ ...prev, [invoiceNumber]: value }));
    searchPartyCode(value);
  };

  const toggleCombobox = (invoiceNumber: number, isOpen: boolean) => {
    setOpenComboboxes(prev => ({ ...prev, [invoiceNumber]: isOpen }));
    if (isOpen) {
      searchPartyCode(searchTerms[invoiceNumber] || '');
    }
  };

  useEffect(() => {
    const searchPartyCode = async () => {
      try {
        const response = await fetch(`/api/partycode?search=${searchTerm}`);
        const { data } = await response.json();
        setPartyCodes(data);
      } catch (error) {
        console.error('Failed to fetch party codes:', error);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchPartyCode();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        extension: file.name.split('.').pop()?.toLowerCase()
      });

      setUploadingImage(invoiceNumber);

      // Handle HEIC format
      let processedFile = file;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'heic' || fileExtension === 'heif') {
        try {
          console.log('Converting HEIC/HEIF to JPEG...');
          const blob : any = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 1
          });
          
          if (!blob) {
            throw new Error('HEIC conversion failed - no blob returned');
          }
          
          console.log('HEIC conversion successful, creating new File object');
          processedFile = new File([blob], file.name.replace(/\.(heic|HEIC|heif|HEIF)$/, '.jpg'), {
            type: 'image/jpeg'
          });
          console.log('Processed file:', {
            name: processedFile.name,
            type: processedFile.type,
            size: processedFile.size
          });
        } catch (heicError) {
          console.error('HEIC conversion error:', heicError);
          throw new Error('Failed to convert HEIC image. Please try converting it to JPEG first.');
        }
      }

      // Compression options
      const options = {
        maxSizeMB: 0.8,
        useWebWorker: true,
        fileType: 'image/jpeg',
      };

      // Compress the image
      const compressedFile = await imageCompression(processedFile, options);
      console.log('Original file size:', file.size / 1024 / 1024, 'MB');
      console.log('Compressed file size:', compressedFile.size / 1024 / 1024, 'MB');

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', 'my-unsigened-upload-preset');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();

      updateInvoiceImage(invoiceNumber, data.secure_url);

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
      console.log("Reseting invoice:", invoiceNumber);
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
      console.log("Saving invoice:", invoiceNumber);
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
        duration: 2000,
      });
    }
  }

  const handleOtc = async (invoiceNumber: number) => {
    try {
      console.log("Saving invoice with otc:", invoiceNumber);
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
        duration: 2000,
      });
    }
  }


  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Manage your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <DatePicker date={selectedDate} setDate={setSelectedDate} />
              <Button
                variant={'outline'}
                disabled={!selectedDate || moment(selectedDate).isSame(moment(), 'day')}
                onClick={() => setSelectedDate(moment().startOf('day').toDate())}
              >Clear Date</Button>
            </div>
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
                    <TableHead>Image</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Generated Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
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
                          className={` border-gray-400`}
                        >
                          <TableCell>{(currentPage - 1) * itemsPerPage + i + 1}</TableCell>
                          <TableCell>{
                            !row.invoiceTimestamp ?
                              <Capsule
                                text='Remaining'
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
                          <TableCell>{selectedDate ? selectedDate.toDateString() : new Date().toDateString()}</TableCell>
                          <TableCell>
                            <Popover
                              open={openComboboxes[row.invoiceNumber]}
                              onOpenChange={(isOpen) => toggleCombobox(row.invoiceNumber, isOpen)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openComboboxes[row.invoiceNumber]}
                                  className="justify-between"
                                  disabled={row.isDisabled || row.invoiceTimestamp !== null}
                                >
                                  {row.partyCode || "Select Party"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0" style={{ maxHeight: '300px', width: '300px' }}>
                                <Command>
                                  <CommandInput
                                    placeholder="Party Code"
                                    value={searchTerms[row.invoiceNumber] || ''}
                                    onValueChange={(value) => handleSearchChange(row.invoiceNumber, value)}
                                  />

                                  {
                                    partyCodeLoading ?
                                      <CommandEmpty className="m-auto flex items-center justify-center p-4 relative h-[100px]">
                                        <div className="flex items-center justify-center w-full">
                                          <Spinner />
                                        </div>
                                      </CommandEmpty>
                                      :
                                      <CommandEmpty className="m-auto flex items-center justify-center p-4">
                                        No party found.
                                      </CommandEmpty>
                                  }

                                  <div className="max-h-[200px] overflow-y-auto">
                                    <CommandGroup>
                                      {partyCodes.map((party) => (
                                        <CommandItem
                                          key={party.id}
                                          value={party.code}
                                          onSelect={() => {
                                            handlePartyCodeSelect(row, party);
                                            toggleCombobox(row.invoiceNumber, false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              row.partyCode === party.code ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {party.code} - {party?.customerName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>{row.medicalName}</TableCell>
                          <TableCell>{row.city}</TableCell>
                          <TableCell>
                          <TakeImage
                              invoice={row}
                              uploadingImage={uploadingImage}
                              handleImageUpload={handleImageUpload}
                              isDisabled={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                              showImages={[...row.image]}
                            />
                            {/* <div className="flex items-center space-x-2">
                              <div className="relative flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="gap-2 z-10"
                                  // disabled={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                                >
                                  {
                                    uploadingImage === row.invoiceNumber ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className='w-5 h-5'/> 
                                        Browse Files
                                      </>
                                    )
                                  }
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 z-10"
                                    disabled={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                                  >
                                    {
                                      uploadingImage === row.invoiceNumber ? (
                                        <>
                                          <Camera className='w-5 h-5 text-gray-400'/> 
                                        </>
                                      ) : (
                                        <>
                                          <Camera className='w-5 h-5'/> 
                                        </>
                                      )
                                    }
                                  </Button>

                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload(row.invoiceNumber)}
                                  className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                                  hidden={row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber}
                                  style={{
                                    pointerEvents: row.isDisabled || row.invoiceTimestamp !== null || uploadingImage === row.invoiceNumber ? 'none' : 'auto'
                                  }}
                                />
                              </div>
                              <ShowImage images={row?.image} />
                            </div> */}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                disabled={row.isDisabled || isLoading || row.invoiceTimestamp !== null}
                                onClick={async () => await handleSave(row.invoiceNumber)}
                              >
                                Save
                              </Button>
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
                                      Are you sure you want to reset this invoice? This will clear all entered data.
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
                                  <Button
                                    variant="default"
                                    size="sm"
                                    disabled={row.isDisabled || isLoading}
                                    onClick={async () => await handleOtc(row.invoiceNumber)}
                                  >
                                    OTC
                                  </Button>
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