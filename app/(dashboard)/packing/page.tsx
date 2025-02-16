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
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShowImage } from '@/components/show-image';

export default function PackingPage() {
  const { 
    packInvoices, 
    fetchPackInvoices, 
    isLoading 
  } = useInvoiceStore();

  useEffect(() => {
    fetchPackInvoices();
  }, [fetchPackInvoices]);

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
                <TableHead>Bill Image</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : packInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                </TableRow>
              ) : (
                packInvoices?.filter(invoice => invoice.packTimestamp === null)?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>
                      <ShowImage images={invoice.image} />
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
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
                <TableHead>Bill Image</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : packInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No invoices found</TableCell>
                </TableRow>
              ) : (
                  packInvoices?.filter(invoice => invoice.packTimestamp !== null).map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.medicalName}</TableCell>
                    <TableCell>{invoice.city}</TableCell>
                    <TableCell>
                      <ShowImage images={invoice.image} />  
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
                    <TableCell>{new Date(invoice.packTimestamp!).toLocaleString()}</TableCell>
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
