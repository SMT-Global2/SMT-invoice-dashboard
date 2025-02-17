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
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { useToast } from '@/components/ui/use-toast';
import { tweleHrFormatDateString } from '@/lib/helper';
import Link from 'next/link';

export default function DeliveryPage() {
  const { toast } = useToast()
  const { 
    deliveryInvoices, 
    fetchDeliveryInvoices, 
    deliverInvoice,
    pickupInvoice,
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

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      {/* Table 1: Packages to be Delivered */}
      <Card>
        <CardHeader>
          <CardTitle>Packages to be Delivered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
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
          <div className="relative overflow-x-auto">
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
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
                        <ShowImage images={invoice.image} />
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
          <div className="relative overflow-x-auto">
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
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                  </TableRow>
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
                        <Link 
                          href={`https://www.google.com/maps?q=${invoice.deliveredLocationLink!.replace(',', '+')}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Location
                        </Link>
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
