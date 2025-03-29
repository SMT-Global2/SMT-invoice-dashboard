"use client";

import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { ShowImage } from '@/components/show-image';
import { PartyCodeSelector } from '@/components/party-code-selector';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { ExpiryData } from '@/store/useExpiryStore';
import { compressImage, convertImage, uploadFileToS3 } from '@/lib/helper';

// Define the form schema with Zod
const expiryFormSchema = z.object({
  partyCode: z.string().min(1, "Party code is required"),
  medicalName: z.string().optional(),
  city: z.string().optional(),
  voucherNumber: z.string().min(1, "Voucher number is required"),
  expiryDate: z.date(),
  billImages: z.array(z.string()).min(1, "At least one bill image is required"),
  goodsImages: z.array(z.string()).min(1, "At least one goods image is required"),
});

// Create a type from the schema
type ExpiryFormValues = z.infer<typeof expiryFormSchema>;

interface ExpiryDialogProps {
  isOpen: boolean;
  dialogType: 'create' | 'edit';
  expiryItem?: ExpiryData;
  onClose: () => void;
  onSave: (id: string, data: Partial<ExpiryData>) => Promise<void>;
}

export function ExpiryDialog({
  isOpen,
  dialogType,
  expiryItem,
  onClose,
  onSave
}: ExpiryDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<ExpiryFormValues>({
    resolver: zodResolver(expiryFormSchema),
    defaultValues: {
      partyCode: expiryItem?.partyCode || '',
      medicalName: expiryItem?.party?.customerName || '',
      city: expiryItem?.party?.city || '',
      voucherNumber: expiryItem?.voucherNumber || '',
      expiryDate: expiryItem?.expiryDate ? new Date(expiryItem?.expiryDate) : new Date(),
      billImages: expiryItem?.image.filter(img => img.includes('bill_')) || [],
      goodsImages: expiryItem?.image.filter(img => img.includes('goods_')) || []
    },
    mode: "onBlur",
  });
  
  // Handle party code selection
  const handlePartyCodeChange = (party: any) => {
    form.setValue("partyCode", party.code, { shouldValidate: true });
    form.setValue("medicalName", party.customerName || '');
    form.setValue("city", party.city || '');
  };
  
  // Handle image upload
  const handleImageUpload = (type: 'bill' | 'goods') => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if(!expiryItem?.voucherNumber) {
        toast({
          title: 'Error',
          description: 'Please enter voucher number first',
          variant: 'destructive'
        });
      }
      const file = event.target.files?.[0];
      if (!file) return;
  
      setUploadingImage(type);
  
      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const prefixKeyId = `expiry/voucher_number#${expiryItem?.voucherNumber}#${type}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      const uploadedImage = await uploadFileToS3(compressedFile, prefixKeyId);
  
      if (type === 'bill') {
        const currentImages = form.getValues("billImages");
        form.setValue("billImages", [...currentImages, uploadedImage.key], { shouldValidate: true });
      } else {
        const currentImages = form.getValues("goodsImages");
        form.setValue("goodsImages", [...currentImages, uploadedImage.key], { shouldValidate: true });
      }
  
      toast({
        title: 'Success',
        description: `${type === 'bill' ? 'Bill' : 'Goods'} image uploaded successfully`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
      });
    } finally {
      setUploadingImage(null);
    }
  };
  
  // Form submission
  const onSubmit = async (values: ExpiryFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Combine both image arrays for backend submission
      const allImages = [...values.billImages, ...values.goodsImages];

      // Prepare data for submission
      const data = {
        partyCode: values.partyCode,
        voucherNumber: values.voucherNumber,
        image: allImages,
        expiryDate: values.expiryDate,
        generatedDate: expiryItem?.generatedDate ? new Date(expiryItem?.generatedDate) : new Date()
      };

      console.log(data)
      // Call the appropriate API based on dialog type
      if (dialogType === 'edit' && expiryItem) {
        await onSave(expiryItem.id, data);
        toast({
          title: 'Success',
          description: 'Expiry item updated successfully',
          variant: 'default'
        });
      } else {
        await onSave('create', data);
        toast({
          title: 'Success',
          description: 'Expiry item created successfully',
          variant: 'default'
        });
      }
      
      // Close the dialog
      resetForm();
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
  
  // Reset form
  const resetForm = () => {
    form.reset({
      partyCode: '',
      medicalName: '',
      city: '',
      voucherNumber: '',
      expiryDate: new Date(),
      billImages: [],
      goodsImages: []
    });
  };
  
  // Split images into bill and goods when editing
  const splitImages = (images: string[] = []) => {
    const billImages: string[] = [];
    const goodsImages: string[] = [];
    
    images.forEach(image => {
      if (image.includes('bill_')) {
        billImages.push(image);
      } else if (image.includes('goods_')) {
        goodsImages.push(image);
      } else {
        // For legacy images or if the naming pattern is different,
        // we assign to billImages by default
        billImages.push(image);
      }
    });
    
    return { billImages, goodsImages };
  };
  
  // Initialize form when expiryItem changes
  useEffect(() => {
    if (isOpen && expiryItem && dialogType === 'edit') {
      const { billImages, goodsImages } = splitImages(expiryItem.image);
      
      form.reset({
        partyCode: expiryItem.partyCode,
        medicalName: expiryItem.party?.customerName || '',
        city: expiryItem.party?.city || '',
        voucherNumber: expiryItem.voucherNumber,
        expiryDate: expiryItem.expiryDate ? new Date(expiryItem.expiryDate) : new Date(),
        billImages,
        goodsImages
      });
    } else if (isOpen && dialogType === 'create') {
      resetForm();
    }
  }, [isOpen, expiryItem, dialogType, form]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {dialogType === 'edit' ? 'Edit Expiry Item' : 'Add New Expiry Item'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            
            <FormField
              control={form.control}
              name="medicalName"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Medical Name</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Medical name"
                        readOnly
                        className="w-full bg-muted"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">City</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="City"
                        readOnly
                        className="w-full bg-muted"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="voucherNumber"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Voucher No.</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter voucher number"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Expiry Date</FormLabel>
                  <div className="col-span-3">
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => date && field.onChange(date)}
                        initialFocus={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            {/* Bill Images */}
            <FormField
              control={form.control}
              name="billImages"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Bill Images</FormLabel>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="gap-2 z-10"
                          disabled={!!uploadingImage}
                          type="button"
                        >
                          {uploadingImage === 'bill' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Upload Bill Image'
                          )}
                        </Button>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload('bill')}
                          className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                          disabled={!!uploadingImage}
                        />
                      </div>
                    </div>
                    
                    {field.value.length > 0 && (
                      <div className="mt-2">
                        <ShowImage images={field.value} />
                      </div>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            
            {/* Goods Images */}
            <FormField
              control={form.control}
              name="goodsImages"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Goods Images</FormLabel>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="gap-2 z-10"
                          disabled={!!uploadingImage}
                          type="button"
                        >
                          {uploadingImage === 'goods' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Upload Goods Image'
                          )}
                        </Button>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload('goods')}
                          className="absolute inset-0 opacity-0 w-full cursor-pointer z-0"
                          disabled={!!uploadingImage}
                        />
                      </div>
                    </div>
                    
                    {field.value.length > 0 && (
                      <div className="mt-2">
                        <ShowImage images={field.value} />
                      </div>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          
            <DialogFooter>
              <Button variant="outline" onClick={onClose} type="button">
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
