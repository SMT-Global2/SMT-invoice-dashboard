"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { usePartyStore } from "@/store/usePartyStore"
import { ExternalLink } from "lucide-react"
import TableSkeleton from "@/components/table-skeleton"

export function PastDeliveriesDialog() {
  const { 
    pastDeliveries, 
    isPastDeliveriesLoading, 
    selectedPartyForDeliveries, 
    setSelectedPartyForDeliveries,
    parties
  } = usePartyStore()

  const [open, setOpen] = useState(false)
  const [partyName, setPartyName] = useState("")
  const [partyCode, setPartyCode] = useState("")

  useEffect(() => {
    if (selectedPartyForDeliveries) {
      setOpen(true)
      const party = parties.find(p => p.code === selectedPartyForDeliveries)
      setPartyName(party?.customerName || selectedPartyForDeliveries)
      setPartyCode(party?.code || selectedPartyForDeliveries)
    }
  }, [selectedPartyForDeliveries, parties])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedPartyForDeliveries(null)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Past Deliveries - {partyName} ({partyCode})</DialogTitle>
          <DialogDescription>
            View all past delivered invoices for this party
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto w-full border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead>Delivered Date</TableHead>
                <TableHead className="text-right">Delivery Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPastDeliveriesLoading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : pastDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No past deliveries found
                  </TableCell>
                </TableRow>
              ) : (
                pastDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{delivery.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(delivery.generatedDate)}</TableCell>
                    <TableCell>{formatDate(delivery.deliveredTimestamp)}</TableCell>
                    <TableCell className="text-right">
                      {delivery.deliveredLocationLink ? (
                        <a 
                          href={`https://www.google.com/maps?q=${delivery.deliveredLocationLink!.replace(',', '+')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          View Location <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 