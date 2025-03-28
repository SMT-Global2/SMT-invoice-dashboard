'use client';

import { Statement, Party } from '../statement-service';

export interface StatementContextType {
  statements: Statement[];
  isLoading: boolean;
  loadStatements: (file: File) => Promise<void>;
  clearStatements: () => void;
  togglePartyExpand: (statementId: string, partyCode: string) => void;
  isPartyExpanded: (statementId: string, partyCode: string) => boolean;
  downloadPartyPDF: (party: Party, statement: Statement) => void;
  captureStatementImage: (partyCode: string) => void;
  savePartyImage: (partyCode: string) => void;
  hasPartyImage: (partyCode: string) => boolean;
  isPartySaved: (partyCode: string) => boolean;
  searchParties: (parties: Party[], searchTerm: string) => Party[];
  capturedImages: Record<string, string>;
  savedParties: Record<string, { timestamp: string, location: string | null }>;
  updateStatementName: (statementId: string, newName: string) => void;
}

// Re-export from Zustand store
export { useStatements } from '@/store/useStatement'; 