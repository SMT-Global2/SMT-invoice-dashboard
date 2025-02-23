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
import TableSkeleton from '@/components/table-skeleton';
import { Capsule } from '@/components/capsule';

export default function CheckingPage() {
  const { toast } = useToast()
  const { 
    checkInvoices, 
    fetchCheckInvoices, 
    checkInvoice,
    isLoading
  } = useInvoiceStore();

  useEffect(() => {
    fetchCheckInvoices();
  }, [fetchCheckInvoices , checkInvoice]);

  const handleCheckInvoice = async (invoiceNumber: number) => {
    try {
      console.log("Checking invoice:", invoiceNumber);
      await checkInvoice(invoiceNumber);
      toast({
        title: 'Success',
        description: 'Invoice checked successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to check invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to check invoice',
        duration: 2000,
      });
    }
  }

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      <Card>
        <CardHeader>
          <CardTitle>Unchecked Invoices</CardTitle>
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
                {isLoading && checkInvoices?.length === 0 ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : checkInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                  </TableRow>
                ) : (
                  checkInvoices?.filter(invoice => invoice.checkTimestamp === null)?.map((invoice, index) => (
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
                          variant={"default"}
                          disabled={isLoading}
                          onClick={async () => await handleCheckInvoice(invoice.invoiceNumber)}
                        >
                          Check
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
          <CardTitle>Checked Invoices</CardTitle>
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
                  <TableHead>Check Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && checkInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : checkInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                  </TableRow>
                ) : (
                  checkInvoices?.filter(invoice => invoice.checkTimestamp !== null).map((invoice, index) => (
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
                        <Capsule
                          text = "Checked" 
                          showIcon = 'ok' 
                        />
                      </TableCell>
                      <TableCell>{tweleHrFormatDateString(invoice.checkTimestamp!)}</TableCell>
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
