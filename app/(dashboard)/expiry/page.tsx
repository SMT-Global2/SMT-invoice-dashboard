"use client"

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpiryStore } from '@/store/useExpiryStore';
import { ExpiryDialog } from './expiry-dialog';
import { RecordTable } from './record-table';
import { InternalOperatorTable } from './internal-operator-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ExpiryPage() {
  const { toast } = useToast();
  
  // Global state from expiry store
  const {
    expiryItems,
    importedExpiryItems,
    isLoading,
    currentPage,
    importedCurrentPage,
    totalPages,
    importedTotalPages,
    itemsPerPage,
    importedItemsPerPage,
    
    // Actions
    fetchExpiryItems,
    fetchImportedExpiryItems,
    updateExpiryItem,
    deleteExpiryItem,
    setItemsPerPage,
    setImportedItemsPerPage,
    setCurrentPage,
    setImportedCurrentPage,
    addCreditNote,
    resetCreditNote,
    
    // Dialog state
    isDialogOpen,
    setIsDialogOpen,
    dialogType,
    setDialogType,
    currentExpiryItem,
    setCurrentExpiryItem,
    createExpiryItem,
  } = useExpiryStore();

  // Local state for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [importedSearchTerm, setImportedSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [importedSelectedDate, setImportedSelectedDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("record");

  // Initial data fetch
  useEffect(() => {
    if (activeTab === "record") {
      fetchExpiryItems({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        date: selectedDate,
      });
    } else {
      fetchImportedExpiryItems({
        page: importedCurrentPage,
        limit: importedItemsPerPage,
        search: importedSearchTerm,
        date: importedSelectedDate,
      });
    }
  }, [
    activeTab,
    currentPage,
    importedCurrentPage,
    itemsPerPage,
    importedItemsPerPage,
    searchTerm,
    importedSearchTerm,
    selectedDate,
    importedSelectedDate,
  ]);

  // Handle add button click
  const handleAddClick = () => {
    setDialogType("create");
    setCurrentExpiryItem(undefined);
    setIsDialogOpen(true);
  };

  // Handle edit button click
  const handleEditClick = (id: string) => {
    const expiryItem = expiryItems.find(item => item.id === id);
    if (expiryItem) {
      setDialogType("edit");
      setCurrentExpiryItem(expiryItem);
      setIsDialogOpen(true);
    }
  };

  // Handle delete button click
  const handleDeleteClick = async (id: string) => {
    try {
      await deleteExpiryItem(id);
      toast({
        title: "Success",
        description: "Expiry item deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error deleting expiry item:", error);
      toast({
        title: "Error",
        description: "Failed to delete expiry item",
        variant: "destructive"
      });
    }
  };

  // Handle credit note operations
  const handleSaveCreditNote = async (id: string, creditNoteNumber: string) => {
    try {
      await addCreditNote(id, creditNoteNumber);
      toast({
        title: "Success",
        description: "Credit note added successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error saving credit note:", error);
      toast({
        title: "Error",
        description: "Failed to add credit note",
        variant: "destructive"
      });
    }
  };

  const handleResetCreditNote = async (id: string) => {
    try {
      await resetCreditNote(id);
      toast({
        title: "Success",
        description: "Credit note reset successfully",
        variant: "default"
      });
    } catch (error) {
      console.error("Error resetting credit note:", error);
      toast({
        title: "Error",
        description: "Failed to reset credit note",
        variant: "destructive"
      });
    }
  };

  // Handler for save action (create or update)
  const handleSave = async (id: string, data: any) => {
    if (id === 'create') {
      return createExpiryItem(data);
    } else {
      return updateExpiryItem(id, data);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Expiry Management</h1>
      </div>

      <Tabs
        defaultValue="record"
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="record">Record Table</TabsTrigger>
          <TabsTrigger value="operator">Internal Operations</TabsTrigger>
        </TabsList>
        
        <div className="flex justify-end mt-4 mb-2">
          <Button 
            onClick={handleAddClick}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add New Expiry
          </Button>
        </div>

        <TabsContent value="record" className="space-y-4">
          <RecordTable
            expiryItems={expiryItems}
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

        <TabsContent value="operator" className="space-y-4">
          <InternalOperatorTable 
            expiryItems={importedExpiryItems}
            isLoading={isLoading}
            searchTerm={importedSearchTerm}
            setSearchTerm={setImportedSearchTerm}
            selectedDate={importedSelectedDate}
            setSelectedDate={setImportedSelectedDate}
            currentPage={importedCurrentPage}
            totalPages={importedTotalPages}
            itemsPerPage={importedItemsPerPage}
            setCurrentPage={setImportedCurrentPage}
            setItemsPerPage={setImportedItemsPerPage}
            onSaveCreditNote={handleSaveCreditNote}
            onResetCreditNote={handleResetCreditNote}
          />
        </TabsContent>
      </Tabs>

      <ExpiryDialog 
        isOpen={isDialogOpen}
        dialogType={dialogType}
        expiryItem={currentExpiryItem}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
