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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import useAnalyticsStore, { IInvoice } from '@/store/useAnalyticsStore';
import { useEffect } from 'react';
import { Capsule } from '@/components/capsule';

export default function AdminInvoiceTable() {
  const {
      fetchAnalytics,
      invoiceAnalytics
  } = useAnalyticsStore()
  
  useEffect(() => {
    fetchAnalytics()
  },[fetchAnalytics])

  const StatusBadge = ({ status }: { status: boolean }) => (
    <span className={`px-2 py-1 rounded-full text-md font-semibold inline-flex items-center gap-1 ${
      status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {status ?  
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
      </svg> : 
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
      </svg>
        }
    </span>
  );

  const MoreInfoDialog = ({ invoice }: { invoice: IInvoice }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Show More</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
          <p><strong>Party Code:</strong> {invoice.partyCode}</p>
          <p><strong>Medical Name:</strong> {invoice.party?.customerName}</p>
          <p><strong>City:</strong> {invoice.party?.city}</p>
          {/* Add more details as needed */}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className='space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Code</TableHead>
                  <TableHead>Medical Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Checked</TableHead>
                  <TableHead>Packed</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceAnalytics?.allInvoices?.map((invoice, index) => (
                  <TableRow key={invoice.invoiceNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{new Date(invoice.invoiceTimestamp!).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.partyCode}</TableCell>
                    <TableCell>{invoice.party?.customerName}</TableCell>
                    <TableCell>{invoice.party?.city}</TableCell>
                    <TableCell><StatusBadge status={!!invoice.invoiceTimestamp} /></TableCell>
                    <TableCell><StatusBadge status={!!invoice.checkTimestamp} /></TableCell>
                    <TableCell><StatusBadge status={!!invoice.packageTimestamp} /></TableCell>
                    <TableCell><StatusBadge status={!!invoice.deliveredTimestamp} /></TableCell>
                    <TableCell>{new Date(invoice.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Capsule 
                        text={invoice.isOtc ? 'OTC' : 'Normal'}
                        bgColor={invoice.isOtc ? 'bg-yellow-100' : 'bg-green-100'}
                        textColor={invoice.isOtc ? 'text-yellow-800' : 'text-green-800'}
                        showIcon='none'
                      />
                    </TableCell>
                    <TableCell>
                      <MoreInfoDialog invoice={invoice} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}