'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AgencyCodeSelector } from '@/components/agency-code-selector';
import { AgencyCode } from '@/components/agency-code-selector';
import { InventoryData } from '@/store/useInventoryStore';
import { DatePicker } from '@/components/ui/date-picker';

const formSchema = z.object({
  generatedDate: z.date({ required_error: 'Generated date is required' }),
  agencyCode: z.string({ required_error: 'Agency code is required' }),
  invoiceNumber: z.coerce.number({ required_error: 'Invoice number is required' }),
  invoiceDate: z.date({ required_error: 'Invoice date is required' }),
  orderNumber: z.coerce.number({ required_error: 'Order number is required' }),
  orderDate: z.date({ required_error: 'Order date is required' }),
});

interface InventoryDialogProps {
  isOpen: boolean;
  dialogType: 'create' | 'edit';
  inventoryItem?: InventoryData;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

export function InventoryDialog({
  isOpen,
  dialogType,
  inventoryItem,
  onClose,
  onSave,
}: InventoryDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<AgencyCode | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      generatedDate: new Date(),
      agencyCode: '',
      invoiceNumber: 0,
      invoiceDate: new Date(),
      orderNumber: 0,
      orderDate: new Date(),
    },
  });

  // Reset form when dialog opens or when editing different inventory
  useEffect(() => {
    if (isOpen) {
      if (dialogType === 'edit' && inventoryItem) {
        form.reset({
          generatedDate: new Date(inventoryItem.generatedDate),
          agencyCode: inventoryItem.agencyCode,
          invoiceNumber: inventoryItem.invoiceNumber,
          invoiceDate: new Date(inventoryItem.invoiceDate),
          orderNumber: inventoryItem.orderNumber,
          orderDate: new Date(inventoryItem.orderDate),
        });

        if (inventoryItem.agency) {
          setSelectedAgency({
            id: inventoryItem.agency.id,
            code: inventoryItem.agency.code,
            companyName: inventoryItem.agency.companyName,
            shortName: inventoryItem.agency.shortName,
          });
        }
      } else {
        form.reset({
          generatedDate: new Date(),
          agencyCode: '',
          invoiceNumber: 0,
          invoiceDate: new Date(),
          orderNumber: 0,
          orderDate: new Date(),
        });
        setSelectedAgency(null);
      }
    }
  }, [isOpen, dialogType, inventoryItem, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      const id = dialogType === 'create' ? 'create' : (inventoryItem?.id || '');
      
      await onSave(id, data);
      
      toast({
        title: 'Success',
        description: `Inventory ${dialogType === 'create' ? 'created' : 'updated'} successfully`,
        variant: 'default',
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving inventory:', error);
      
      toast({
        title: 'Error',
        description: `Failed to ${dialogType === 'create' ? 'create' : 'update'} inventory`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgencyChange = (agency: AgencyCode) => {
    setSelectedAgency(agency);
    form.setValue('agencyCode', agency.code);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {dialogType === 'create' ? 'Add New Inventory' : 'Edit Inventory'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="generatedDate"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Generated Date</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => date && field.onChange(date)}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="agencyCode"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Agency Code</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <AgencyCodeSelector
                        value={field.value}
                        onChange={handleAgencyChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Invoice Number</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Invoice Date</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => date && field.onChange(date)}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Order Number</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="orderDate"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Order Date</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => date && field.onChange(date)}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {dialogType === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>{dialogType === 'create' ? 'Create' : 'Update'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 