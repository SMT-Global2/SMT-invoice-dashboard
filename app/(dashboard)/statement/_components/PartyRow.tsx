import React from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PartyRowProps } from '../_types';
import PartyActions from './PartyActions';
import PartyDetails from './PartyDetails';

const PartyRow: React.FC<PartyRowProps> = ({ party, statement, handlers }) => {
  const { 
    togglePartyExpand, 
    isPartyExpanded, 
  } = handlers;

  return (
    <Card className="shadow-sm overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-colors">
      <div 
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-muted/40 cursor-pointer"
        onClick={() => togglePartyExpand(statement.id, party.partyCode)}
      >
        <div className="flex items-center mb-2 sm:mb-0">
          {isPartyExpanded(statement.id, party.partyCode) ? (
            <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">
              {party.partyCode.startsWith('-') ? party.partyCode.substring(1).trim() : party.partyCode} {party.partyName}
            </span>
            {(party.contactInfo || party.creditDays) && (
              <span className="text-xs text-muted-foreground">
                {party.contactInfo && `(${party.contactInfo})`} {party.creditDays && `(Days: ${party.creditDays})`}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          <PartyActions 
            party={party} 
            statement={statement} 
            handlers={handlers} 
          />
        </div>
      </div>

      {isPartyExpanded(statement.id, party.partyCode) && (
        <PartyDetails party={party} />
      )}
    </Card>
  );
};

export default PartyRow; 