'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadFileToS3 } from '@/lib/helper';

interface LastTwoPaymentUploadProps {
  selectedDate: Date | null;
  onSuccess?: () => void;
}

const LastTwoPaymentUpload: React.FC<LastTwoPaymentUploadProps> = ({ 
  selectedDate,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>(selectedDate || new Date());

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date before uploading last two payment data",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(5); // Start progress

    // Set up progress simulation
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 70) return prev + 5;
        return prev;
      });
    }, 500);

    try {
      // Upload file directly to S3 first
      // setUploadProgress(20);
      // const s3Key = `statement-ltp/${selectedFile.name}#${new Date().toISOString()}`;
      
      // console.log(`Uploading file ${selectedFile.name} to S3 with key: ${s3Key}`);
      // const uploadedFile = await uploadFileToS3(selectedFile, s3Key);
      
      // setUploadProgress(50);
      // console.log("File uploaded to S3:", uploadedFile.key);
      
      // Now send both the file and S3 key to the API for processing
      console.log(`Processing Excel data for payment date ${paymentDate.toISOString()}`);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileKey', selectedFile.name);
      formData.append('fileName', selectedFile.name);
      formData.append('fileType', selectedFile.type);
      formData.append('paymentDate', paymentDate.toISOString());
      
      const response = await fetch('/api/last-two-payment/upload', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(80);
      
      // Get the response data - handle potential parsing errors
      let responseData;
      try {
        responseData = await response.json();
        console.log("API response:", responseData);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        throw new Error("Server returned an invalid response. Please try again.");
      }
      
      // Check for errors in the response
      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.details || 'Failed to process payment file';
        
        // Only log detailed error if we have actual data
        if (responseData && Object.keys(responseData).length > 0) {
          console.error('Upload error details:', {
            status: response.status,
            statusText: response.statusText,
            data: responseData
          });
        } else {
          console.error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("Upload successful:", responseData);
      
      // Complete the progress
      setUploadProgress(100);
      
      // Show success toast with entry count if available
      const entriesCount = responseData?.lastTwoPayment?.entriesCount || 0;
      toast({
        title: "Success",
        description: `Last two payment file uploaded successfully with ${entriesCount} entries`,
        duration: 5000,
      });
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear the selected file
      setSelectedFile(null);
      
      // Call onSuccess callback to refresh data after a delay
      // This gives the database time to process the upload
      if (onSuccess) {
        setTimeout(() => {
          console.log("Calling onSuccess to refresh payment data");
          onSuccess();
        }, 2500);
      }
    } catch (error) {
      console.error('Error uploading payment file:', error);
      
      // Determine the error message to show
      let errorMessage = 'Failed to upload payment file';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      // Clean up
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Upload Last Two Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="date">Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="file">Excel File</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFilesSelected}
                accept=".xlsx,.xls"
                disabled={isUploading}
              />
            </div>
            {selectedFile && (
              <div className="text-sm">
                Selected file: {selectedFile.name}
              </div>
            )}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading and processing last two payment...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LastTwoPaymentUpload; 