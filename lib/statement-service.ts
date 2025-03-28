import { v4 as uuidv4 } from 'uuid';

// Type definitions
export type FinancialEntry = {
  dc?: string;
  voucherDate: string;
  voucherNumber: string;
  debits: number;
  partAdjustment: number;
  balance: number;
  balanceCarryForward: number;
  days: number;
  discountNarration: string;
};

export type Party = {
  partyCode: string;
  partyName: string;
  contactInfo?: string;
  creditDays?: string;
  entries: FinancialEntry[];
  total?: {
    debits: number;
    partAdjustment: number;
    balance: number;
    discountNarration: string;
  };
};

export type Statement = {
  id: string;
  name: string;
  reportDate: string;
  parties: Party[];
};

/**
 * Process a financial statement file
 * Parses the specific text format for outstanding reports
 */
export const statementService = {
  loadStatements: async (file: File): Promise<Statement[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (event.target?.result) {
            const result = event.target.result as string;
            
            // Parse the text file
            const statement = parseOutstandingReport(result, file.name);
            
            if (!statement.parties.length) {
              throw new Error('No valid statement data found in the file');
            }
            
            resolve([statement]);
          } else {
            throw new Error('Failed to read the file');
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading the file'));
      };
      
      reader.readAsText(file);
    });
  },
  
  // Load sample data for testing
  loadSampleData: (): Promise<Statement[]> => {
    return new Promise((resolve) => {
      // Sample data representing an outstanding report
      const sampleText = `SANJIVAN MEDICO TRADERS,CHANDRAPUR
Outstanding report as on 05/03/2025

--------------------------------------------------------------------------------------------------------------------------
DC  Vou.Date     VoucherNo       Debits    Part Adj.      Balance  Balance C/f Days    Disc. Narration                    
--------------------------------------------------------------------------------------------------------------------------
A255 A TO Z MEDICAL STORES,NANDORI - (7038053526 7038053526) (Days : 35)

I  28/01/2025 * INV   79697       824.00          -         824.00       824.00   36    22.76
I  05/02/2025 * INV   81747     1,472.00          -       1,472.00     2,296.00   28    40.65
I  13/02/2025 * INV   83801     2,101.00          -       2,101.00     4,397.00   20    58.02

Total                          4,397.00         0.00     4,397.00                     121.43

--------------------------------------------------------------------------------------------------------------------------
DC  Vou.Date     VoucherNo       Debits    Part Adj.      Balance  Balance C/f Days    Disc. Narration                    
--------------------------------------------------------------------------------------------------------------------------
WR02 ANAND MEDICAL & GEN. STORES,WARORA - (07176-282180 9850300417) (Days : 35)

I  05/02/2025 * INV   81881     3,362.00     2,823.00       539.00       539.00   28    92.84
I  05/02/2025 * INV   81911       574.00          -         574.00     1,113.00   28    15.86
I  10/02/2025 * INV   82996     3,755.00          -       3,755.00     4,868.00   23    103.91
I  14/02/2025 * INV   84206     1,645.00          -       1,645.00     6,513.00   19    45.42
I  19/02/2025 * INV   85498       499.00          -         499.00     7,012.00   14    13.09
I  24/02/2025 * INV   86736     5,608.00          -       5,608.00    12,620.00    9    164.94
I  28/02/2025 * INV   87819       760.00          -         760.00    13,380.00    5    20.98
I  03/03/2025 * INV   88571       690.00          -         690.00    14,070.00    2    20.50

Total                         16,893.00     2,823.00    14,070.00                     477.54`;

      const statement = parseOutstandingReport(sampleText, 'Sample-Outstanding-Report');
      resolve([statement]);
    });
  }
};

/**
 * Parse the outstanding report text format
 */
