"use client"

import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnbilledTable } from './unbilled-table';
import { BilledTable } from './billed-table';
import { useBillingInvoiceStore } from '@/store/useBillingInvoiceStore';

export default function BillingPage() {
  const { 
    fetchUnbilledInvoices, 
    fetchBilledInvoices 
  } = useBillingInvoiceStore();

  useEffect(() => {
    // Fetch both types of invoices on page load
    Promise.all([
      fetchUnbilledInvoices(),
      fetchBilledInvoices()
    ]);
  }, [fetchUnbilledInvoices, fetchBilledInvoices]);

  return (
    <div className='space-y-4 overflow-hidden w-full'>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Billing Management</h1>
      </div>
      
      <Tabs defaultValue="unbilled" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unbilled">Unbilled Invoices</TabsTrigger>
          <TabsTrigger value="billed">Billed Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="unbilled">
          <UnbilledTable />
        </TabsContent>

        <TabsContent value="billed">
          <BilledTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}