"use client";

import { useEffect, useState, useCallback } from 'react';
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { PartyCodeSelector } from '@/components/party-code-selector';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { CurrencyBills, PaymentMethod, ReceiptData } from '@/store/useReceiptStore';
import { formatCurrency } from '@/lib/helper';
import React from 'react';

// Define the currency bills schema
const currencyBillsSchema = z.object({
  '500': z.coerce.number().nonnegative().default(0),
  '200': z.coerce.number().nonnegative().default(0),
  '100': z.coerce.number().nonnegative().default(0),
  '50': z.coerce.number().nonnegative().default(0),
  '20': z.coerce.number().nonnegative().default(0),
  '10': z.coerce.number().nonnegative().default(0),
});

// Define the cheque schema
const chequeSchema = z.object({
  number: z.string().optional(),
  bank: z.string().optional(),
  date: z.date().optional(),
  amount: z.coerce.number().min(0, "Amount must be non-negative").optional(),
});

// Define the form schema with Zod
const receiptFormSchema = z.object({
  partyCode: z.string().min(1, "Party code is required"),
  medicalName: z.string().optional(),
  city: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  remarks: z.string().optional(),
  paymentMethod: z.enum(["NONE", "CASH", "CHEQUE"] as const),
  generatedDate: z.date(),
  currencyBills: currencyBillsSchema.optional().nullable(),
  cheque: chequeSchema.optional().nullable(),
}).refine((data) => {
    return true;
}, {
  message: "Currency bills required for CASH payment or Cheque details required for CHEQUE payment",
  path: ["paymentMethod"],
});

// Create a type from the schema
type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

interface ReceiptDialogProps {
  isOpen: boolean;
  dialogType: 'create' | 'edit';
  receiptItem?: ReceiptData;
  onClose: () => void;
  onSave: (id: string, data: Partial<ReceiptData>) => Promise<void>;
}

// Add these utility hooks at the top level
const useCurrencyCalculator = (currencyBills: CurrencyBills | null | undefined) => {
  return React.useMemo(() => {
    if (!currencyBills) return 0;
    
    const denominationMultipliers = {
      '500': 500,
      '200': 200,
      '100': 100,
      '50': 50,
      '20': 20,
      '10': 10
    };

    return Object.entries(currencyBills).reduce((total, [denomination, count]) => {
      return total + (Number(count) * denominationMultipliers[denomination as keyof CurrencyBills]);
    }, 0);
  }, [currencyBills]);
};

// Update the currency field controller to maintain focus
const createCurrencyFieldController = (
  form: UseFormReturn<ReceiptFormValues>, 
  denomination: keyof CurrencyBills,
  forceUpdate: () => void
) => {
  const value = form.watch(`currencyBills.${denomination}`);
  
  return {
    value,
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        // Get target input element for later focus management
        const inputElement = e.target;
        
        // Get the new value
        const newValue = Math.max(0, parseInt(e.target.value) || 0);
        
        // Get current bills and ensure all values are numbers
        const currentBills = { 
          ...(form.getValues('currencyBills') || {}),
          '500': form.getValues('currencyBills.500') || 0,
          '200': form.getValues('currencyBills.200') || 0,
          '100': form.getValues('currencyBills.100') || 0,
          '50': form.getValues('currencyBills.50') || 0,
          '20': form.getValues('currencyBills.20') || 0,
          '10': form.getValues('currencyBills.10') || 0,
        };
        
        // Update field without triggering re-render
        form.setValue(`currencyBills.${denomination}`, newValue, { 
          shouldValidate: false, 
          shouldDirty: true 
        });
        
        // Schedule an update for the main object for validation
        setTimeout(() => {
          // Update the whole object for cross-field validation
          form.setValue('currencyBills', {
            ...currentBills,
            [denomination]: newValue
          }, {
            shouldValidate: true
          });
          
          // Force an update without affecting inputs
          forceUpdate();
        }, 0);
      } catch (error) {
        console.error('Error updating currency value:', error);
      }
    }
  };
};

