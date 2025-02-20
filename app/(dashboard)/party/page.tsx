"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import { usePartyStore } from "@/store/usePartyStore"
import { PartyDialog } from "./party-dialog"

export default function PartyPage() {
  const { parties, fetchParties, deleteParty, setSelectedParty } = usePartyStore()

  useEffect(() => {
    fetchParties()
  }, [fetchParties])

  const handleEdit = (party: any) => {
    setSelectedParty(party)
  }

  const handleDelete = async (id: string) => {
    await deleteParty(id)
    await fetchParties()
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Party List</h1>
        <Button onClick={() => setSelectedParty(null)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Party
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parties.map((party) => (
            <TableRow key={party.id}>
              <TableCell>{party.code}</TableCell>
              <TableCell>{party.customerName}</TableCell>
              <TableCell>{party.city}</TableCell>
              <TableCell>
                {party.createdAt && new Date(party.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
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
          ))}
        </TableBody>
      </Table>

      <PartyDialog />
    </div>
  )
}