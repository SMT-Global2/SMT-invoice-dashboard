"use client";

import { useMemo, useState } from 'react';
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
import TableSkeleton from '@/components/table-skeleton';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { PaymentMethod, ReceiptData } from '@/store/useReceiptStore';
import { tweleHrFormatDateString, formatCurrency } from '@/lib/helper';
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
import { UserSelector, User } from '@/components/user-selector';

// Creating a payment method filter type that includes "ALL"
export type PaymentMethodFilter = PaymentMethod | "ALL" | undefined;

interface RecordTableProps {
  receiptItems: ReceiptData[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedPaymentMethod: PaymentMethodFilter;
  setSelectedPaymentMethod: (method: PaymentMethod | undefined) => void;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  onEditClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

export function RecordTable({
  receiptItems,
  isLoading,
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  selectedUser,
  setSelectedUser,
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

  // Helper function to display payment method in human-readable format
  const formatPaymentMethod = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return 'Cash';
      case 'CHEQUE':
        return 'Cheque';
      case 'NONE':
      default:
        return 'None';
    }
  };

  // Helper function to display cheque information
  const displayChequeInfo = (receipt: ReceiptData) => {
    if (receipt.paymentMethod !== 'CHEQUE' || !receipt.cheque) return '-';
    
    return (
      <div className="text-xs">
        <p><strong>Number:</strong> {receipt.cheque.number}</p>
        <p><strong>Bank:</strong> {receipt.cheque.bank}</p>
        <p><strong>Date:</strong> {tweleHrFormatDateString(receipt.cheque.date)}</p>
      </div>
    );
  };

  // Helper function to display cash denomination information
  const displayCashInfo = (receipt: ReceiptData) => {
    if (receipt.paymentMethod !== 'CASH' || !receipt.currencyBills) return '-';
    
    // Get all denominations with non-zero values
    const denominations = [
      { value: 500, count: receipt.currencyBills['500'] },
      { value: 200, count: receipt.currencyBills['200'] },
      { value: 100, count: receipt.currencyBills['100'] },
      { value: 50, count: receipt.currencyBills['50'] },
      { value: 20, count: receipt.currencyBills['20'] },
      { value: 10, count: receipt.currencyBills['10'] },
    ].filter(d => d.count > 0);
    
    if (denominations.length === 0) return 'No bills';
    
    return (
      <>
      <div className="text-xs">
        {denominations.map(d => (
          <p key={d.value}><strong>₹{d.value}:</strong> {d.count} bills</p>
        ))}
      </div>
      <div className="h-[0.5px] bg-slate-700" />
      <div className="text-xs">
        <p><strong>Total:</strong> {formatCurrency(receipt.amount)}</p>
      </div>
      </>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start w-full">
          <CardTitle className="self-start">Receipts</CardTitle>
          <div className="flex flex-col w-full md:w-auto md:ml-auto">
            {/* Filters container with right alignment */}
            
            <div className="flex flex-wrap justify-end gap-2 w-full mt-2 md:mt-0">
              {/* Search input - full width on small screens, reasonable width on larger screens */}
              <div className="w-full sm:w-[300px] lg:w-[300px]">
                <Input
                  type="text"
                  placeholder="Search party code, receipt no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9" 
                />
              </div>

              {/* User Drop down */}
              <div className="w-full sm:w-[160px]">
                <UserSelector
                  value={selectedUser}
                  onChange={(user) => setSelectedUser && setSelectedUser(user.username)}
                  placeholder="Filter by user"
                />
              </div>

              {/* Payment method dropdown - adapts width based on screen size */}
              <div className="w-full sm:w-[160px]">
                <Select
                  value={selectedPaymentMethod || "ALL"}
                  onValueChange={(value) => 
                    setSelectedPaymentMethod(value === "ALL" ? undefined : value as PaymentMethod)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    {/* <SelectItem value="NONE">None</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              {/* Date picker and clear button - better wrapped layout for tablet */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-auto flex-1 sm:flex-none">
                  <DatePicker
                    date={selectedDate}
                    setDate={setSelectedDate}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedDate(undefined);
                    setSelectedPaymentMethod(undefined);
                    setSelectedUser && setSelectedUser(null);
                  }}
                  className="flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Clear</span>
                </Button>
              </div>
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
                  <TableHead className="w-[60px]">Sr. No.</TableHead>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Party Code</TableHead>
                  <TableHead>Medical Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Details</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && receiptItems?.length === 0 ? (
                  <TableSkeleton rows={5} cols={10} />
                ) : receiptItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">No receipt items found</TableCell>
                  </TableRow>
                ) : (
                  receiptItems?.map((receipt, index) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>{receipt.receiptNumber}</TableCell>
                      <TableCell>{receipt.partyCode}</TableCell>
                      <TableCell>{receipt.party?.customerName || '-'}</TableCell>
                      <TableCell>{formatCurrency(receipt.amount)}</TableCell>
                      <TableCell>{formatPaymentMethod(receipt.paymentMethod)}</TableCell>
                      <TableCell>
                        {receipt.paymentMethod === 'CASH' 
                          ? displayCashInfo(receipt) 
                          : receipt.paymentMethod === 'CHEQUE'
                            ? displayChequeInfo(receipt)
                            : '-'
                        }
                      </TableCell>
                      <TableCell>{tweleHrFormatDateString(receipt.generatedDate)}</TableCell>
                      <TableCell>{receipt.receiptUsername || '-'}</TableCell>
                      <TableCell>{receipt.remarks || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onEditClick(receipt.id)}
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
                                <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this receipt? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteClick(receipt.id)}>Delete</AlertDialogAction>
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
            </PaginationContent>
          </Pagination>
        </div>
        
        {/* Items per page control */}
        <div className="mt-4 flex justify-center items-center gap-2">
          <span className="text-sm">Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => setItemsPerPage(parseInt(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={itemsPerPage.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
} 