export function ReceiptDialog({
  isOpen,
  dialogType,
  receiptItem,
  onClose,
  onSave
}: ReceiptDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  
  // Force update function
  const forceUpdate = useCallback(() => {
    setForceRender(prev => prev + 1);
  }, []);

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      partyCode: receiptItem?.partyCode || '',
      medicalName: receiptItem?.party?.customerName || '',
      city: receiptItem?.party?.city || '',
      amount: receiptItem?.amount || 0,
      remarks: receiptItem?.remarks || '',
      paymentMethod: receiptItem?.paymentMethod || 'NONE',
      generatedDate: receiptItem?.generatedDate ? new Date(receiptItem?.generatedDate) : new Date(),
      // Set currencyBills and cheque based on payment method
      currencyBills: receiptItem?.paymentMethod === 'CASH' ? (
        receiptItem?.currencyBills || {
          '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0,
        }
      ) : null,
      cheque: receiptItem?.paymentMethod === 'CHEQUE' ? (
        receiptItem?.cheque ? {
          ...receiptItem.cheque,
          date: new Date(receiptItem.cheque.date)
        } : {
          number: '',
          bank: '',
          date: new Date(),
          amount: receiptItem?.amount || 0
        }
      ) : null
    },
    mode: "onChange",
  });
  
  // Get the payment method watch to conditionally render fields
  const paymentMethod = form.watch('paymentMethod');
  const currencyBills = form.watch('currencyBills');
  
  // Calculate total amount from currency bills
  const calculatedTotal = useCurrencyCalculator(currencyBills);
  
  // Pre-calculate all currency field controllers with forceUpdate
  const currencyControllers = React.useMemo(() => {
    const denominations = ['500', '200', '100', '50', '20', '10'] as const;
    return denominations.map(denomination => ({
      denomination,
      ...createCurrencyFieldController(form, denomination, forceUpdate)
    }));
  }, [form, forceUpdate, forceRender]); // Add forceRender to dependencies
  
  // Handle party code selection
  const handlePartyCodeChange = (party: any) => {
    form.setValue("partyCode", party.code, { shouldValidate: true });
    form.setValue("medicalName", party.customerName || '');
    form.setValue("city", party.city || '');
  };
  
  // Form submission
  const onSubmit = async (values: ReceiptFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare data for submission based on payment method
      const data: any = {
        partyCode: values.partyCode,
        amount: values.amount,
        remarks: values.remarks,
        paymentMethod: values.paymentMethod,
        generatedDate: values.generatedDate
      };
      
      if (values.paymentMethod === 'CASH') {
        data.currencyBills = values.currencyBills;
        data.cheque = null;
      } else if (values.paymentMethod === 'CHEQUE') {
        data.cheque = values.cheque;
        data.currencyBills = null;
      } else {
        data.currencyBills = null;
        data.cheque = null;
      }

      // Call the appropriate API based on dialog type
      if (dialogType === 'edit' && receiptItem) {
        await onSave(receiptItem.id, data);
        toast({
          title: 'Success',
          description: 'Receipt updated successfully',
          variant: 'default'
        });
      } else {
        await onSave('create', data);
        toast({
          title: 'Success',
          description: 'Receipt created successfully',
          variant: 'default'
        });
      }
      
      // Explicitly reset form to clear all values
      form.reset({
        partyCode: '',
        medicalName: '',
        city: '',
        amount: 0,
        remarks: '',
        paymentMethod: 'NONE',
        generatedDate: new Date(),
        currencyBills: null,
        cheque: null
      });
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Initialize form when receiptItem changes
  useEffect(() => {
    // When the dialog opens
    if (isOpen) {
      if (receiptItem && dialogType === 'edit') {
        const paymentMethod = receiptItem.paymentMethod;
        
        // Set appropriate values based on payment method
        let currencyBills = null;
        let cheque = null;
        
        if (paymentMethod === 'CASH') {
          // Ensure all currency bill values are properly populated with their default values
          currencyBills = {
            '500': receiptItem.currencyBills?.['500'] || 0,
            '200': receiptItem.currencyBills?.['200'] || 0,
            '100': receiptItem.currencyBills?.['100'] || 0,
            '50': receiptItem.currencyBills?.['50'] || 0,
            '20': receiptItem.currencyBills?.['20'] || 0,
            '10': receiptItem.currencyBills?.['10'] || 0,
          };
          
        } else if (paymentMethod === 'CHEQUE') {
          cheque = receiptItem.cheque ? {
            ...receiptItem.cheque,
            date: new Date(receiptItem.cheque.date)
          } : {
            number: '',
            bank: '',
            date: new Date(),
            amount: receiptItem.amount
          };
        }
        
        form.reset({
          partyCode: receiptItem.partyCode,
          medicalName: receiptItem.party?.customerName || '',
          city: receiptItem.party?.city || '',
          amount: receiptItem.amount,
          remarks: receiptItem.remarks || '',
          paymentMethod,
          generatedDate: receiptItem.generatedDate ? new Date(receiptItem.generatedDate) : new Date(),
          currencyBills,
          cheque
        });

      } else {
        // For create mode, reset to empty form
        form.reset({
          partyCode: '',
          medicalName: '',
          city: '',
          amount: 0,
          remarks: '',
          paymentMethod: 'NONE',
          generatedDate: new Date(),
          currencyBills: null,
          cheque: null
        });
      }
    } else {
      // When dialog closes, reset the form to clear any leftover state
      form.reset({
        partyCode: '',
        medicalName: '',
        city: '',
        amount: 0,
        remarks: '',
        paymentMethod: 'NONE',
        generatedDate: new Date(),
        currencyBills: null,
        cheque: null
      });
    }
  }, [isOpen, receiptItem, dialogType, form]);
  
  // Cleanup when component unmounts
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Reset form when component unmounts to avoid stale state
      form.reset({
        partyCode: '',
        medicalName: '',
        city: '',
        amount: 0,
        remarks: '',
        paymentMethod: 'NONE',
        generatedDate: new Date(),
        currencyBills: null,
        cheque: null
      });
    };
  }, []); // Empty dependency array since this only runs on mount/unmount
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Reset form directly without using resetForm function
        form.reset({
          partyCode: '',
          medicalName: '',
          city: '',
          amount: 0,
          remarks: '',
          paymentMethod: 'NONE',
          generatedDate: new Date(),
          currencyBills: null,
          cheque: null
        });
        onClose();
      }
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[85vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] 2xl:w-[65vw] p-4 sm:p-6 gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {dialogType === 'edit' ? 'Edit Receipt' : 'Add New Receipt'}
          </DialogTitle>
        </DialogHeader>
        
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Party Code */}
              <FormField
                control={form.control}
                name="partyCode"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-2">
                    <FormLabel className="text-right">Party Code</FormLabel>
                    <div className="col-span-3">
                      <PartyCodeSelector
                        value={field.value}
                        onChange={handlePartyCodeChange}
                        placeholder="Enter party code"
                      />
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Read-only Party Info */}
              <div className="grid grid-cols-4 items-center gap-2">
                <div className="text-right text-sm font-medium">Medical Name</div>
                <div className="col-span-3">
                  <Input
                    value={form.watch('medicalName') || ''}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <div className="text-right text-sm font-medium">City</div>
                <div className="col-span-3">
                  <Input
                    value={form.watch('city') || ''}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              {/* Date */}
              <FormField
                control={form.control}
                name="generatedDate"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-2">
                    <FormLabel className="text-right">Date</FormLabel>
                    <div className="col-span-3 relative">
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Amount - Moved above Payment Method */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-2">
                    <FormLabel className="text-right">Amount</FormLabel>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value < 0 ? 0 : value);
                        }}
                      />
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Remarks - Moved above Payment Method */}
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-start gap-2">
                    <FormLabel className="text-right pt-2">Remarks</FormLabel>
                    <div className="col-span-3">
                      <Textarea
                        {...field}
                        placeholder="Enter any remarks (optional)"
                        rows={3}
                      />
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-2">
                    <FormLabel className="text-right">Payment Method</FormLabel>
                    <div className="col-span-3">
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value as PaymentMethod);
                          
                          // Reset the related fields when changing payment method
                          if (value === 'CASH') {
                            form.setValue('currencyBills', {
                              '500': receiptItem?.currencyBills?.['500'] || 0,
                              '200': 0,
                              '100': 0,
                              '50': 0,
                              '20': 0,
                              '10': 0,
                            });
                            // Reset cheque when switching to CASH
                            form.setValue('cheque', null);
                          } else if (value === 'CHEQUE') {
                            form.setValue('cheque', {
                              number: '',
                              bank: '',
                              date: new Date(),
                              amount: 0 // Initialize with 0 instead of current amount
                            });
                            // Reset currencyBills when switching to CHEQUE
                            form.setValue('currencyBills', null);
                          } else if (value === 'NONE') {
                            // Reset both fields when switching to NONE
                            form.setValue('currencyBills', null);
                            form.setValue('cheque', null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Custom styling for number inputs and date picker */}
              <style jsx global>{`
                /* Chrome, Safari, Edge, Opera */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                
                /* Firefox */
                input[type=number] {
                  -moz-appearance: textfield;
                }

                .rdp-months {
                  background-color: white;
                  border-radius: 0.5rem;
                  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }

                /* Ensure popover content is above everything */
                [data-radix-popper-content-wrapper] {
                  z-index: 9999 !important;
                }
              `}</style>
              
              {/* Cash Payment Fields */}
              {paymentMethod === 'CASH' && (
                <div className="border p-4 rounded-md space-y-4 mx-auto max-w-[90%]">
                  <h3 className="text-lg font-semibold">Cash Denominations</h3>
                  <div className="space-y-3">
                    {currencyControllers.map(({ denomination, value, handleChange }) => (
                      <div key={denomination} className="grid grid-cols-4 items-center gap-2">
                        <div className="text-right font-medium">₹{denomination} Notes</div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={value ?? 0}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 py-2 text-right font-semibold text-primary border-t">
                    Calculated Total: {formatCurrency(calculatedTotal)}
                    <div className="text-sm text-muted-foreground mt-1">
                      (This is just a calculation and does not affect the form amount)
                    </div>
                  </div>
                </div>
              )}
              
              {/* Cheque Payment Fields - Updated styling for consistency */}
              {paymentMethod === 'CHEQUE' && (
                <div className="border p-4 rounded-md mx-auto max-w-[90%]">
                  <h3 className="text-lg font-semibold mb-2">Cheque Details</h3>
                  
                  <div className="space-y-4">
                    {/* Cheque Number */}
                    <FormField
                      control={form.control}
                      name="cheque.number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cheque Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter cheque number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Bank Name */}
                    <FormField
                      control={form.control}
                      name="cheque.bank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter bank name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Cheque Date - Fixed UI with margin and z-index */}
                    <FormField
                      control={form.control}
                      name="cheque.date"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Cheque Date</FormLabel>
                          <div className="mt-2">
                            <DatePicker
                              date={field.value}
                              setDate={field.onChange}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Cheque Amount - Now a separate editable input */}
                    <FormField
                      control={form.control}
                      name="cheque.amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cheque Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="Enter amount"
                              {...field}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value < 0 ? 0 : value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
} 