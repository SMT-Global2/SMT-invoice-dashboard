"use client";

import { useMemo } from 'react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ShowImage } from '@/components/show-image';
import TableSkeleton from '@/components/table-skeleton';
import { Calendar, Edit, Plus, Trash2 } from 'lucide-react';
import { ExpiryData } from '@/store/useExpiryStore';
import { tweleHrFormatDateString } from '@/lib/helper';
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
} from "@/components/ui/alert-dialog"

interface RecordTableProps {
  expiryItems: ExpiryData[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
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

export function RecordTable({
  expiryItems,
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
  onDeleteClick
}: RecordTableProps) {
  
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
          <CardTitle>Records</CardTitle>
          <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row">
            <div className="w-full">
              <Input
                type="text"
                placeholder="Search party code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
                <Calendar className="h-4 w-4" />
                <span>Clear</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full border rounded-lg">
          <div className="overflow-auto max-h-[65vh] relative">
            <div className="min-w-[700px] w-full">
              <Table className="w-full">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">Sr. No.</TableHead>
                    <TableHead>Party Code</TableHead>
                    <TableHead>Medical Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Generated Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && expiryItems?.length === 0 ? (
                    <TableSkeleton rows={5} cols={8} />
                  ) : expiryItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">No expiry items found</TableCell>
                    </TableRow>
                  ) : (
                    expiryItems?.map((expiry, index) => (
                      <TableRow key={expiry.id}>
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>{expiry.partyCode}</TableCell>
                        <TableCell>{expiry.party?.customerName || '-'}</TableCell>
                        <TableCell>{expiry.party?.city || '-'}</TableCell>
                        <TableCell>{expiry.voucherNumber}</TableCell>
                        <TableCell>
                          <ShowImage images={expiry.image || []} />
                        </TableCell>
                        <TableCell>{tweleHrFormatDateString(expiry.generatedDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onEditClick(expiry.id)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  className="flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expiry Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expiry item? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteClick(expiry.id)}>Delete</AlertDialogAction>
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
        </div>
        
        {/* Pagination Controls */}
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
      </CardContent>
    </Card>
  );
}