export const parseOutstandingReport = (reportContent: string, fileName?: string): Statement => {
  // Initialize statement
  const statement: Statement = {
    id: uuidv4(),
    name: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Outstanding Report',
    reportDate: '',
    parties: [],
  };
  
  // Get report date from the first section
  const reportDateMatch = reportContent.match(/Outstanding report as on (\d{2}\/\d{2}\/\d{4})/i);
  if (reportDateMatch) {
    statement.reportDate = reportDateMatch[1];
  }
  
  // Split by the dashed separator line to identify party sections
  const sections = reportContent.split(/--+/g);
  
  // Process each section that appears to be a party data section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    
    // Skip empty sections
    if (!section) continue;
    
    // Look for sections that have "DC" and "Vou.Date" header or similar pattern
    if (section.includes("DC") && (section.includes("Vou.Date") || section.includes("Voucher Date"))) {
      // This is a header section, the next section should contain party data
      if (i + 1 < sections.length) {
        const partySection = sections[i + 1].trim();
        const lines = partySection.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > 0) {
          // First line after the header should contain the party information
          const partyLine = lines[0].trim();
          
          // Extract party code and name from the first line
          // Format appears to be: CODE NAME - (CONTACT) (Days : XX)
          let partyCode = 'UNKNOWN';
          let partyName = '';
          let contactInfo = '';
          let creditDays = '';
          
          // Enhanced regex to extract party details from format like "A255 A TO Z MEDICAL STORES,NANDORI - (7038053526 7038053526) (Days : 35)"
          const partyMatch = partyLine.match(/^(\S+)\s+(.+?)\s*-\s*\((.+?)\)\s*\(Days\s*:\s*(\d+)\)/);
          
          if (partyMatch) {
            partyCode = partyMatch[1];
            // Remove the dash prefix if present
            if (partyCode.startsWith('-')) {
              partyCode = partyCode.substring(1).trim();
            }
            partyName = partyMatch[2].trim();
            contactInfo = partyMatch[3].trim();
            creditDays = partyMatch[4];
          } else {
            // Simpler fallback if the regex doesn't match
            const simpleParts = partyLine.split(/\s+-\s+/);
            if (simpleParts.length > 0) {
              const firstPart = simpleParts[0].trim();
              const codeParts = firstPart.match(/^(\S+)\s+(.+)/);
              
              if (codeParts) {
                partyCode = codeParts[1];
                // Remove the dash prefix if present
                if (partyCode.startsWith('-')) {
                  partyCode = partyCode.substring(1).trim();
                }
                partyName = codeParts[2];
              } else {
                partyName = firstPart;
              }
              
              // Try to extract contact and days if available
              if (simpleParts.length > 1) {
                const secondPart = simpleParts[1];
                
                // Extract contact info
                const contactMatch = secondPart.match(/\((.+?)\)/);
                if (contactMatch) {
                  contactInfo = contactMatch[1];
                }
                
                // Extract credit days
                const daysMatch = secondPart.match(/\(Days\s*:\s*(\d+)\)/i);
                if (daysMatch) {
                  creditDays = daysMatch[1];
                }
              }
            } else {
              // Last resort fallback
              partyName = partyLine;
            }
          }
          
          // Initialize party object
          const party: Party = {
            partyCode,
            partyName,
            creditDays,
            contactInfo,
            entries: [],
            total: {
              debits: 0,
              partAdjustment: 0,
              balance: 0,
              discountNarration: ''
            }
          };
          
          // Process transaction entries
          for (let j = 1; j < lines.length; j++) {
            const line = lines[j].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Handle total line
            if (line.toLowerCase().startsWith('total')) {
              const totalParts = line.split(/\s+/).filter(p => p.trim() !== '');
              
              // Extract total values - position may vary based on format
              let debitIdx = -1;
              let partAdjIdx = -1;
              let balanceIdx = -1;
              
              // Find numeric values
              for (let idx = 1; idx < totalParts.length; idx++) {
                if (parseableNumber(totalParts[idx])) {
                  if (debitIdx === -1) {
                    debitIdx = idx;
                  } else if (partAdjIdx === -1) {
                    partAdjIdx = idx;
                  } else if (balanceIdx === -1) {
                    balanceIdx = idx;
                    break;
                  }
                }
              }
              
              if (debitIdx > 0 && partAdjIdx > 0 && balanceIdx > 0) {
                const debits = parseNumber(totalParts[debitIdx]);
                const partAdjustment = parseNumber(totalParts[partAdjIdx]);
                const balance = parseNumber(totalParts[balanceIdx]);
                
                // Get any remaining text as discount narration
                const discountNarration = totalParts.slice(balanceIdx + 1).join(' ');
                
                party.total = {
                  debits,
                  partAdjustment,
                  balance,
                  discountNarration
                };
              } else if (debitIdx > 0 && balanceIdx === -1) {
                // Handle format with just debits and possibly adjustment
                const debits = parseNumber(totalParts[debitIdx]);
                let partAdjustment = 0;
                if (partAdjIdx > 0) {
                  partAdjustment = parseNumber(totalParts[partAdjIdx]);
                }
                const balance = debits;
                
                // Get any remaining text as discount narration
                const discountNarration = totalParts.slice(Math.max(debitIdx, partAdjIdx) + 1).join(' ');
                
                party.total = {
                  debits,
                  partAdjustment,
                  balance,
                  discountNarration
                };
              }
              continue;
            }
            
            // Process transaction entry line
            // Fixed column format based on the requested format:
            // DC | Vou.Date | Debits | Part Adj. | Balance | Balance C/f | Days | Disc. Narration
            
            try {
              // Split the line by spaces and filter out empty segments
              const parts = line.split(/\s+/).filter(p => p.trim() !== '');
              
              if (parts.length >= 6) { // We need at least DC, Date, Debits, Balance, BalanceCF, Days
                const dc = parts[0];
                
                // Get voucher date
                let voucherDate = parts[1];
                let voucherNumber = '';
                
                let idx = 2; // Start from the third column
                
                // Handle different voucher number formats
                if (idx < parts.length) {
                  // Case 1: * TYPE xxxxx (with asterisk)
                  if (parts[idx] === '*') {
                    idx++; // Skip the asterisk
                    
                    if (idx < parts.length) {
                      const type = parts[idx].toUpperCase();
                      idx++; // Skip the type
                      
                      // Check if next part is numeric voucher number
                      if (idx < parts.length && /^\d+$/.test(parts[idx])) {
                        voucherNumber = parts[idx];
                        idx++;
                      }
                    }
                  }
                  // Case 2: TYPE xxxxx (without asterisk)
                  else {
                    const type = parts[idx].toUpperCase();
                    idx++; // Skip the type
                    
                    // Check if next part is numeric voucher number
                    if (idx < parts.length && /^\d+$/.test(parts[idx])) {
                      voucherNumber = parts[idx];
                      idx++;
                    }
                  }
                }
                
                // Now correctly map remaining columns:
                // Make sure we have at least some data left to parse
                if (idx < parts.length) {
                  // First numeric value should be debits
                  const debits = parseNumber(parts[idx++]);
                  
                  // Next is part adjustment
                  let partAdjustment = 0;
                  if (idx < parts.length) {
                    if (parts[idx] === '-') {
                      // Skip this column if it's just a dash
                      idx++;
                    } else if (parseableNumber(parts[idx])) {
                      partAdjustment = parseNumber(parts[idx]);
                      idx++;
                    }
                  }
                  
                  // Next is balance
                  let balance = 0;
                  if (idx < parts.length && parseableNumber(parts[idx])) {
                    balance = parseNumber(parts[idx]);
                    idx++;
                  }
                  
                  // Next is balance carry forward
                  let balanceCarryForward = 0;
                  if (idx < parts.length && parseableNumber(parts[idx])) {
                    balanceCarryForward = parseNumber(parts[idx]);
                    idx++;
                  }
                  
                  // Next is days
                  let days = 0;
                  if (idx < parts.length && !isNaN(parseInt(parts[idx]))) {
                    days = parseInt(parts[idx]);
                    idx++;
                  }
                  
                  // The remaining is the discount narration
                  const discountNarration = parts.slice(idx).join(' ');
                  
                  // Add entry to party
                  party.entries.push({
                    dc,
                    voucherDate,
                    voucherNumber,
                    debits,
                    partAdjustment,
                    balance,
                    balanceCarryForward,
                    days,
                    discountNarration
                  });
                }
              }
            } catch (error) {
              console.error('Error parsing transaction line:', line, error);
              // Continue processing other lines even if one fails
            }
          }
          
          // Add party to statement if it has entries or total
          if (party.entries.length > 0) {
            // Ensure party has total property correctly set
            ensurePartyTotal(party);
            statement.parties.push(party);
          }
        }
      }
    }
  }
  
  return statement;
}

