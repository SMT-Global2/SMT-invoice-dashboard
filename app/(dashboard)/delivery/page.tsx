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
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import Link from 'next/link';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import { Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DeliveryPage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [toDeliverSearchTerm, setToDeliverSearchTerm] = useState('');
  const [inTransitSearchTerm, setInTransitSearchTerm] = useState('');
  const [deliveredSearchTerm, setDeliveredSearchTerm] = useState('');
  const { toast } = useToast()
  const { 
    deliveryInvoices, 
    fetchDeliveryInvoices, 
    deliverInvoice,
    pickupInvoice,
    updateDeliverInvoiceImage,
    isLoading 
  } = useInvoiceStore();

  useEffect(() => {
    fetchDeliveryInvoices();
  }, [fetchDeliveryInvoices]);

  // Filter invoices based on search terms
  const filteredToDeliverInvoices = deliveryInvoices?.filter(invoice => 
    !invoice.pickupTimestamp &&
    invoice.invoiceNumber.toString().includes(toDeliverSearchTerm.trim())
  );

  const filteredInTransitInvoices = deliveryInvoices?.filter(invoice => 
    invoice.pickupTimestamp && 
    !invoice.deliveredTimestamp &&
    invoice.invoiceNumber.toString().includes(inTransitSearchTerm.trim())
  );

  const filteredDeliveredInvoices = deliveryInvoices?.filter(invoice => 
    invoice.deliveredTimestamp &&
    invoice.invoiceNumber.toString().includes(deliveredSearchTerm.trim())
  );

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

      updateDeliverInvoiceImage(invoiceNumber, uploadedImage.key);

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

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-2'>
      <Tabs defaultValue="to-deliver" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="to-deliver">To Deliver</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="to-deliver">
          <Card>
            <CardHeader>
              <CardTitle>Packages to be Delivered</CardTitle>
              <div className="w-full sm:max-w-[300px] mt-2">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={toDeliverSearchTerm}
                  onChange={(e) => setToDeliverSearchTerm(e.target.value)}
                  className="w-full mt-2"
                />
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
                    {isLoading && deliveryInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : filteredToDeliverInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No packages to be delivered</TableCell>
                      </TableRow>
                    ) : (
                      filteredToDeliverInvoices?.map((invoice, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-transit">
          <Card>
            <CardHeader>
              <CardTitle>Packages in Transit | Out for Delivery</CardTitle>
              <div className="w-full sm:max-w-[300px] mt-2">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={inTransitSearchTerm}
                  onChange={(e) => setInTransitSearchTerm(e.target.value)}
                  className="w-full mt-2"
                />
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
                    {isLoading && deliveryInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : filteredInTransitInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No packages in transit</TableCell>
                      </TableRow>
                    ) : (
                      filteredInTransitInvoices?.map((invoice, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Packages</CardTitle>
              <div className="w-full sm:max-w-[300px] mt-2">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={deliveredSearchTerm}
                  onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                  className="w-full mt-2"
                />
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
                    {isLoading && deliveryInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : filteredDeliveredInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">No delivered packages</TableCell>
                      </TableRow>
                    ) : (
                      filteredDeliveredInvoices?.map((invoice, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
