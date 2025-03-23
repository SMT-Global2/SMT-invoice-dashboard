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
import { ShowImage } from '@/components/show-image';
import TableSkeleton from '@/components/table-skeleton';
import { Calendar, RefreshCcw, Save } from 'lucide-react';
import { ExpiryData } from '@/store/useExpiryStore';
import { tweleHrFormatDateString } from '@/lib/helper';
import { Capsule } from '@/components/capsule';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogCancel,
    AlertDialogAction
} from '@/components/ui/alert-dialog';
interface InternalOperatorTableProps {
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
    onSaveCreditNote: (id: string, creditNoteNumber: string) => Promise<void>;
    onResetCreditNote: (id: string) => Promise<void>;
}

export function InternalOperatorTable({
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
    onSaveCreditNote,
    onResetCreditNote
}: InternalOperatorTableProps) {
    // Credit note form state
    const [creditNoteInput, setCreditNoteInput] = useState<{ [key: string]: string }>({});

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

    const handleSaveCreditNote = async (id: string) => {
        try {
            await onSaveCreditNote(id, creditNoteInput[id]);
            setCreditNoteInput(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        } catch (error) {
            console.error('Error saving credit note:', error);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle>Internal Operator</CardTitle>
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
                                        <TableHead>Status</TableHead>
                                        <TableHead>Generated Date</TableHead>
                                        <TableHead>Party Code</TableHead>
                                        <TableHead>Medical Name</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>Voucher No.</TableHead>
                                        <TableHead>Images</TableHead>
                                        <TableHead>Credit Note</TableHead>
                                        <TableHead>Actions</TableHead>
                                        <TableHead>Imported Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && expiryItems?.length === 0 ? (
                                        <TableSkeleton rows={5} cols={10} />
                                    ) : expiryItems?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center">No expiry items found</TableCell>
                                        </TableRow>
                                    ) : (
                                        expiryItems?.map((expiry, index) => (
                                            <TableRow key={expiry.id}>
                                                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                                <TableCell>
                                                    {expiry.creditNoteNumber ? (
                                                        <Capsule
                                                            text='Imported'
                                                            bgColor='bg-green-100'
                                                            textColor='text-green-700'
                                                            showIcon='ok'
                                                        />
                                                    ) : (
                                                        <Capsule
                                                            text='Pending'
                                                            bgColor='bg-amber-100'
                                                            textColor='text-amber-700'
                                                            showIcon='cross'
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>{tweleHrFormatDateString(expiry.generatedDate)}</TableCell>
                                                <TableCell>{expiry.partyCode}</TableCell>
                                                <TableCell>{expiry.party?.customerName || '-'}</TableCell>
                                                <TableCell>{expiry.party?.city || '-'}</TableCell>
                                                <TableCell>{expiry.voucherNumber}</TableCell>
                                                <TableCell>
                                                    <ShowImage images={expiry.image || []} />
                                                </TableCell>
                                                <TableCell>
                                                    {expiry.creditNoteNumber ? (
                                                        expiry.creditNoteNumber
                                                    ) : (
                                                        <Input
                                                            placeholder="Enter credit note..."
                                                            className='w-32'
                                                            value={creditNoteInput[expiry.id] || ''}
                                                            onChange={(e) => setCreditNoteInput({
                                                                ...creditNoteInput,
                                                                [expiry.id]: e.target.value
                                                            })}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleSaveCreditNote(expiry.id)}
                                                            className="flex items-center gap-1"
                                                            disabled={!creditNoteInput[expiry.id] || Boolean(expiry.creditNoteNumber)}
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
                                                                    disabled={!expiry.creditNoteNumber}
                                                                >
                                                                    <RefreshCcw className="h-3 w-3" />
                                                                    Reset
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action will reset the credit note number. This cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => onResetCreditNote(expiry.id)}
                                                                    >
                                                                        Continue
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{expiry?.creditNoteTimestamp ? tweleHrFormatDateString(expiry.creditNoteTimestamp) : '-'}</TableCell>
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