/**
 * Helper function to parse numbers from string that may include currency symbols and commas
 */
function parseNumber(value: string): number {
  if (!value) return 0;
  
  // Remove currency symbols (₹, $, etc.) and commas
  const cleanValue = value.replace(/[₹$,]/g, '');
  
  // Parse the number
  return parseFloat(cleanValue) || 0;
}

/**
 * Helper function to check if a string can be parsed as a number
 */
function parseableNumber(value: string): boolean {
  if (!value) return false;
  
  // Remove currency symbols (₹, $, etc.) and commas
  const cleanValue = value.replace(/[₹$,]/g, '');
  
  // Check if the result is a valid number
  return !isNaN(parseFloat(cleanValue));
}


export function generatePDF(data: Statement | Party): void {
  try {
    // In a real implementation, we would generate a PDF file here
    // For now, we'll just show an alert
    alert('PDF generation would be implemented here');
    
    // As a fallback, let's create a JSON file instead
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    if ('parties' in data) {
      a.download = `${data.name.replace(/\s+/g, '_')}.json`;
    } else {
      a.download = `${data.partyCode}_${data.partyName.replace(/\s+/g, '_')}.json`;
    }
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Add this function to ensure party entries have the total field
function ensurePartyTotal(party: Party) {
  if (!party.total) {
    party.total = {
      debits: 0,
      partAdjustment: 0,
      balance: 0,
      discountNarration: ''
    };
  }
  
  // Calculate total from entries if not already set
  if (party.entries.length > 0) {
    const debits = party.entries.reduce((sum, entry) => sum + entry.debits, 0);
    const partAdjustment = party.entries.reduce((sum, entry) => sum + entry.partAdjustment, 0);
    const balance = party.entries.reduce((sum, entry) => sum + entry.balance, 0);
    
    // Calculate the total discount narration by summing up numeric values
    const discountNarrationTotal = party.entries.reduce((sum, entry) => {
      const narrationValue = parseFloat(entry.discountNarration);
      return !isNaN(narrationValue) ? sum + narrationValue : sum;
    }, 0);

    party.total.debits = debits;
    party.total.partAdjustment = partAdjustment;
    party.total.balance = balance;
    party.total.discountNarration = discountNarrationTotal.toFixed(2);
  }
  
  return party;
} 