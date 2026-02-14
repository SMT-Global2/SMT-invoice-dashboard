"use client"

import { useEffect, useState } from "react"
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
import { usePartyStore, PartyCode, PartyCodeSchema } from "@/store/usePartyStore"

export function PartyDialog() {
  const { selectedParty, setSelectedParty, createParty, updateParty } = usePartyStore()
  
  const open = selectedParty !== undefined && selectedParty !== null

  // Support multiple phone numbers
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""])

  const form = useForm<PartyCode>({
    resolver: zodResolver(PartyCodeSchema),
    defaultValues: {
      code: "",
      customerName: "",
      city: "",
      regionalCode: "",
      phoneNumber: [],
    },
  })

  useEffect(() => {
    if (selectedParty) {
      // Ensure phoneNumber is always an array with at least one element
      let phoneNumbersArray: string[]
      if (Array.isArray(selectedParty.phoneNumber)) {
        phoneNumbersArray = selectedParty.phoneNumber.length > 0 ? selectedParty.phoneNumber : [""]
      } else if (selectedParty.phoneNumber) {
        phoneNumbersArray = [selectedParty.phoneNumber]
      } else {
        phoneNumbersArray = [""]
      }
      
      form.reset({
        code: selectedParty.code || "",
        customerName: selectedParty.customerName || "",
        city: selectedParty.city || "",
        regionalCode: selectedParty.regionalCode || "",
        phoneNumber: phoneNumbersArray,
      })
      setPhoneNumbers(phoneNumbersArray)
    } else {
      form.reset({
        code: "",
        customerName: "",
        city: "",
        regionalCode: "",
        phoneNumber: [""]
      })
      setPhoneNumbers([""])
    }
  }, [selectedParty, form])

  const handlePhoneChange = (idx: number, value: string) => {
    const updated = [...phoneNumbers]
    updated[idx] = value
    setPhoneNumbers(updated)
    form.setValue("phoneNumber", updated)
  }

  const handleAddPhone = () => {
    setPhoneNumbers([...phoneNumbers, ""])
  }

  const handleRemovePhone = (idx: number) => {
    const updated = phoneNumbers.filter((_, i) => i !== idx)
    setPhoneNumbers(updated.length ? updated : [""])
    form.setValue("phoneNumber", updated.length ? updated : [""])
  }

  const onSubmit = async (data: PartyCode) => {
    try {
      data.phoneNumber = phoneNumbers.filter(num => num.trim() !== "")
      // Remove the validation that requires at least one phone number
      
      // Clean city data to prevent display issues
      if (data.city) {
        data.city = data.city.trim()
      }
      
      if (selectedParty?.id) {
        await updateParty(selectedParty.id, data)
      } else {
        await createParty(data)
      }
      setSelectedParty(null)
      form.reset()
      setPhoneNumbers([""])
    } catch (error) {
      console.error("Failed to save party:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => setSelectedParty(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] 2xl:w-[65vw] p-4 sm:p-6 gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">
            {selectedParty?.id ? "Edit Party" : "Add Party"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Party Code</FormLabel>
                  <FormControl>
                    <Input className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Customer Name</FormLabel>
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
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">City</FormLabel>
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
              name="phoneNumber"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm">Phone Numbers</FormLabel>
                  <div className="flex flex-col gap-2">
                    {phoneNumbers.map((num, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          className="bg-background"
                          value={num}
                          type="tel"
                          onChange={e => handlePhoneChange(idx, e.target.value)}
                        />
                        {phoneNumbers.length > 1 && (
                          <Button type="button" variant="destructive" size="icon" onClick={() => handleRemovePhone(idx)}>-</Button>
                        )}
                        {idx === phoneNumbers.length - 1 && (
                          <Button type="button" variant="outline" size="icon" onClick={handleAddPhone}>+</Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="regionalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Regional Code</FormLabel>
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
                onClick={() => setSelectedParty(null)}
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
