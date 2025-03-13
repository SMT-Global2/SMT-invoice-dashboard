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
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import Link from 'next/link';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import { Calendar, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from '@/components/ui/date-picker';
import moment from 'moment';
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

export default function DeliveryPage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const { toast } = useToast()
  const { 
    toDeliverInvoices,
    inTransitInvoices,
    deliveredInvoices,
    fetchAllDeliveryInvoices,
    fetchToDeliverInvoices,
    fetchInTransitInvoices,
    fetchDeliveredInvoices,
    deliverInvoice,
    pickupInvoice,
    updateDeliveryInvoiceImage,
    isLoading,
    
    // Separate date states for each tab
    toDeliverSelectedDate,
    inTransitSelectedDate,
    deliveredSelectedDate,
    setToDeliverSelectedDate,
    setInTransitSelectedDate,
    setDeliveredSelectedDate,
    
    // Search state and actions
    toDeliverSearchTerm,
    inTransitSearchTerm,
    deliveredSearchTerm,
    setToDeliverSearchTerm,
    setInTransitSearchTerm,
    setDeliveredSearchTerm,
    // Pagination states and actions
    toDeliverPage,
    inTransitPage,
    deliveredPage,
    toDeliverTotalPages,
    inTransitTotalPages,
    deliveredTotalPages,
    setToDeliverPage,
    setInTransitPage,
    setDeliveredPage,
    itemsPerPage,
    setItemsPerPage
  } = useDeliveryInvoiceStore();

  useEffect(() => {
    fetchAllDeliveryInvoices();
  }, [fetchAllDeliveryInvoices]);

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

  const handleDeliver = async (invoiceNumber: number) => {
    try {
      // Get current location using browser's Geolocation API
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await deliverInvoice(invoiceNumber, location);
      toast({
        title: 'Success',
        description: 'Package delivered successfully',
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to deliver package',
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
      const uploadedImage = await uploadFileToS3(compressedFile , invoiceNumber.toString());

      updateDeliveryInvoiceImage(invoiceNumber, uploadedImage.key);

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

  const handleToDeliverDateChange = (date: Date | undefined) => {
    setToDeliverSelectedDate(date);
  };

  const handleInTransitDateChange = (date: Date | undefined) => {
    setInTransitSelectedDate(date);
  };

  const handleDeliveredDateChange = (date: Date | undefined) => {
    setDeliveredSelectedDate(date);
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Delivery Management</h1>
      </div>
      
      <Tabs defaultValue="to-deliver" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="to-deliver">To Deliver</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="to-deliver">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Packages to be Delivered</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={toDeliverSearchTerm}
                      onChange={(e) => setToDeliverSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <DatePicker
                      date={toDeliverSelectedDate}
                      setDate={handleToDeliverDateChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleToDeliverDateChange(undefined)}
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
                          <TableCell>
                            <ShowImage invoice={invoice} images={invoice.image} />
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
              {
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
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-transit">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Packages in Transit | Out for Delivery</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={inTransitSearchTerm}
                      onChange={(e) => setInTransitSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <DatePicker
                      date={inTransitSelectedDate}
                      setDate={handleInTransitDateChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleInTransitDateChange(undefined)}
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
                      <TableHead>Image</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && inTransitInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : inTransitInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No packages in transit</TableCell>
                      </TableRow>
                    ) : (
                      inTransitInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>
                            <TakeImage
                              invoice={invoice}
                              uploadingImage={uploadingImage}
                              handleImageUpload={handleImageUpload}
                              isDisabled={uploadingImage === invoice.invoiceNumber}
                              showImages={[...invoice.image]}
                              takeType='CAMERA'
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="default"
                              disabled={isLoading}
                              onClick={() => handleDeliver(invoice.invoiceNumber)}
                            >
                              Deliver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => inTransitPage > 1 && setInTransitPage(inTransitPage - 1)}
                          className={inTransitPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {displayedPages(inTransitPage - 1, inTransitTotalPages).map((pageIndex, i) => (
                        <PaginationItem key={i}>
                          {pageIndex === -1 ? (
                            <span className="px-4 py-2">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => setInTransitPage(pageIndex + 1)}
                              isActive={inTransitPage === pageIndex + 1}
                            >
                              {pageIndex + 1}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => inTransitPage < inTransitTotalPages && setInTransitPage(inTransitPage + 1)}
                          className={inTransitPage >= inTransitTotalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      <div className="ml-4 border-l pl-4">
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(parseInt(value));
                            setInTransitPage(1);
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
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Delivered Packages</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search invoice number..."
                      value={deliveredSearchTerm}
                      onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <DatePicker
                      date={deliveredSelectedDate}
                      setDate={handleDeliveredDateChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleDeliveredDateChange(undefined)}
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
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Delivery Time</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && deliveredInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : deliveredInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">No delivered packages</TableCell>
                      </TableRow>
                    ) : (
                      deliveredInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>{tweleHrFormatDateString(invoice.pickupTimestamp!)}</TableCell>
                          <TableCell>{tweleHrFormatDateString(invoice.deliveredTimestamp!)}</TableCell>
                          <TableCell>
                            <ShowImage invoice={invoice} images={invoice.image} />
                          </TableCell>
                          <TableCell>
                            {invoice.deliveredLocationLink ? (
                              <Button variant="default" asChild>
                                <Link 
                                  href={`https://www.google.com/maps?q=${invoice.deliveredLocationLink!.replace(',', '+')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <Map className="h-4 w-4" />
                                  Open in Map
                                </Link>
                              </Button>
                            ) : (
                              <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center">
                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                </svg>
                                OTC
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => deliveredPage > 1 && setDeliveredPage(deliveredPage - 1)}
                          className={deliveredPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {displayedPages(deliveredPage - 1, deliveredTotalPages).map((pageIndex, i) => (
                        <PaginationItem key={i}>
                          {pageIndex === -1 ? (
                            <span className="px-4 py-2">...</span>
                          ) : (
                            <PaginationLink
                              onClick={() => setDeliveredPage(pageIndex + 1)}
                              isActive={deliveredPage === pageIndex + 1}
                            >
                              {pageIndex + 1}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => deliveredPage < deliveredTotalPages && setDeliveredPage(deliveredPage + 1)}
                          className={deliveredPage >= deliveredTotalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      <div className="ml-4 border-l pl-4">
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(parseInt(value));
                            setDeliveredPage(1);
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
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
