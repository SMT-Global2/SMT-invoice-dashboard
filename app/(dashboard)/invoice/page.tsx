'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { TableEmpty } from '@/components/TableEmpty';
import { Spinner } from '@/components/icons';
import { TakeImage } from '@/components/take-image';
import { Input } from "@/components/ui/input";

interface PartyCode {
  id: string;
  code: string;
  customerName: string | null;
  city: string | null;
}

export default function InvoicePage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
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

  // useEffect(() => {
  //   const searchPartyCode = async () => {
  //     try {
  //       const response = await fetch(`/api/partycode?search=${searchTerm}`);
  //       const { data } = await response.json();
  //       setPartyCodes(data);
  //     } catch (error) {
  //       console.error('Failed to fetch party codes:', error);
  //     }
  //   };

  //   const debounceTimer = setTimeout(() => {
  //     searchPartyCode();
  //   }, 300);

  //   return () => clearTimeout(debounceTimer);
  // }, [searchTerm]);

  const searchPartyCodeHandle = useCallback(async () => {
    if (!searchTerm) return; // Prevent empty calls
    try {
      const response = await fetch(`/api/partycode?search=${searchTerm}`);
      const { data } = await response.json();
      setPartyCodes(data);
    } catch (error) {
      console.error("Failed to fetch party codes:", error);
    }
  }, [searchTerm]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchPartyCodeHandle();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchPartyCode]);

  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(invoiceNumber);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const uploadedImage = await uploadFileToS3(compressedFile);

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
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Manage your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                          className={` border-gray-400`}
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
                          <TableCell>{selectedDate ? selectedDate.toLocaleDateString() : new Date().toLocaleDateString()}</TableCell>
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