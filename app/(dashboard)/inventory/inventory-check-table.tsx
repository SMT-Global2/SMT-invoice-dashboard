'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, CalendarIcon, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryData } from '@/store/useInventoryStore';
import { tweleHrFormatDateString } from '@/lib/helper';
import TableSkeleton from '@/components/table-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface InventoryCheckTableProps {
  inventoryItems: InventoryData[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

export function InventoryCheckTable({
  inventoryItems,
  isLoading,
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
  onEditClick,
  onDeleteClick,
}: InventoryCheckTableProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setInventoryToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (inventoryToDelete) {
      onDeleteClick(inventoryToDelete);
      setIsDeleteDialogOpen(false);
      setInventoryToDelete(null);
    }
  };
  
  // Helper function to display pagination pages
  const displayedPages = (currentPage: number, totalPages: number) => {
    const delta = 1;
    const range = [];
    
    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        range.unshift(-1);
      }
      range.unshift(0);
    }

    if (range[range.length - 1] < totalPages - 1) {
      if (range[range.length - 1] < totalPages - 2) {
        range.push(-1);
      }
      range.push(totalPages - 1);
    }

    return range;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Inventory Check</CardTitle>
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <DatePicker
                date={selectedDate}
                setDate={setSelectedDate}
              />
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(undefined)}
                className="flex items-center gap-1"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Clear</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-lg border">
          <div className="overflow-auto max-h-[65vh] relative">
            <Table className="w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">Sr No.</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>Agency Code</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && inventoryItems.length === 0 ? (
                  <TableSkeleton rows={5} cols={9} />
                ) : inventoryItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryItems.map((inventory, index) => (
                    <TableRow key={inventory.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>{tweleHrFormatDateString(inventory.generatedDate)}</TableCell>
                      <TableCell>{inventory.agencyCode}</TableCell>
                      <TableCell>{inventory.agency?.companyName || inventory.agency?.shortName}</TableCell>
                      <TableCell>{inventory.invoiceNumber}</TableCell>
                      <TableCell>{tweleHrFormatDateString(inventory.invoiceDate)}</TableCell>
                      <TableCell>{inventory.orderNumber}</TableCell>
                      <TableCell>{tweleHrFormatDateString(inventory.orderDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditClick(inventory.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(inventory.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {displayedPages(currentPage - 1, totalPages).map((pageIndex, i) => (
                  <PaginationItem key={i}>
                    {pageIndex === -1 ? (
                      <span className="px-4 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(pageIndex + 1)}
                        isActive={currentPage === pageIndex + 1}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                <div className="ml-4 border-l pl-4">
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                    }}
                  >
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inventory item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 