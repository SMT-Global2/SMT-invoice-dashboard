'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const formSchema = z.object({
  medicalName: z.string().min(1, 'Medical name is required'),
  city: z.string().min(1, 'City is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  issueType: z.string().min(1, 'Issue type is required'),
  comments: z.string().optional(),
  isUrgent: z.boolean().default(false),
});

const issueTypes = [
  'Missing Product',
  'Incorrect Quantity',
  'Billing Problem',
  'Service Problem',
  'More Order',
  'Request Callback',
  'Others'
];

export default function ContactFormPage() {
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicalName: '',
      city: '',
      invoiceNumber: '',
      issueType: '',
      comments: '',
      isUrgent: false,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...urls]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('medicalName', data.medicalName);
      formData.append('city', data.city || '');
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('issueType', data.issueType);
      formData.append('comments', data.comments || '');
      formData.append('isUrgent', String(data.isUrgent));
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/contact-form', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      toast.success('Issue submitted successfully! We will get back to you soon.');
      form.reset();
      setImages([]);
      setPreviewUrls([]);
    } catch (error) {
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navbar */}
        <nav className="mb-8">
          <div className="flex flex-col items-center justify-center">
            <a 
              href="https://www.sanjivanmedicotraders.in/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col sm:flex-row items-center gap-4 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/SMT.png"
                alt="Sanjivan Medico Traders Logo"
                width={70}
                height={70}
                className="object-contain"
                style={{ borderRadius: '100%' }}
              />
              <h1 className="text-2xl font-bold text-center">Sanjivan Medico Traders</h1>
            </a>
          </div>
        </nav>

        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            We value your feedback and are here to help
          </p>
        </div>

        {/* Form Card with Logo Background */}
        <div className="relative">
          {/* Background Logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="relative w-[80%] max-w-md aspect-square opacity[80.066] rounded-full overflow-hidden">
              <Image
                src="/SMT.png"
                alt="Sanjivan Medico Traders Logo Background"
                fill
                priority
                className="object-contain rounded-full"
              />
            </div>
          </div>
          
          {/* Form Card */}
          <Card className="shadow-lg relative z-10 bg-card">
            <CardContent className="pt-6">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="medicalName" className="text-base">Medical Name *</Label>
                    <Input
                      id="medicalName"
                      {...form.register('medicalName')}
                      placeholder="Enter medical name"
                      className="h-11 bg-input border border-border"
                    />
                    {form.formState.errors.medicalName && (
                      <p className="text-sm text-red-500">{form.formState.errors.medicalName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-base">City *</Label>
                    <Input
                      id="city"
                      {...form.register('city')}
                      placeholder="Enter city"
                      className="h-11 bg-input border border-border"
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber" className="text-base">Invoice Number *</Label>
                    <Input
                      id="invoiceNumber"
                      {...form.register('invoiceNumber')}
                      placeholder="Enter invoice number"
                      className="h-11 bg-input border border-border"
                    />
                    {form.formState.errors.invoiceNumber && (
                      <p className="text-sm text-red-500">{form.formState.errors.invoiceNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueType" className="text-base">Issue Type *</Label>
                    <Select
                      value={form.watch('issueType')}
                      onValueChange={(value) => form.setValue('issueType', value)}
                    >
                      <SelectTrigger className="h-11 bg-input border border-border">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.issueType && (
                      <p className="text-sm text-red-500">{form.formState.errors.issueType.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments" className="text-base">Additional Comments</Label>
                  <Textarea
                    id="comments"
                    {...form.register('comments')}
                    placeholder="Please provide any additional details about your issue or feedback"
                    className="min-h-[120px] resize-none bg-input border border-border"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base">Upload Images (Optional)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <Input
                        id="images"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="relative aspect-square">
                            <Image
                              src={url}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isUrgent"
                    checked={form.watch('isUrgent')}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    onCheckedChange={(checked) => form.setValue('isUrgent', checked)}
                  />
                  <Label htmlFor="isUrgent" className="text-base font-medium">Mark as Urgent</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Issue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info Footer */}
        <div className="w-full mx-auto border-t border-border pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Address */}
            <div className="text-sm text-muted-foreground">
              <h3 className="font-semibold text-base mb-3">Our Address</h3>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-left">
                  Medicine Complex, Opposite to Anuja Hotel,<br />
                  Ekori Ward, Chandrapur, Maharashtra,<br />
                  India - 442402
                </span>
              </div>
            </div>

            {/* Right Column - Contact Details */}
            <div className="text-sm text-muted-foreground">
              <div className="md:pl-8">
                <h3 className="font-semibold text-base mb-3">Contact Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>+91 94221 37362</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="text-foreground">info@sanjivanmedico.in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    <a href="https://www.sanjivanmedicotraders.in/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      www.sanjivanmedicotraders.in
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Copyright Footer */}
          <div className="border-t border-border mt-6 pt-4 text-xs text-muted-foreground">
            <div className="flex flex-col sm:flex-row sm:justify-between text-center sm:text-left">
              <p>© {new Date().getFullYear()} | Sanjivan Medico Traders | All rights reserved.</p>
              <p className="mt-1 sm:mt-0">Designed, Developed, and maintained by Noobacker</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 