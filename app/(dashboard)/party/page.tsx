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
import { PlusIcon, Pencil, Trash2, Search, History, Phone, Download } from "lucide-react"
import { usePartyStore } from "@/store/usePartyStore"
import { PartyDialog } from "./party-dialog"
import { PastDeliveriesDialog } from "./past-deliveries-dialog"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function PartyPage() {
  const { 
    parties, 
    fetchParties, 
    deleteParty, 
    setSelectedParty, 
    isLoading,
    pagination,
    totalPages,
    setPage,
    setItemsPerPage,
    setSelectedPartyForDeliveries,
    resetDeliveriesState
  } = usePartyStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("code")
  const [sortOrder, setSortOrder] = useState("asc")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null)
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
  const [selectedPartyForCall, setSelectedPartyForCall] = useState<any>(null)
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [downloadCity, setDownloadCity] = useState('All')
  const [downloadRegion, setDownloadRegion] = useState('All')
  const [downloadSort, setDownloadSort] = useState('partyCodeAsc')
  const [downloadFormat, setDownloadFormat] = useState('excel')
  const [allParties, setAllParties] = useState<any[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [allPartiesForSorting, setAllPartiesForSorting] = useState<any[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  // Get unique cities and regional codes from all parties
  const allCities = Array.from(new Set(allParties.map(p => p.city).filter(Boolean)))
  allCities.unshift('All')
  const allRegions = Array.from(new Set(allParties.map(p => p.regionalCode).filter(Boolean)))
  allRegions.unshift('All')

  // Fetch all parties for sorting
  const fetchAllPartiesForSorting = async () => {
    setIsLoadingAll(true)
    try {
      const res = await fetch('/api/party?page=0&limit=10000')
      const json = await res.json()
      setAllPartiesForSorting(json.data || [])
    } catch (error) {
      console.error('Failed to fetch all parties for sorting:', error)
    } finally {
      setIsLoadingAll(false)
    }
  }

  // Sort parties based on selected criteria (using all parties)
  const sortedParties = [...allPartiesForSorting].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'code':
        aValue = a.code || ''
        bValue = b.code || ''
        break
      case 'updatedAt':
        aValue = new Date(a.updatedAt || 0)
        bValue = new Date(b.updatedAt || 0)
        break
      case 'createdAt':
      default:
        aValue = new Date(a.createdAt || 0)
        bValue = new Date(b.createdAt || 0)
        break
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    } else {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    }
  })

  // Apply search filter to sorted parties
  const filteredAndSortedParties = sortedParties.filter(party => 
    searchQuery === '' || 
    party.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.regionalCode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Apply pagination to filtered and sorted parties
  const paginatedParties = filteredAndSortedParties.slice(
    pagination.page * pagination.limit,
    (pagination.page + 1) * pagination.limit
  )

  // Calculate total pages based on filtered results
  const totalPagesForSorting = Math.ceil(filteredAndSortedParties.length / pagination.limit)

  // Helper function to escape CSV values
  const escapeCSVValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Download handler (fetch all parties, then show dialog)
  const handleDownloadClick = async () => {
    setIsDownloading(true)
    try {
      // Fetch all parties (ignore pagination)
      const res = await fetch('/api/party?page=0&limit=10000')
      if (!res.ok) throw new Error('Failed to fetch parties')
      const json = await res.json()
      setAllParties(json.data || [])
      setShowDownloadDialog(true)
    } catch (err) {
      toast.error('Failed to fetch parties for download')
    } finally {
      setIsDownloading(false)
    }
  }

  // Actual download after filter selection
  const handleDownloadFiltered = () => {
    try {
    let filtered = allParties
    if (downloadCity !== 'All') filtered = filtered.filter(p => p.city === downloadCity)
    if (downloadRegion !== 'All') filtered = filtered.filter(p => p.regionalCode === downloadRegion)

    // Sort based on selected option
    filtered = filtered.sort((a, b) => {
      const aCode = a.code || ''
      const bCode = b.code || ''
      const aRegion = a.regionalCode || ''
      const bRegion = b.regionalCode || ''
      switch (downloadSort) {
        case 'partyCodeAsc':
          if (aCode < bCode) return -1
          if (aCode > bCode) return 1
          if (aRegion < bRegion) return -1
          if (aRegion > bRegion) return 1
          return 0
        case 'partyCodeDesc':
          if (aCode > bCode) return -1
          if (aCode < bCode) return 1
          if (aRegion > bRegion) return -1
          if (aRegion < bRegion) return 1
          return 0
        case 'regionalCodeAsc':
          if (aRegion < bRegion) return -1
          if (aRegion > bRegion) return 1
          if (aCode < bCode) return -1
          if (aCode > bCode) return 1
          return 0
        case 'regionalCodeDesc':
          if (aRegion > bRegion) return -1
          if (aRegion < bRegion) return 1
          if (aCode > bCode) return -1
          if (aCode < bCode) return 1
          return 0
        default:
          return 0
      }
    })
    
    const downloadDate = new Date().toLocaleString()
    const data = filtered.map(party => {
      // Handle phone numbers - ensure they are comma-separated in a single cell
      let phoneNumbersStr = '-'
      if (party.phoneNumber && Array.isArray(party.phoneNumber) && party.phoneNumber.length > 0) {
        phoneNumbersStr = party.phoneNumber.filter((num: string) => num && num.trim() !== '').join(', ')
      } else if (party.phoneNumber && typeof party.phoneNumber === 'string') {
        phoneNumbersStr = party.phoneNumber
      }
      
      return {
        'Party Code': party.code,
        'Regional Code': party.regionalCode || '-',
        'Customer Name': party.customerName || '-',
        'City': party.city || '-',
        'Phone Numbers': phoneNumbersStr,
      }
    })
    
    if (data.length === 0) {
      setShowDownloadDialog(false)
      return
    }
    
    const fileName = `parties_${downloadCity}_${downloadRegion}_${Date.now()}`
    
    switch (downloadFormat) {
      case 'excel':
        const wsData = [[`download date : ${downloadDate}`], Object.keys(data[0]), ...data.map(Object.values)]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Parties')
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${fileName}.xlsx`)
        break
      case 'csv':
        const csvData = [`download date : ${downloadDate}`]
        // Headers
        csvData.push(Object.keys(data[0]).map(escapeCSVValue).join(','))
        // Data rows
        data.forEach(row => {
          const escapedValues = Object.values(row).map(value => escapeCSVValue(String(value)))
          csvData.push(escapedValues.join(','))
        })
        const csvContent = csvData.join('\n')
        saveAs(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }), `${fileName}.csv`)
        break
      case 'pdf':
        const doc = new jsPDF()
        doc.setFontSize(12)
        doc.text(`Download Date: ${downloadDate}`, 14, 20)
        
        const tableData = data.map(row => Object.values(row))
        const tableHeaders = Object.keys(data[0])
        
        autoTable(doc, {
          head: [tableHeaders],
          body: tableData,
          startY: 30,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        })
        
        doc.save(`${fileName}.pdf`)
        break
    }
    
    setShowDownloadDialog(false)
    } catch (err) {
      toast.error('Failed to generate download file')
    }
  }

  useEffect(() => {
    // Reset deliveries state when component mounts
    resetDeliveriesState()
    
    // Fetch all parties for sorting
    fetchAllPartiesForSorting()
    
    // Also fetch paginated parties for backward compatibility
    fetchParties(searchQuery)
  }, [fetchParties, resetDeliveriesState])

  // Fetch all parties when sort criteria changes
  useEffect(() => {
    fetchAllPartiesForSorting()
  }, [sortBy, sortOrder])

  // Reset to first page when search changes
  useEffect(() => {
    setPage(0)
  }, [searchQuery, setPage])

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
      phoneNumber: [""]
    })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(0) // Reset to first page on search
  }

  const handleDeleteClick = (partyId: string) => {
    setPartyToDelete(partyId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (partyToDelete) {
      await handleDelete(partyToDelete)
      setIsDeleteDialogOpen(false)
      setPartyToDelete(null)
    }
  }

  const handleViewPastDeliveries = (partyCode: string) => {
    setSelectedPartyForDeliveries(partyCode)
  }

  const handleCallClick = (party: any) => {
    if (!party.phoneNumber || party.phoneNumber.length === 0) {
      return; // No phone numbers to call
    }
    
    if (Array.isArray(party.phoneNumber) && party.phoneNumber.length === 1) {
      // Single number - call directly
      window.open(`tel:${party.phoneNumber[0]}`, '_self');
    } else {
      // Multiple numbers - show dialog
      setSelectedPartyForCall(party);
      setIsCallDialogOpen(true);
    }
  }

  const handleCallNumber = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
    setIsCallDialogOpen(false);
    setSelectedPartyForCall(null);
  }

  const handleCloseCallDialog = () => {
    setIsCallDialogOpen(false);
    setSelectedPartyForCall(null);
  }

  // Helper function to display pagination pages
  const displayedPages = () => {
    const currentPage = pagination.page
    const total = totalPagesForSorting
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
        <h1 className="text-2xl font-bold">Party Management</h1>
      </div>
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
            
            {/* Sort Controls */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="updatedAt">Recent Edited</SelectItem>
                  <SelectItem value="code">Party Code</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">A-Z</SelectItem>
                  <SelectItem value="desc">Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Download Button - improved look */}
            <Button onClick={handleDownloadClick} size="sm" className="h-8 px-2 text-xs flex items-center gap-2" variant="secondary" disabled={isDownloading}>
              <Download className="h-4 w-4" />
              {isDownloading ? 'Preparing...' : 'Download'}
            </Button>
            <Button onClick={handleAddNew} size="sm" className="h-8 px-2 text-xs">
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
                  <TableHead>Regional Code</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || isLoadingAll) && paginatedParties?.length === 0 ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : paginatedParties?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No parties found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedParties.map((party, index) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        {pagination.page * pagination.limit + index + 1}
                      </TableCell>
                      <TableCell>{party.code}</TableCell>
                      <TableCell>{party.regionalCode || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={party.customerName || '-'}>
                        {party.customerName || '-'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          if (!party.phoneNumber || party.phoneNumber.length === 0) {
                            return '-';
                          }
                          if (Array.isArray(party.phoneNumber)) {
                            if (party.phoneNumber.length === 1) {
                              return party.phoneNumber[0];
                            } else {
                              return (
                                <div className="flex flex-col">
                                  <span>{party.phoneNumber[0]},</span>
                                  <span className="text-sm text-muted-foreground">+{party.phoneNumber.length - 1} more</span>
                                </div>
                              );
                            }
                          }
                          // Fallback for old string format
                          return party.phoneNumber;
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={party.city || '-'}>
                        {party.city || '-'}
                      </TableCell>
                      <TableCell>
                        {party.updatedAt ? format(new Date(party.updatedAt), 'd MMM yyyy') : 
                         party.createdAt ? format(new Date(party.createdAt), 'd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="grid grid-cols-2 grid-rows-2 gap-2 justify-center items-center"
                          style={{ minWidth: 80, minHeight: 80 }}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => handleViewPastDeliveries(party.code)}
                            title="View Past Deliveries"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => handleCallClick(party)}
                            title="Call"
                            disabled={!party.phoneNumber || party.phoneNumber.length === 0}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => handleEdit(party)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9"
                            onClick={() => handleDeleteClick(party.id!)}
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

          {/* Updated Pagination Controls */}
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
                    onClick={() => pagination.page < totalPagesForSorting - 1 && setPage(pagination.page + 1)}
                    className={pagination.page >= totalPagesForSorting - 1 ? 'pointer-events-none opacity-50' : ''}
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

      <PartyDialog />
      <PastDeliveriesDialog />

      {/* Call Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={handleCloseCallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Number to Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPartyForCall && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedPartyForCall.customerName || selectedPartyForCall.code}
                </p>
                <div className="space-y-2">
                  {selectedPartyForCall.phoneNumber.map((phoneNumber: string, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleCallNumber(phoneNumber)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {phoneNumber}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Filter Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download Parties</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium">City</label>
              <Select value={downloadCity} onValueChange={setDownloadCity}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {allCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Regional Code</label>
              <Select value={downloadRegion} onValueChange={setDownloadRegion}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select Regional Code" />
                </SelectTrigger>
                <SelectContent>
                  {allRegions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Sort By</label>
              <Select value={downloadSort} onValueChange={setDownloadSort}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partyCodeAsc">Party Code (A-Z)</SelectItem>
                  <SelectItem value="partyCodeDesc">Party Code (Z-A)</SelectItem>
                  <SelectItem value="regionalCodeAsc">Regional Code (A-Z)</SelectItem>
                  <SelectItem value="regionalCodeDesc">Regional Code (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">File Format</label>
              <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleDownloadFiltered} className="mt-4 w-full flex items-center gap-2" variant="default">
              <Download className="h-4 w-4" />
              Download {downloadFormat.toUpperCase()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the party
              and remove all associated data.
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