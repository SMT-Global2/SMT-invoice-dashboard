"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePartyStore , PartyCode, PartyCodeSchema } from "@/store/usePartyStore"

export function PartyDialog() {
  const { selectedParty, setSelectedParty, createParty, updateParty } = usePartyStore()

  const form = useForm<PartyCode>({
    resolver: zodResolver(PartyCodeSchema),
    defaultValues: {
      code: "",
      customerName: "",
      city: "",
    },
  })

  useEffect(() => {
    if (selectedParty) {
      form.reset(selectedParty)
    } else {
      form.reset({
        code: "",
        customerName: "",
        city: "",
      })
    }
  }, [selectedParty, form])

  const onSubmit = async (data: PartyCode) => {
    try {
      if (selectedParty?.id) {
        await updateParty(selectedParty.id, data)
      } else {
        await createParty(data)
      }
      setSelectedParty(null)
      form.reset()
    } catch (error) {
      console.error("Failed to save party:", error)
    }
  }

  return (
    <Dialog open={selectedParty !== undefined} onOpenChange={() => setSelectedParty(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedParty?.id ? "Edit Party" : "Add Party"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setSelectedParty(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
