"use client"

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventoryStore } from '@/store/useInventoryStore';
import { InventoryDialog } from './inventory-dialog';
import { InventoryCheckTable } from './inventory-check-table';
import { InventoryVoucherTable } from './inventory-voucher-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { compressImage, convertImage, uploadFileToS3 } from '@/lib/helper';

export default function InventoryPage() {
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  
  // Global state from inventory store
  const {
    inventoryItems,
    voucherItems,
    isLoading,
    currentPage,
    voucherCurrentPage,
    totalPages,
    voucherTotalPages,
    itemsPerPage,
    voucherItemsPerPage,
    
    // Actions
    fetchInventoryItems,
    fetchVoucherItems,
    updateInventoryItem,
    deleteInventoryItem,
    setItemsPerPage,
    setVoucherItemsPerPage,
    setCurrentPage,
    setVoucherCurrentPage,
    addVoucher,
    resetVoucher,
    updateInventoryItemImage,
    
    // Dialog state
    isDialogOpen,
    setIsDialogOpen,
    dialogType,
    setDialogType,
    currentInventoryItem,
    setCurrentInventoryItem,
    createInventoryItem,
  } = useInventoryStore();

  // Local state for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [voucherSearchTerm, setVoucherSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [voucherSelectedDate, setVoucherSelectedDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("check");

  // Initial data fetch
  useEffect(() => {
    if (activeTab === "check") {
      fetchInventoryItems({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        date: selectedDate,
      });
    } else {
      fetchVoucherItems({
        page: voucherCurrentPage,
        limit: voucherItemsPerPage,
        search: voucherSearchTerm,
        date: voucherSelectedDate,
      });
    }
  }, [
    activeTab,
    currentPage,
    voucherCurrentPage,
    itemsPerPage,
    voucherItemsPerPage,
    searchTerm,
    voucherSearchTerm,
    selectedDate,
    voucherSelectedDate,
  ]);

  // Handle add button click
  const handleAddClick = () => {
    setDialogType("create");
    setCurrentInventoryItem(undefined);
    setIsDialogOpen(true);
  };

  // Handle edit button click
  const handleEditClick = (id: string) => {
    const inventoryItem = inventoryItems.find(item => item.id === id);
    if (inventoryItem) {
      setDialogType("edit");
      setCurrentInventoryItem(inventoryItem);
      setIsDialogOpen(true);
    }
  };

  // Handle delete button click
  const handleDeleteClick = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive"
      });
    }
  };

  // Handle voucher operations
  const handleSaveVoucher = async (id: string, voucherNumber: number) => {
    try {
      await addVoucher(id, voucherNumber);
      toast({
        title: "Success",
        description: "Voucher added successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error saving voucher:", error);
      toast({
        title: "Error",
        description: "Failed to add voucher",
        variant: "destructive"
      });
    }
  };

  const handleResetVoucher = async (id: string) => {
    try {
      await resetVoucher(id);
      toast({
        title: "Success",
        description: "Voucher reset successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error resetting voucher:", error);
      toast({
        title: "Error",
        description: "Failed to reset voucher",
        variant: "destructive"
      });
    }
  };

  // Handler for save action (create or update)
  const handleSave = async (id: string, data: any) => {
    if (id === 'create') {
      return createInventoryItem(data);
    } else {
      return updateInventoryItem(id, data);
    }
  };

  // Handle image upload
  const handleImageUpload = (invoiceNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(invoiceNumber);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const uploadedImage = await uploadFileToS3(compressedFile, invoiceNumber.toString());

      // Find the inventory item by invoice number
      const inventoryItem = voucherItems.find(item => item.invoiceNumber === invoiceNumber);
      
      if (inventoryItem) {
        // Update item with new image
        await updateInventoryItem(inventoryItem.id, {
          image: [...inventoryItem.image, uploadedImage.key]
        });
        
        // Update local state
        updateInventoryItemImage(inventoryItem.id, uploadedImage.key);
        
        toast({
          title: "Success",
          description: "Image uploaded successfully",
          duration: 2000,
        });
      }
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
      event.target.value = '';
    }
  };

  return (
    <div className="mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
      </div>

      <Tabs
        defaultValue="check"
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="check">Inventory Check</TabsTrigger>
          <TabsTrigger value="voucher">Inventory Voucher</TabsTrigger>
        </TabsList>
        
        <div className="flex justify-end mt-4 mb-2">
          <Button 
            onClick={handleAddClick}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add New Inventory
          </Button>
        </div>

        <TabsContent value="check" className="space-y-4">
          <InventoryCheckTable
            inventoryItems={inventoryItems}
            isLoading={isLoading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            setCurrentPage={setCurrentPage}
            setItemsPerPage={setItemsPerPage}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
          />
        </TabsContent>

        <TabsContent value="voucher" className="space-y-4">
          <InventoryVoucherTable 
            inventoryItems={voucherItems}
            isLoading={isLoading}
            uploadingImage={uploadingImage}
            searchTerm={voucherSearchTerm}
            setSearchTerm={setVoucherSearchTerm}
            selectedDate={voucherSelectedDate}
            setSelectedDate={setVoucherSelectedDate}
            currentPage={voucherCurrentPage}
            totalPages={voucherTotalPages}
            itemsPerPage={voucherItemsPerPage}
            setCurrentPage={setVoucherCurrentPage}
            setItemsPerPage={setVoucherItemsPerPage}
            onSaveVoucher={handleSaveVoucher}
            onResetVoucher={handleResetVoucher}
            handleImageUpload={handleImageUpload}
          />
        </TabsContent>
      </Tabs>

      <InventoryDialog 
        isOpen={isDialogOpen}
        dialogType={dialogType}
        inventoryItem={currentInventoryItem}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
} 