import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Save, Camera, FileDown, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ShowImage } from '@/components/show-image';
import { PartyActionsProps } from '../_types';
import { Statement } from '@/lib/statement-service';

const PartyActions: React.FC<PartyActionsProps> = ({ party, statement, handlers }) => {
  const { 
    isPartySaved, 
    hasPartyImage, 
    capturedImages, 
    savedParties,
    captureStatementImage,
    savePartyImage,
    downloadPartyPDF,
    isLoading,
  } = handlers;

  const findReportIdForParty = (stmt: Statement, partyCode: string): string => {
    return `${stmt.id}_${partyCode}`;
  };

  const handleSaveWithMetadata = (partyCode: string, stmt: Statement): void => {
    const reportId = findReportIdForParty(stmt, partyCode);
    if (reportId) {
      savePartyImage(partyCode, reportId);
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

  return (
    <>
      {isPartySaved(party.partyCode) ? (
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
        </div>
      ) : hasPartyImage(party.partyCode) ? (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleSaveWithMetadata(party.partyCode, statement);
          }}
          className="bg-primary/5 border-primary/20 hover:bg-primary/10"
        >
          <Save className="h-4 w-4 mr-1 text-primary" />
          Save
        </Button>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            const reportId = findReportIdForParty(statement, party.partyCode);
            if (reportId) {
              captureStatementImage(party.partyCode, reportId);
            }
          }}
        >
          <Camera className="h-4 w-4 mr-1" />
          Capture
        </Button>
      )}
      {capturedImages[party.partyCode] && (
        <ShowImage
          images={[capturedImages[party.partyCode]]}
          text="View Image"
        />
      )}
      <Button 
        variant="outline" 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          downloadPartyPDF(party, statement);
        }}
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