'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Save, FileDown, Clock, MapPin, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { TakeImage } from '@/components/take-image';
import { Statement } from '@/lib/statement-service';
import { convertImage } from '@/lib/helper';
import { compressImage } from '@/lib/helper';
import { uploadFileToS3 } from '@/lib/helper';
import { useToast } from '@/components/ui/use-toast';
import { useStatements, PartyActionsProps } from '@/store/useStatement';
import { Report } from '@/lib/statement-service';
import StatementPDF from './StatementPDF';
import { pdf } from '@react-pdf/renderer';

const PartyActions: React.FC<PartyActionsProps> = ({ party, statement }) => {
  const { 
    isPartySaved, 
    hasPartyImage, 
    savedParties,
    savePartyImage,
    isLoading,
    resetParty,
    capturedImages,
    updatePartyImage,
  } = useStatements();

  const { toast } = useToast();

  const [uploadingImage, setUploadingImage] = useState<number | string | null>(null);
  const [lastInteractedPartyCode, setLastInteractedPartyCode] = useState<string | null>(null);

  const handleSaveWithMetadata = (partyCode: string, stmt: Statement): void => {
    const images = capturedImages[partyCode] ? [capturedImages[partyCode]] : [];
    const partyId = stmt.reports.find(report => report.partyCode === partyCode)?.id;
    if(partyId) {
      savePartyImage(partyCode, partyId, images);
    } else {
      toast({
        title: 'Error',
        description: 'Party not found',
        duration: 2000,
      });
    }
  };

  const openGoogleMaps = (coordinates: { lat: number; lng: number } | null | undefined): void => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return format(date, 'dd/MM/yyyy hh:mm a');
    } catch {
      return isoString;
    }
  };

  const handleImageUpload = (partyCode : string) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLastInteractedPartyCode(partyCode);
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(partyCode);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const prefixKeyId = `statement/party_code#${partyCode}#${new Date().toISOString()}.${compressedFile.name.split('.').pop()}`;
      const uploadedImage = await uploadFileToS3(compressedFile, prefixKeyId);

      updatePartyImage(party.partyCode, uploadedImage.key);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
        duration: 2000,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        duration: 2000,
      });
    } finally {
      setUploadingImage(null);
      event.target.value = '';
    }
  };

  const handleDownloadPDF = async (report : Report, statement: Statement) => {
    try {
      // Generate PDF blob using our wrapper function
      const blob = await pdf(<StatementPDF report={report} statement={statement} />).toBlob();
  
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${statement.name}_${report.partyCode}_${report.partyName}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "PDF Generated",
        description: "Statement PDF has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    }
  };
 
  return (
    <>
      {(() => {
        if (isPartySaved(party.partyCode)) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Saved</span>
              </Badge>
              {savedParties[party.partyCode] && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(savedParties[party.partyCode].timestamp)}
                  </Badge>
                  {savedParties[party.partyCode].coordinates && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMaps(savedParties[party.partyCode].coordinates);
                      }}
                      title="View Location"
                    >
                      <MapPin className="h-4 w-4 text-blue-500" />
                    </Button>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetParty?.(party.partyCode);
                }}
                title="Reset"
              >
                <RefreshCcw className="h-4 w-4 text-amber-500" />
              </Button>
            </div>
          );
        }

        return (
          <>
            <TakeImage
              handleImageUpload={handleImageUpload}
              imageKey={party.partyCode}
              isUploading={uploadingImage === party.partyCode}
              isDisabled={isLoading}
              showImages={capturedImages[party.partyCode] ? [capturedImages[party.partyCode]] : []}
              takeType="UPLOAD"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveWithMetadata(party.partyCode, statement);
              }}
              disabled={!hasPartyImage(party.partyCode) || isLoading}
              className={hasPartyImage(party.partyCode) ? "bg-primary/5 border-primary/20 hover:bg-primary/10" : ""}
            >
              <Save className={`h-4 w-4 mr-1 ${hasPartyImage(party.partyCode) ? "text-primary" : ""}`} />
              Save
            </Button>
          </>
        );
      })()}

      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleDownloadPDF(party, statement)}
        disabled={isLoading || !isPartySaved(party.partyCode)}
        className={isPartySaved(party.partyCode) ? "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800" : ""}
      >
        <FileDown className={`h-4 w-4 mr-1 ${isPartySaved(party.partyCode) ? "text-blue-600 dark:text-blue-400" : ""}`} />
        PDF
      </Button>
    </>
  );
};

export default PartyActions; 