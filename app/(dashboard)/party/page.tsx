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
import { usePartyStore } from "@/store/usePartyStore"
import { PartyDialog } from "./party-dialog"
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

export default function PartyPage() {
  const { 
    parties, 
    fetchParties, 
    deleteParty, 
    setSelectedParty, 
    isLoading,
    pagination,
    setPagination,
    totalPages 
  } = usePartyStore()

  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchParties(searchQuery)
  }, [fetchParties, pagination.page, pagination.limit, searchQuery])

  const handleEdit = (party: any) => {
    setSelectedParty(party)
  }

  const handleDelete = async (id: string) => {
    await deleteParty(id)
    await fetchParties()
  }

  const handleAddNew = () => {
    setSelectedParty({
      code: "",
      customerName: "",
      city: "",
    })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPagination({ ...pagination, page: 0 }) // Reset to first page on search
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
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
          <CardTitle className="m-2">Party List</CardTitle>
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
              Add Party
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No.</TableHead>
                  <TableHead>Party Code</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && parties?.length === 0 ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : parties?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No parties found
                    </TableCell>
                  </TableRow>
                ) : (
                  parties.map((party, index) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        {pagination.page * pagination.limit + index + 1}
                      </TableCell>
                      <TableCell>{party.code}</TableCell>
                      <TableCell>{party.customerName || '-'}</TableCell>
                      <TableCell>{party.city || '-'}</TableCell>
                      <TableCell>
                        {party.createdAt && new Date(party.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(party)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(party.id!)}
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
              <PaginationContent className="flex flex-wrap justify-center gap-1">
                <PaginationItem>
                  {pagination.page > 0 ? (
                    <PaginationPrevious 
                      onClick={() => setPagination({ 
                        ...pagination, 
                        page: pagination.page - 1 
                      })}
                    />
                  ) : (
                    <PaginationPrevious className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
                
                {displayedPages().map((pageIndex, i) => (
                  <PaginationItem key={i}>
                    {pageIndex === -1 ? (
                      <span className="px-4 py-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setPagination({ ...pagination, page: pageIndex })}
                        isActive={pagination.page === pageIndex}
                      >
                        {pageIndex + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  {pagination.page < totalPages - 1 ? (
                    <PaginationNext
                      onClick={() => setPagination({ 
                        ...pagination, 
                        page: pagination.page + 1 
                      })}
                    />
                  ) : (
                    <PaginationNext className="pointer-events-none opacity-50" />
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <PartyDialog />
    </div>
  )
}