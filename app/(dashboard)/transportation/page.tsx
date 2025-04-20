"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlusIcon, Pencil, Trash2, Search } from "lucide-react"
import { useTransportationStore } from "@/store/useTransportationStore"
import { TransportationDialog } from "./transportation-dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import TableSkeleton from "@/components/table-skeleton"
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"

export default function TransportationPage() {
  const { 
    transportations, 
    fetchTransportations, 
    deleteTransportation, 
    setSelectedTransportation, 
    isLoading,
    pagination,
    totalPages,
    setPage,
    setItemsPerPage
  } = useTransportationStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transportationToDelete, setTransportationToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchTransportations(searchQuery)
  }, [fetchTransportations, pagination.page, pagination.limit, searchQuery])

  const handleEdit = (transportation: any) => {
    setSelectedTransportation(transportation)
  }

  const handleDelete = async (id: string) => {
    await deleteTransportation(id)
    await fetchTransportations()
  }

  const handleAddNew = () => {
    setSelectedTransportation({
      companyName: "",
      contactPersonName: "",
      contactNumber: "",
      email: "",
      city: "",
      remarks: ""
    })
  }

  const handleDeleteClick = (transportationId: string) => {
    setTransportationToDelete(transportationId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (transportationToDelete) {
      await handleDelete(transportationToDelete)
      setIsDeleteDialogOpen(false)
      setTransportationToDelete(null)
    }
  }

  const filteredTransportations = transportations;

  const displayedPages = () => {
    const pages = [];
    let start = Math.max(pagination.page - 2, 0);
    let end = Math.min(pagination.page + 2, totalPages - 1);

    if (start > 0) {
      pages.push(-1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) {
      pages.push(-1);
    }

    return pages;
  }

  return (
    <div className="space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transportation Management</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
          <CardTitle className="m-2">Transportation Companies</CardTitle>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search transportation..."
                className="pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleAddNew} size="sm" className="h-8 px-2 text-xs">
              <PlusIcon className="h-3 w-3 mr-1" />
              Add Transportation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && filteredTransportations?.length === 0 ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : filteredTransportations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No transportation companies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransportations.map((transportation, index) => (
                    <TableRow key={transportation.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{transportation.companyName}</TableCell>
                      <TableCell>{transportation.contactPersonName || '-'}</TableCell>
                      <TableCell>{transportation.contactNumber}</TableCell>
                      <TableCell>{transportation.email || '-'}</TableCell>
                      <TableCell>{transportation.city}</TableCell>
                      <TableCell>
                        {transportation.createdAt ? format(new Date(transportation.createdAt), 'd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(transportation)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(transportation.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent className="flex flex-wrap items-center justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => pagination.page > 0 && setPage(pagination.page - 1)}
                    className={pagination.page <= 0 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {displayedPages().map((pageIndex, i) => (
                  <PaginationItem key={i}>
                    {pageIndex === -1 ? (
                      <span className="px-4 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setPage(pageIndex)}
                        isActive={pagination.page === pageIndex}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => pagination.page < totalPages - 1 && setPage(pagination.page + 1)}
                    className={pagination.page >= totalPages - 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <TransportationDialog />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transportation company from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 