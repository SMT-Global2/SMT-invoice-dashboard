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

export type Report = {
  id?: string;
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
  reports: Report[];
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
            
            if (!statement.reports.length) {
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
    reports: [],
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
            partyCode = partyCode.replace(/[\x00-\x1F]/g, '').trim();

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


              // Remove any hex control characters from party code and name
              partyCode = partyCode.replace(/[\x00-\x1F]/g, '').trim();


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
          const report: Report = {
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

          console.log(report);
          
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
                
                report.total = {
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
                
                report.total = {
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
                  report.entries.push({
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
          if (report.entries.length > 0) {
            // Ensure party has total property correctly set
            ensurePartyTotal(report);
            statement.reports.push(report);
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


export function generatePDF(data: Statement | Report): void {
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
    
    if ('reports' in data) {
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
function ensurePartyTotal(report: Report) {
  if (!report.total) {
    report.total = {
      debits: 0,
      partAdjustment: 0,
      balance: 0,
      discountNarration: ''
    };
  }
  
  // Calculate total from entries if not already set
  if (report.entries.length > 0) {
    const debits = report.entries.reduce((sum, entry) => sum + entry.debits, 0);
    const partAdjustment = report.entries.reduce((sum, entry) => sum + entry.partAdjustment, 0);
    const balance = report.entries.reduce((sum, entry) => sum + entry.balance, 0);
    
    // Calculate the total discount narration by summing up numeric values
    const discountNarrationTotal = report.entries.reduce((sum, entry) => {
      const narrationValue = parseFloat(entry.discountNarration);
      return !isNaN(narrationValue) ? sum + narrationValue : sum;
    }, 0);

    report.total.debits = debits;
    report.total.partAdjustment = partAdjustment;
    report.total.balance = balance;
    report.total.discountNarration = discountNarrationTotal.toFixed(2);
  }
  
  return report;
} 