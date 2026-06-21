"use client"

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useReceiptStore, PaymentMethod } from '@/store/useReceiptStore';
import { ReceiptDialog } from './receipt-dialog';
import { RecordTable, PaymentMethodFilter } from './record-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PDFGenerator from './pdf-generator';
import ExcelGenerator from './excel-generator';
import { UserCollectionsCard } from './user-collections-card';
import { TodayDenominationCard } from './today-denomination-card';

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

    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    
    // Dialog state
    isDialogOpen,
    setIsDialogOpen,
    dialogType,
    setDialogType,
    currentReceiptItem,
    setCurrentReceiptItem,
    createReceiptItem,
  } = useReceiptStore();

  // Update from single user to multi-user selection
  const [selectedUsers, setSelectedUsers] = useState<string[] | null>(null);

  // Initial data fetch
  useEffect(() => {
    // Pass selected users to the API if there are any
    const fetchWithUsers = async () => {
      if (selectedUsers && selectedUsers.length > 0) {
        // Call API with usernames parameter
        await fetchReceiptItems({
          usernames: selectedUsers.join(',')
        });
      } else {
        // Call API without usernames parameter
        await fetchReceiptItems();
      }
    };
    
    fetchWithUsers();
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedDate,
    selectedPaymentMethod,
    selectedUsers,
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
    setDialogType("edit");
    setCurrentReceiptItem(receiptItems.find(item => item.id === id));
    setIsDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = async (id: string) => {
    try {
      await deleteReceiptItem(id);
      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete receipt",
        variant: "destructive",
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
        <h1 className="text-xl font-bold">Receipt Management</h1>
        <div className="flex flex-col md:flex-row gap-2">

          {selectedDate && (
            <>
              <PDFGenerator 
                date={selectedDate} 
                userFilter={selectedUsers && selectedUsers.length === 1 ? selectedUsers[0] : null} 
                paymentMethodFilter={selectedPaymentMethod} 
              />
              
              <ExcelGenerator
                date={selectedDate}
                userFilter={selectedUsers}
                paymentMethodFilter={selectedPaymentMethod}
              />
            </>
          )}

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

      <UserCollectionsCard />

      <TodayDenominationCard />

      <RecordTable
        receiptItems={receiptItems}
        isLoading={isLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod as (method: PaymentMethod | undefined) => void}
        selectedUser={selectedUsers}
        setSelectedUser={setSelectedUsers}
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