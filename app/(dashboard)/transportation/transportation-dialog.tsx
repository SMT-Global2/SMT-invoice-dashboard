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
import { 
  useTransportationStore, 
  Transportation, 
  TransportationSchema 
} from "@/store/useTransportationStore"
import { Textarea } from "@/components/ui/textarea"

export function TransportationDialog() {
  const { 
    selectedTransportation, 
    setSelectedTransportation, 
    createTransportation, 
    updateTransportation 
  } = useTransportationStore()
  
  const open = selectedTransportation !== undefined && selectedTransportation !== null

  const form = useForm<Transportation>({
    resolver: zodResolver(TransportationSchema),
    defaultValues: {
      companyName: "",
      contactPersonName: "",
      contactNumber: "",
      email: "",
      city: "",
      remarks: "",
    },
  })

  useEffect(() => {
    if (selectedTransportation) {
      form.reset({
        companyName: selectedTransportation.companyName || "",
        contactPersonName: selectedTransportation.contactPersonName || "",
        contactNumber: selectedTransportation.contactNumber || "",
        email: selectedTransportation.email || "",
        city: selectedTransportation.city || "",
        remarks: selectedTransportation.remarks || "",
      })
    } else {
      form.reset({
        companyName: "",
        contactPersonName: "",
        contactNumber: "",
        email: "",
        city: "",
        remarks: "",
      })
    }
  }, [selectedTransportation, form])

  const onSubmit = async (data: Transportation) => {
    try {
      if (selectedTransportation?.id) {
        await updateTransportation(selectedTransportation.id, data)
      } else {
        await createTransportation(data)
      }
      setSelectedTransportation(null)
      form.reset()
    } catch (error) {
      console.error("Failed to save transportation:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => setSelectedTransportation(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] 2xl:w-[65vw] p-4 sm:p-6 gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">
            {selectedTransportation?.id ? "Edit Transportation" : "Add Transportation"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Company Name</FormLabel>
                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contactPersonName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Contact Person Name</FormLabel>
                    <FormControl>
                      <Input 
                        className="bg-background" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Contact Number</FormLabel>
                    <FormControl>
                      <Input 
                        className="bg-background" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Email</FormLabel>
                    <FormControl>
                      <Input 
                        className="bg-background" 
                        type="email"
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">City</FormLabel>
                    <FormControl>
                      <Input 
                        className="bg-background" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="bg-background resize-none" 
                      {...field} 
                      value={field.value || ''} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedTransportation(null)}
                className="bg-background h-8 text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" className="h-8 text-sm">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 