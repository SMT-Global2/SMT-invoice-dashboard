export interface PartySection {
  partyName: string;
  partyCode: string;
  location: string;
  contact: string;
  creditDays: string;
  data: Array<{
    DC: string;
    [key: string]: string | number;
  }>;
} 