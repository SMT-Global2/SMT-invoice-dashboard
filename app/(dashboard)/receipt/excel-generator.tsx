import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { DownloadIcon, Loader, FileSpreadsheet } from 'lucide-react';
import moment from 'moment';
import { User } from '@/components/multi-user-selector';

interface ExcelGeneratorProps {
  date: Date;
  userFilter?: string[] | null;
  paymentMethodFilter?: string | null;
}

const ExcelGenerator: React.FC<ExcelGeneratorProps> = ({ date, userFilter, paymentMethodFilter }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateExcel = async () => {
    try {
      setIsGenerating(true);
      const formattedDate = moment(date).format('YYYY-MM-DD');
      
      // Build URL with query parameters
      const url = new URL('/api/receipt/download-excel', window.location.origin);
      
      // Add date parameter
      url.searchParams.set('date', formattedDate);
      
      // Add payment method filter if provided
      if (paymentMethodFilter && paymentMethodFilter !== 'ALL') {
        url.searchParams.set('paymentMethod', paymentMethodFilter);
      }
      
      // Add user filter if provided (join multiple usernames with commas)
      if (userFilter && userFilter.length > 0) {
        url.searchParams.set('users', userFilter.join(','));
      }
      
      // Initiate download by creating a temporary link and clicking it
      const response = await fetch(url);
      
      if (!response.ok) {
        // Try to parse error details from JSON response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to generate Excel file');
        } catch (jsonError) {
          throw new Error(`Failed to generate Excel file: ${response.statusText}`);
        }
      }
      
      // Get blob from response
      const blob = await response.blob();
      
      // Create object URL for the blob
      const objectUrl = URL.createObjectURL(blob);
      
      // Create and click download link
      const link = document.createElement('a');
      link.href = objectUrl;
      
      // Determine filename based on filters
      const paymentMethodText = paymentMethodFilter 
        ? paymentMethodFilter === 'ALL' ? 'all' : paymentMethodFilter.toLowerCase()
        : 'all';
        
      const userText = userFilter && userFilter.length > 0
        ? userFilter.join('-') 
        : 'all';
        
      link.download = `receipts_${formattedDate}_${paymentMethodText}_${userText}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Excel file generated successfully',
      });
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate Excel file',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Button 
      onClick={handleGenerateExcel} 
      disabled={isGenerating}
      className="flex items-center gap-2"
      size="sm"
      variant="outline"
    >
      {isGenerating ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      {isGenerating ? 'Generating Excel...' : 'Download Excel'}
    </Button>
  );
};

export default ExcelGenerator; 