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
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';

export default function PackingPage() {
  const { toast } = useToast();
  const { 
    packInvoices, 
    fetchPackInvoices, 
    packInvoice,
    isLoading,
    updatePackInvoiceImage
  } = useInvoiceStore();

  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  useEffect(() => {
    fetchPackInvoices();
  }, [fetchPackInvoices , packInvoice]);

  const handlePackInvoice = async (invoiceNumber: number) => {
    try {
      console.log("Packing invoice:", invoiceNumber);
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

      updatePackInvoiceImage(invoiceNumber, data.secure_url);

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
    <Card>
      <CardHeader>
        <CardTitle>Unpacked Invoices</CardTitle>
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
                <TableSkeleton rows={5} cols={8} />
              ) : packInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                </TableRow>
              ) : (
                packInvoices?.filter(invoice => invoice.packageTimestamp === null)?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>
                        <div className="flex items-center space-x-2">
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
                          <ShowImage images={[...invoice.image , ...invoice.packImage]} />
                        </div>
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
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Packed Invoices</CardTitle>
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
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>  
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={5} cols={9} />
              ) : packInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                </TableRow>
              ) : (
                  packInvoices?.filter(invoice => invoice.packageTimestamp !== null).map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>
                      <ShowImage images={[...invoice.image , ...invoice.packImage]} />  
                      {/* {invoice.image ? (
                        <div className="relative h-10 w-10">
                          <Image
                            src={invoice.image}   
                            alt="Bill Image"
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        'No image'
                      )} */}
                    </TableCell>
                    <TableCell>
                      <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Packed
                      </span>
                    </TableCell>
                    <TableCell>{new Date(invoice.packageTimestamp!).toLocaleString()}</TableCell>
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
