import { LucideIcon } from 'lucide-react';
import { Statement, Report } from '@/lib/statement-service';

// Define types for our components
export interface SavedPartyInfo {
  timestamp: string;
  location?: string | null;
  coordinates?: { lat: number; lng: number } | null;
}

export interface HandlersProps {
  togglePartyExpand: (statementId: string, partyCode: string) => void;
  isPartyExpanded: (statementId: string, partyCode: string) => boolean;
  isPartySaved: (partyCode: string) => boolean;
  hasPartyImage: (partyCode: string) => boolean;
  capturedImages: Record<string, string>;
  savedParties: Record<string, SavedPartyInfo>;
  captureStatementImage: (partyCode: string, reportId: string) => void;
  savePartyImage: (partyCode: string, reportId: string) => void;
  downloadPartyPDF: (party: Report, statement: Statement) => void;
  isLoading: boolean;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  buttonText?: string;
  buttonAction?: () => void;
  showUpload?: boolean;
  handleFileUpload?: (file: File) => void;
  isUploading?: boolean;
}

export interface PartyRowProps {
  party: Report;
  statement: Statement;
  handlers: HandlersProps;
}

export interface PartyActionsProps {
  party: Report;
  statement: Statement;
  handlers: HandlersProps;
}

export interface PartyDetailsProps {
  party: Report;
} 