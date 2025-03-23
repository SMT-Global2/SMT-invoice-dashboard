"use client"

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useReceiptStore, PaymentMethod } from '@/store/useReceiptStore';
import { ReceiptDialog } from './receipt-dialog';
import { RecordTable, PaymentMethodFilter } from './record-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
  const handleEditClick = (id: string) => {
    const receiptItem = receiptItems.find(item => item.id === id);
    if (receiptItem) {
      setDialogType("edit");
      setCurrentReceiptItem(receiptItem);
      setIsDialogOpen(true);
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Receipt Management</h1>
        <Button 
          onClick={handleAddClick}
          className="flex items-center gap-2 mt-2 md:mt-0"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add New Receipt
        </Button>
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
        isOpen={isDialogOpen}
        dialogType={dialogType}
        receiptItem={currentReceiptItem}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
} 