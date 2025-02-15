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
import { Input } from '@/components/ui/input';
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
import { InvoiceData , useInvoiceStore } from '@/store/useInvoiceStore';
import { Check, ChevronsUpDown, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

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
    setInvoices,
    setSelectedDate,
    setCurrentPage,
    updateInvoiceImage,
    fetchInvoices,
    handleInvoices,
  } = useInvoiceStore();

  const [partyCodes, setPartyCodes] = useState<PartyCode[]>([]);
  const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>({});
  const [openComboboxes, setOpenComboboxes] = useState<{ [key: number]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    handleInvoices();
  }, [handleInvoices]);

  const searchPartyCode = async (search: string) => {
    try {
      const response = await fetch(`/api/partycode?search=${search}`);
      const { data } = await response.json();
      setPartyCodes(data);
    } catch (error) {
      console.error('Failed to fetch party codes:', error);
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

      setUploadingImage(invoiceNumber);

      // Convert File to URL path
      const filePath = URL.createObjectURL(file);
      console.log({filePath});

      const formData = new FormData();
      formData.append('file', filePath);
      formData.append('upload_preset', 'ml_default');
      formData.append('timestamp', Date.now().toString());
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
      formData.append('signature', process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET!);

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
        duration: 2000, // 2 seconds
      });
    } finally {
      setUploadingImage(null);
      // Clean up the URL to prevent memory leaks
      if (filePath) {
        URL.revokeObjectURL(filePath);
      }
    }
  };

  const handleReset = (invoiceNumber: number) => {
    const newData = [...invoices];
    const index = newData.findIndex(item => item.invoiceNumber === invoiceNumber);
    if (index !== -1) {
      newData[index] = {
        ...newData[index],
        partyCode: '',
        medicalName: '-',
        city: '-',
        image: [],
      };
      // TODO: Add updateInvoices action to store
      setInvoices(newData);
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
      // TODO: Add updateInvoices action to store
      setInvoices(newData);
    }
  };

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
            </div>
            <div className="overflow-x-auto w-full max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {currentInvoices.map((row) => (
                    <TableRow key={row.invoiceNumber}>
                      <TableCell>{row.invoiceNumber}</TableCell>
                      <TableCell>{row.generatedDate ? row.generatedDate.toLocaleDateString() : new Date().toLocaleDateString()}</TableCell>
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
                              <CommandEmpty>No party found.</CommandEmpty>
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
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload(row.invoiceNumber)}
                              className="absolute inset-0 opacity-0 w-full cursor-pointer"
                            />
                            <Button 
                              variant="outline" 
                              className="gap-2" 
                              disabled={uploadingImage === row.invoiceNumber}
                            >
                              {uploadingImage === row.invoiceNumber ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  Upload Image
                                  <Upload className='w-5 h-5'/>
                                </>
                              )}
                            </Button>
                          </div>
                          <ShowImage images={row?.image}/>
                          {/* {row?.images && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                window.open(row.image!, '_blank');
                              }}
                            >
                              View
                            </Button>
                          )} */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="default" size="sm">
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReset(row.invoiceNumber)}
                          >
                            Reset
                          </Button>
                          <Button variant="secondary" size="sm">
                            OTC
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{row.generatedDate ? row.generatedDate.toLocaleTimeString() : '-'}</TableCell>
                    </TableRow>
                  ))}
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