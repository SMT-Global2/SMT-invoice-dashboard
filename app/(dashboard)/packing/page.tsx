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
import { Camera, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TableSkeleton from '@/components/table-skeleton';
import { TakeImage } from '@/components/take-image';
import imageCompression from 'browser-image-compression';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';

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
  const [unpackedSearchTerm, setUnpackedSearchTerm] = useState('');
  const [packedSearchTerm, setPackedSearchTerm] = useState('');

  useEffect(() => {
    fetchPackInvoices();
  }, [fetchPackInvoices , packInvoice]);

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
      const uploadedImage = await uploadFileToS3(compressedFile , invoiceNumber.toString());

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

  // Filter invoices based on search terms
  const filteredUnpackedInvoices = packInvoices?.filter(invoice => 
    invoice.packageTimestamp === null &&
    invoice.invoiceNumber.toString().includes(unpackedSearchTerm.trim())
  );

  const filteredPackedInvoices = packInvoices?.filter(invoice => 
    invoice.packageTimestamp !== null &&
    invoice.invoiceNumber.toString().includes(packedSearchTerm.trim())
  );

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
              <CardTitle>Unpacked Invoices</CardTitle>
              <div className="w-full sm:max-w-[300px] mt-2">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={unpackedSearchTerm}
                  onChange={(e) => setUnpackedSearchTerm(e.target.value)}
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
                    {isLoading && packInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={8} />
                    ) : filteredUnpackedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      filteredUnpackedInvoices?.map((invoice, index) => (
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
                              showImages={[...invoice.image , ...invoice.packImage]}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packed">
          <Card>
            <CardHeader>
              <CardTitle>Packed Invoices</CardTitle>
              <div className="w-full sm:max-w-[300px] mt-2">
                <Input
                  type="text"
                  placeholder="Search invoice number..."
                  value={packedSearchTerm}
                  onChange={(e) => setPackedSearchTerm(e.target.value)}
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
                      <TableHead>Status</TableHead>
                      <TableHead>Pack Time</TableHead>  
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && packInvoices?.length === 0 ? (
                      <TableSkeleton rows={5} cols={9} />
                    ) : filteredPackedInvoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      filteredPackedInvoices?.map((invoice, index) => (
                        <TableRow key={invoice.invoiceNumber}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{new Date(invoice.generatedDate!).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.partyCode}</TableCell>
                          <TableCell>{invoice.medicalName}</TableCell>
                          <TableCell>{invoice.city}</TableCell>
                          <TableCell>
                            <ShowImage invoice={invoice} images={[...invoice.image , ...invoice.packImage]} />  
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
