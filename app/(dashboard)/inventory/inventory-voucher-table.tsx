'use client';

import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Search, Loader2, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InventoryData } from '@/store/useInventoryStore';
import { TakeImage } from '@/components/take-image';
import TableSkeleton from '@/components/table-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Capsule } from '@/components/capsule';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface InventoryVoucherTableProps {
  inventoryItems: InventoryData[];
  isLoading: boolean;
  uploadingImage: number | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  onSaveVoucher: (id: string, voucherNumber: number) => Promise<void>;
  onResetVoucher: (id: string) => Promise<void>;
  handleImageUpload: (id: number) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function InventoryVoucherTable({
  inventoryItems,
  isLoading,
  uploadingImage,
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
  onSaveVoucher,
  onResetVoucher,
  handleImageUpload,
}: InventoryVoucherTableProps) {
  const [voucherNumbers, setVoucherNumbers] = useState<{ [key: string]: number }>({});

  const handleVoucherNumberChange = (id: string, value: string) => {
    const numberValue = parseInt(value);
      setVoucherNumbers({
        ...voucherNumbers,
        [id]: numberValue,
      });
  };

  const handleSaveClick = async (id: string) => {
    const voucherNumber = voucherNumbers[id];
    if (voucherNumber) {
      await onSaveVoucher(id, voucherNumber);
    }
  };
  
  // Helper function to display pagination pages
  const displayedPages = useMemo(() => {
    const delta = 1;
    const range = [];
    
    for (
      let i = Math.max(0, currentPage - 1 - delta);
      i <= Math.min(totalPages - 1, currentPage - 1 + delta);
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
  }, [currentPage, totalPages]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>Inventory Voucher</CardTitle>
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
        <div className="w-full border rounded-lg">
          <div className="overflow-auto max-h-[65vh] relative">
            <Table className="w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[60px]">Sr No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agency Code</TableHead>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && inventoryItems.length === 0 ? (
                  <TableSkeleton rows={5} cols={11} />
                ) : inventoryItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      No inventory items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryItems.map((inventory, index) => (
                    <TableRow key={inventory.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>
                        {inventory.voucherNumber ? (
                          <Capsule
                            text='Vouchered'
                            bgColor='bg-green-100'
                            textColor='text-green-700'
                            showIcon='ok'
                          />
                        ) : (
                          <Capsule
                            text='Checked'
                            bgColor='bg-amber-100'
                            textColor='text-amber-700'
                            showIcon='cross'
                          />
                        )}
                      </TableCell>
                      <TableCell>{inventory.agencyCode}</TableCell>
                      <TableCell>{inventory.agency?.companyName || inventory.agency?.shortName}</TableCell>
                      <TableCell>{inventory.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(inventory.invoiceDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{inventory.orderNumber}</TableCell>
                      <TableCell>{format(new Date(inventory.orderDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        <TakeImage
                          handleImageUpload={handleImageUpload}
                          imageKey={inventory.invoiceNumber}
                          isUploading={uploadingImage === inventory.invoiceNumber}
                          isDisabled={!!inventory.voucherNumber}
                          showImages={inventory.image}
                          takeType="BOTH"
                        />
                      </TableCell>
                      <TableCell>
                        {inventory.voucherNumber ? (
                          inventory.voucherNumber
                        ) : (
                          <Input
                            type="number"
                            placeholder="Enter voucher..."
                            className="w-32"
                            value={voucherNumbers[inventory.id] || ''}
                            onChange={(e) => handleVoucherNumberChange(inventory.id, e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveClick(inventory.id)}
                            disabled={!voucherNumbers[inventory.id] || inventory.image.length === 0 || !!inventory.voucherNumber}
                            className="flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                disabled={!inventory.voucherNumber}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will reset the voucher number. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onResetVoucher(inventory.id)}
                                >
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {displayedPages.map((pageIndex, i) => (
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
                      <SelectItem value="5">5 / page</SelectItem>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PaginationContent>
            </Pagination>
          </div>
        }
      </CardContent>
    </Card>
  );
} 