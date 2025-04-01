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
import { useAgencyStore } from "@/store/useAgencyStore"
import { AgencyDialog } from "./agency-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AgencyPage() {
  const { 
    agencies, 
    fetchAgencies, 
    deleteAgency, 
    setSelectedAgency, 
    isLoading,
    pagination,
    totalPages,
    setPage,
    setItemsPerPage
  } = useAgencyStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [agencyToDelete, setAgencyToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchAgencies(searchQuery)
  }, [fetchAgencies, pagination.page, pagination.limit, searchQuery])

  const handleEdit = (agency: any) => {
    setSelectedAgency(agency)
  }

  const handleDelete = async (id: string) => {
    await deleteAgency(id)
    await fetchAgencies()
  }

  const handleAddNew = () => {
    setSelectedAgency({
      code: "",
      companyName: "",
      shortName: "",
    })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(0) // Reset to first page on search
  }

  const handleDeleteClick = (agencyId: string) => {
    setAgencyToDelete(agencyId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (agencyToDelete) {
      await handleDelete(agencyToDelete)
      setIsDeleteDialogOpen(false)
      setAgencyToDelete(null)
    }
  }

  const displayedPages = () => {
    const currentPage = pagination.page
    const total = totalPages
    const delta = 1 // Number of pages to show on each side of current page
    
    const range = []
    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(total - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (range[0] > 0) {
      if (range[0] > 1) {
        range.unshift(-1) // -1 represents dots
      }
      range.unshift(0)
    }

    if (range[range.length - 1] < total - 1) {
      if (range[range.length - 1] < total - 2) {
        range.push(-1)
      }
      range.push(total - 1)
    }

    return range
  }

  return (
    <div className="space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Agency Management</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
          <CardTitle className="m-2">Agency List</CardTitle>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="absolute left-2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by code..."
                className="pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleAddNew} size="sm" className="h-8 px-2 text-xs">
              <PlusIcon className="h-3 w-3 mr-1" />
              Add Agency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>Agency Code</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && agencies?.length === 0 ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : agencies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No agencies found
                    </TableCell>
                  </TableRow>
                ) : (
                  agencies.map((agency, index) => (
                    <TableRow key={agency.id}>
                      <TableCell>
                        {pagination.page * pagination.limit + index + 1}
                      </TableCell>
                      <TableCell>{agency.code}</TableCell>
                      <TableCell>{agency.companyName || '-'}</TableCell>
                      <TableCell>{agency.shortName || '-'}</TableCell>
                      <TableCell>
                        {agency.createdAt && new Date(agency.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agency)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(agency.id!)}
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

                <div className="ml-4 border-l pl-4">
                  <Select
                    value={pagination.limit.toString()}
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
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

      <AgencyDialog />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the agency code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
