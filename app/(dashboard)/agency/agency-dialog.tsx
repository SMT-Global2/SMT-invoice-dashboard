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
import { useAgencyStore, AgencyCode, AgencyCodeSchema } from "@/store/useAgencyStore"

export function AgencyDialog() {
  const { selectedAgency, setSelectedAgency, createAgency, updateAgency } = useAgencyStore()
  
  const open = selectedAgency !== undefined && selectedAgency !== null

  const form = useForm<AgencyCode>({
    resolver: zodResolver(AgencyCodeSchema),
    defaultValues: {
      code: "",
      companyName: "",
      shortName: "",
    },
  })

  useEffect(() => {
    if (selectedAgency) {
      form.reset({
        code: selectedAgency.code || "",
        companyName: selectedAgency.companyName || "",
        shortName: selectedAgency.shortName || "",
      })
    } else {
      form.reset({
        code: "",
        companyName: "",
        shortName: "",
      })
    }
  }, [selectedAgency, form])

  const onSubmit = async (data: AgencyCode) => {
    try {
      if (selectedAgency?.id) {
        await updateAgency(selectedAgency.id, data)
      } else {
        await createAgency(data)
      }
      setSelectedAgency(null)
      form.reset()
    } catch (error) {
      console.error("Failed to save agency:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => setSelectedAgency(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] 2xl:w-[65vw] p-4 sm:p-6 gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">
            {selectedAgency?.id ? "Edit Agency" : "Add Agency"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Agency Code</FormLabel>
                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Company Name</FormLabel>
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
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Short Name</FormLabel>
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
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedAgency(null)}
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