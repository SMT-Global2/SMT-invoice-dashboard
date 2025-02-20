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
import { tweleHrFormatDateString } from '@/lib/helper';
import Link from 'next/link';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';

export default function DeliveryPage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
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

      const formData = new FormData();
      formData.append('file', file);
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

      updateDeliverInvoiceImage(invoiceNumber, data.secure_url);

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
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      {/* Table 1: Packages to be Delivered */}
      <Card>
        <CardHeader>
          <CardTitle>Packages to be Delivered</CardTitle>
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
                {isLoading ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : deliveryInvoices?.filter(invoice => !invoice.pickupTimestamp)?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No packages to be delivered</TableCell>
                  </TableRow>
                ) : (
                  deliveryInvoices?.filter(invoice => !invoice.pickupTimestamp)?.map((invoice, index) => (
                    <TableRow key={invoice.invoiceNumber}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.partyCode}</TableCell>
                      <TableCell>{invoice.medicalName}</TableCell>
                      <TableCell>{invoice.city}</TableCell>
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
        </CardContent>
      </Card>

      {/* Table 2: Packages in Transit */}
      <Card>
        <CardHeader>
          <CardTitle>Packages in Transit | Out for Delivery</CardTitle>
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
                {isLoading ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : deliveryInvoices?.filter(invoice => invoice.pickupTimestamp && !invoice.deliveredTimestamp)?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No packages in transit</TableCell>
                  </TableRow>
                ) : (
                  deliveryInvoices?.filter(invoice => invoice.pickupTimestamp && !invoice.deliveredTimestamp)?.map((invoice, index) => (
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
                        />
                        {/* <div className="flex items-center space-x-2">
                          <div className="relative">
                            <Button
                              variant="outline"
                              className="gap-2 z-10"
                              disabled={uploadingImage === invoice.invoiceNumber}
                            >
                              {
                                uploadingImage === invoice.invoiceNumber ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (

                                  <>
                                    <Upload className='w-5 h-5'/> 
                                    Upload Image 
                                  </>
                                )
                              }
                            </Button>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload(invoice.invoiceNumber)}
                              className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                              hidden={uploadingImage === invoice.invoiceNumber}
                              style={{
                                pointerEvents: uploadingImage === invoice.invoiceNumber ? 'none' : 'auto'
                              }}
                            />
                          </div>
                          <ShowImage images={invoice?.image} />
                        </div> */}
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

      {/* Table 3: Delivered Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Delivered Packages</CardTitle>
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : deliveryInvoices?.filter(invoice => invoice.deliveredTimestamp)?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No delivered packages</TableCell>
                  </TableRow>
                ) : (
                  deliveryInvoices?.filter(invoice => invoice.deliveredTimestamp)?.map((invoice, index) => (
                    <TableRow key={invoice.invoiceNumber}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.partyCode}</TableCell>
                      <TableCell>{invoice.medicalName}</TableCell>
                      <TableCell>{invoice.city}</TableCell>
                      <TableCell>
                        <ShowImage images={invoice.image} />
                      </TableCell>
                      <TableCell>{tweleHrFormatDateString(invoice.deliveredTimestamp!)}</TableCell>
                      <TableCell>
                        {
                          invoice.deliveredLocationLink ? 
                          (
                            <Link 
                              href={`https://www.google.com/maps?q=${invoice.deliveredLocationLink!.replace(',', '+')}`}
                              className="text-blue-600 hover:text-blue-800 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Location
                            </Link>
                          )
                          :
                          (
                            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center">
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                              OTC
                            </span>
                          )
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
