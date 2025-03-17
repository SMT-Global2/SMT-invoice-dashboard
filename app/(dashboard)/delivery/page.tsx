'use client';

import { useDeliveryInvoiceStore } from '@/store/useDeliveryInvoiceStore';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToDeliverTable } from './to-deliver-table';
import { InTransitTable } from './in-transit-table';
import { DeliveredTable } from './delivered-table';

export default function DeliveryPage() {
  const { fetchAllDeliveryInvoices } = useDeliveryInvoiceStore();

  useEffect(() => {
    fetchAllDeliveryInvoices();
  }, [fetchAllDeliveryInvoices]);

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
          <ToDeliverTable />
        </TabsContent>

        <TabsContent value="in-transit">
          <InTransitTable />
        </TabsContent>

        <TabsContent value="delivered">
          <DeliveredTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
