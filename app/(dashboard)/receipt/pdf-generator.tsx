import React, { useState } from 'react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import ReceiptPDF from 'app/(dashboard)/receipt/receipt-pdf';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { DownloadIcon, Loader } from 'lucide-react';
import moment from 'moment';
import { ReceiptData } from '@/store/useReceiptStore';

interface PDFGeneratorProps {
  date: Date;
  userFilter ?: string | null;
  paymentMethodFilter ?: string | null;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ date, userFilter, paymentMethodFilter }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptData[] | null>(null);
  
  const fetchReceiptData = async () => {
    try {
      setIsGenerating(true);
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const url = new URL('/api/receipt/downloadpdf', window.location.origin);
      if(userFilter) url.searchParams.set('user', userFilter);
      if(paymentMethodFilter && paymentMethodFilter !== 'ALL') url.searchParams.set('paymentMethod', paymentMethodFilter);
      if(date) url.searchParams.set('date', formattedDate);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch receipts');
      }
      
      const data = await response.json();
      setReceipts(data.data);
      return data; // Return the full response including statementImages
    } catch (error) {
      console.error('Error fetching receipt data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch receipt data',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleGeneratePDF = async () => {
    const data = await fetchReceiptData();
    
    if (!data || data.length === 0) {
      return;
    }
    
    try {
      const blob = await pdf(
        <ReceiptPDF
          receipts={data.data}
          date={moment(date).format('YYYY-MM-DD')}
          statementImages={data.statementImages || []}
          dailyDenominations={data.dailyDenominations || []}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipts-${moment(date).format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Button 
      onClick={handleGeneratePDF} 
      disabled={isGenerating}
      className="flex items-center gap-2"
      size="sm"
    >
      {isGenerating ? (
        <Loader className="h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="h-4 w-4" />
      )}
      {isGenerating ? 'Generating PDF...' : 'Download PDF'}
    </Button>
  );
};

export default PDFGenerator; 