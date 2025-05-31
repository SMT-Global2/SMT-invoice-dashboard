'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, Clock, FileText, Trash2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
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

interface LastTwoPaymentDisplayProps {
  payments: any[];
  partyCode?: string | null;
  isLoading?: boolean;
  onDelete?: () => void; // Callback to refresh after deletion
}

const LastTwoPaymentDisplay: React.FC<LastTwoPaymentDisplayProps> = ({ 
  payments,
  partyCode,
  isLoading = false,
  onDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);
  const rowsPerPage = 25;
  
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.type === 'ADMIN';

  // Add debug logging to understand the data structure
  useEffect(() => {
    console.log("LastTwoPaymentDisplay received payments:", payments);
    console.log("Looking for party code:", partyCode);
    
    if (payments && payments.length > 0) {
      console.log("First payment sample:", payments[0]);
      if (payments[0].paymentEntries && payments[0].paymentEntries.length > 0) {
        console.log("First payment entry sample:", payments[0].paymentEntries[0]);
        console.log(`Total entries in first payment: ${payments[0].paymentEntries.length}`);
      }
    }
  }, [payments, partyCode]);

  // Convert Excel serial date to JavaScript Date
  const excelDateToJsDate = (excelDate: any): Date => {
    if (!excelDate) return new Date();
    
    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
      return new Date((excelDate - 25569) * 86400 * 1000);
    }
    
    // If it's already a Date or a date string
    if (excelDate instanceof Date) {
      return excelDate;
    }
    
    // Try to parse it as a date string
    return new Date(excelDate);
  };

  // Format date for display
  const formatDateValue = (value: any) => {
    if (!value) return '';
    
    try {
      // If it's a number (Excel serial date)
      if (typeof value === 'number') {
        return format(excelDateToJsDate(value), 'dd/MM/yyyy');
      }
      
      // If it's already a Date object
      if (value instanceof Date) {
        return format(value, 'dd/MM/yyyy');
      }
      
      // If it's a string that looks like a date
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return format(new Date(value), 'dd/MM/yyyy');
      }
      
      // Otherwise just return as is
      return String(value);
    } catch (e) {
      console.log("Date formatting error:", e);
      return String(value);
    }
  };

  // Format amount values
  const formatAmount = (value: any) => {
    if (value === undefined || value === null) return '';
    
    try {
      if (typeof value === 'number') {
        return value.toLocaleString('en-IN', { 
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
        });
      }
      return String(value);
    } catch (e) {
      return String(value);
    }
  };

  // Group entries by file/payment record
  const groupedEntries = React.useMemo(() => {
    const groups: Record<string, any> = {};
    
    payments.forEach(payment => {
      if (!payment.paymentEntries || !Array.isArray(payment.paymentEntries)) {
        return;
      }
      
      // Find entries for this party if partyCode is provided
      const relevantEntries = partyCode 
        ? payment.paymentEntries.filter((entry: any) => {
            // Check direct match on partyCode
            if (entry.partyCode && entry.partyCode.toString() === partyCode.toString()) {
              return true;
            }
            
            return false;
          })
        : payment.paymentEntries;
      
      // Only add this payment to groups if it has relevant entries
      if (relevantEntries.length > 0) {
        // Create a key for this payment
        const paymentKey = payment.id;
        groups[paymentKey] = {
          id: payment.id,
          name: payment.name,
          paymentDate: payment.paymentDate,
          uploadDate: payment.uploadDate,
          entries: relevantEntries,
          entriesCount: relevantEntries.length
        };
      }
    });
    
    return groups;
  }, [payments, partyCode]);

  // Process entries for a specific payment with search and pagination
  const getProcessedEntriesForPayment = (paymentId: string) => {
    const payment = groupedEntries[paymentId];
    if (!payment) {
      return { filteredData: [], totalItems: 0, totalPages: 0 };
    }
    
    // Apply search filter if search term exists
    let searchFiltered = payment.entries;
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      searchFiltered = payment.entries.filter((entry: any) => {
        if (!entry) return false;
        
        // Search in multiple fields with the new nested data structure
        const code = entry.partyCode || '';
        const narration = entry.data?.narration || '';
        const method = entry.data?.paymentMethod || '';
        const chequeNo = entry.data?.checkNumber || '';
        
        return String(code).toLowerCase().includes(lowerSearchTerm) ||
               narration.toLowerCase().includes(lowerSearchTerm) ||
               method.toLowerCase().includes(lowerSearchTerm) ||
               String(chequeNo).toLowerCase().includes(lowerSearchTerm);
      });
    }
    
    // Sort by date (most recent first)
    const sortedEntries = [...searchFiltered].sort((a, b) => {
      // Get date from the nested data structure
      const dateA = a.data?.date instanceof Date ? a.data.date : new Date(a.data?.date || Date.now());
      const dateB = b.data?.date instanceof Date ? b.data.date : new Date(b.data?.date || Date.now());
      
      return dateB.getTime() - dateA.getTime();
    });
    
    // Calculate pagination
    const totalItems = sortedEntries.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    // Get the current page data
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    const paginatedData = sortedEntries.slice(startIndex, endIndex);
    
    return { 
      filteredData: paginatedData,
      totalItems,
      totalPages
    };
  };

  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Toggle payment expansion
  const togglePaymentExpansion = (paymentId: string) => {
    setExpandedPayments(prev => ({
      ...prev,
      [paymentId]: !prev[paymentId]
    }));
  };

  // Generate page numbers for pagination with ellipsis for large page counts
  const getPageNumbers = (totalPages: number) => {
    if (totalPages <= 7) {
      // If 7 or fewer pages, show all page numbers
      return Array.from({ length: totalPages }, (_, i) => String(i + 1));
    }
    
    // For many pages, show a subset with ellipsis
    if (currentPage <= 3) {
      // Near start: show 1 2 3 4 5 ... {last}
      return [1, 2, 3, 4, 5, '...', totalPages].map(String);
    } else if (currentPage >= totalPages - 2) {
      // Near end: show 1 ... {totalPages-4} {totalPages-3} {totalPages-2} {totalPages-1} {totalPages}
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map(String);
    } else {
      // Middle: show 1 ... {currentPage-1} {currentPage} {currentPage+1} ... {totalPages}
      return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages].map(String);
    }
  };

  // Get array of payment IDs
  const paymentIds = Object.keys(groupedEntries);
  const hasPayments = paymentIds.length > 0;

  // Handle payment deletion
  const handleDeletePayment = async (paymentId: string) => {
    if (!isAdmin) {
      setShowAccessDeniedDialog(true);
      return;
    }
    
    setPaymentToDelete(paymentId);
    setShowDeleteDialog(true);
  };

  // Perform the actual deletion
  const confirmDelete = async () => {
    if (!paymentToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/last-two-payment?id=${paymentToDelete}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete payment record');
      }
      
      toast({
        title: "Success",
        description: "Payment record deleted successfully",
      });
      
      // Call the onDelete callback to refresh data
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete payment record",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPaymentToDelete(null);
    }
  };

  // Modify the existing renderPaymentTable function to include delete button
  const renderPaymentTable = (paymentId: string) => {
    const payment = groupedEntries[paymentId];
    if (!payment) return null;
    
    const { filteredData, totalItems, totalPages } = getProcessedEntriesForPayment(paymentId);
    const isExpanded = expandedPayments[paymentId];
    
    return (
      <div className="space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 px-1 hover:bg-muted/30 rounded-md transition-colors"
          onClick={() => togglePaymentExpansion(paymentId)}
        >
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <FileText className="h-4 w-4 text-muted-foreground mr-2" />
              {payment.name} 
              <span className="text-muted-foreground ml-2">
                {formatDateValue(payment.paymentDate)}
              </span>
              <Badge variant="outline" className="ml-3">
                {payment.entriesCount} entries
              </Badge>
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={(e : React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleDeletePayment(paymentId);
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <div className="bg-primary/10 p-1 rounded-full">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-primary" />
              ) : (
                <ChevronDown className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <Badge variant="outline" className="ml-2">
                {totalItems} records
              </Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Party Code</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-28">Amount</TableHead>
                  <TableHead className="w-28">Receipt Type</TableHead>
                  <TableHead className="w-28">Cheque No.</TableHead>
                  <TableHead className="flex-1">Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((entry: any, index: number) => {
                  // Extract party code from either direct property or data.accode
                  const code = entry.partyCode || '';
                  
                  // Now extract from the nested data structure after our database schema changes
                  // Extract date from the nested data field
                  const date = entry.data?.date || new Date();
                  
                  // Extract amount from the nested data field
                  const amount = entry.data?.amount || 0;
                  
                  // Extract payment method from the nested data field
                  const method = entry.data?.paymentMethod || 'N/A';
                  
                  // Extract cheque number from the nested data field
                  const chequeNo = entry.data?.checkNumber || '';
                  
                  // Extract narration for remark from the nested data field
                  const narration = entry.data?.narration || '';
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{code || '—'}</TableCell>
                      <TableCell>{formatDateValue(date)}</TableCell>
                      <TableCell>{formatAmount(amount)}</TableCell>
                      <TableCell>{method || 'N/A'}</TableCell>
                      <TableCell>{chequeNo || '—'}</TableCell>
                      <TableCell>{narration || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPage(Math.max(1, currentPage - 1));
                      }}
                      className={cn(currentPage === 1 && "opacity-50 cursor-not-allowed")}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers(totalPages).map((page, i) => (
                    <React.Fragment key={i}>
                      {page === '...' ? (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem>
                          <PaginationLink
                            onClick={(e) => {
                              e.stopPropagation();
                              goToPage(Number(page));
                            }}
                            isActive={currentPage === Number(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                    </React.Fragment>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPage(Math.min(totalPages, currentPage + 1));
                      }}
                      className={cn(currentPage === totalPages && "opacity-50 cursor-not-allowed")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    );
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((_, index) => (
        <Card key={index} className="border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground opacity-70" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24 ml-2" />
              <div className="flex items-center ml-4">
                <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground opacity-70" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground opacity-70" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {/* Main content */}
      {isLoading ? (
        renderLoadingSkeleton()
      ) : Object.keys(groupedEntries).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">No Payment Data</h3>
          <p className="text-sm text-muted-foreground">
            {partyCode 
              ? "No payment records found for this party code" 
              : "No payment records found for the selected date"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedEntries).map((paymentId) => (
            <Card key={paymentId} className={cn(
              "overflow-hidden",
              expandedPayments[paymentId] && "border-primary/50"
            )}>
              <CardContent className="p-4">
                {renderPaymentTable(paymentId)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access denied dialog */}
      <AlertDialog open={showAccessDeniedDialog} onOpenChange={setShowAccessDeniedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Access Denied</AlertDialogTitle>
            <AlertDialogDescription>
              Only administrators can delete payment records. Please contact an administrator if you need to delete a record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LastTwoPaymentDisplay; 