"use client"

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useReceiptStore, PaymentMethod } from '@/store/useReceiptStore';
import { ReceiptDialog } from './receipt-dialog';
import { RecordTable, PaymentMethodFilter } from './record-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PDFGenerator from './PDFGenerator';

export default function ReceiptPage() {
  const { toast } = useToast();
  
  // Global state from receipt store
  const {
    receiptItems,
    isLoading,
    currentPage,
    totalPages,
    itemsPerPage,
    
    // Actions
    fetchReceiptItems,
    updateReceiptItem,
    deleteReceiptItem,
    setItemsPerPage,
    setCurrentPage,
    
    // Dialog state
    isDialogOpen,
    setIsDialogOpen,
    dialogType,
    setDialogType,
    currentReceiptItem,
    setCurrentReceiptItem,
    createReceiptItem,
  } = useReceiptStore();

  // Local state for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodFilter>("ALL");

  // Initial data fetch
  useEffect(() => {
    fetchReceiptItems({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm,
      date: selectedDate,
      paymentMethod: selectedPaymentMethod === "ALL" ? undefined : selectedPaymentMethod,
    });
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedDate,
    selectedPaymentMethod,
    fetchReceiptItems
  ]);

  // Handle add button click
  const handleAddClick = () => {
    setDialogType("create");
    setCurrentReceiptItem(undefined);
    setIsDialogOpen(true);
  };

  // Handle edit button click
  const handleEditClick = async (id: string) => {
    try {
      // First set loading state
      setIsDialogOpen(true);
      setDialogType("edit");
      
      // Try to find the receipt in the local cache first as a fallback
      const localReceiptItem = receiptItems.find(item => item.id === id);
      
      if (!localReceiptItem) {
        toast({
          title: "Error",
          description: "Could not find receipt in local data",
          variant: "destructive"
        });
        setIsDialogOpen(false);
        return;
      }
      
      // Set the local item first so the dialog can show something immediately
      setCurrentReceiptItem(localReceiptItem);
      
      // Try to fetch fresh data
      try {
        const freshReceipt = await useReceiptStore.getState().fetchReceiptItemById(id);
        if (freshReceipt) {
          console.log('FETCHED FRESH RECEIPT FOR EDIT:', freshReceipt);
          // Update with fresh data
          setCurrentReceiptItem(freshReceipt);
        }
      } catch (fetchError) {
        console.error("Error fetching fresh receipt data:", fetchError);
        // Continue with local data, just log a warning
        console.warn("Using cached receipt data instead of fresh data");
      }
    } catch (error) {
      console.error("Error preparing receipt for edit:", error);
      toast({
        title: "Error",
        description: "Failed to prepare receipt data for editing",
        variant: "destructive"
      });
      setIsDialogOpen(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = async (id: string) => {
    try {
      await deleteReceiptItem(id);
      toast({
        title: "Success",
        description: "Receipt deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive"
      });
    }
  };

  // Handler for save action (create or update)
  const handleSave = async (id: string, data: any) => {
    if (id === 'create') {
      return createReceiptItem(data);
    } else {
      return updateReceiptItem(id, data);
    }
  };

  return (
    <div className="mx-auto py-6 space-y-6">
      
      <div className="flex flex-row md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Receipt Management</h1>
        <div className="flex flex-col md:flex-row gap-2">

          {selectedDate && <PDFGenerator date={selectedDate} />}

          <Button 
            onClick={handleAddClick}
            className="flex items-center gap-2 mt-2 md:mt-0"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add New Receipt
          </Button>

        </div>
      </div>

      <RecordTable
        receiptItems={receiptItems}
        isLoading={isLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod as (method: PaymentMethod | undefined) => void}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        setItemsPerPage={setItemsPerPage}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <ReceiptDialog 
        key={`${dialogType}-${currentReceiptItem?.id || 'new'}`}
        isOpen={isDialogOpen}
        dialogType={dialogType}
        receiptItem={currentReceiptItem}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
} 