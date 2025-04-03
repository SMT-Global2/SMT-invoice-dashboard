import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

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
  total: {
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

type ExcelRow = string[];

/**
 * Process a financial statement Excel file
 * Parses the Excel format for outstanding reports
 */
export const statementService = {
  loadStatements: async (file: File): Promise<Statement[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (event.target?.result) {
            const data = event.target.result as ArrayBuffer;
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Check for sheet name - try 'micropro Report' first, then fallback to first sheet
            const sheetName = workbook.SheetNames.includes('micropro Report') 
                ? 'micropro Report' 
                : workbook.SheetNames[0];
            
            if (!sheetName) {
              throw new Error('No sheets found in the Excel file');
            }
            
            console.log('Using sheet:', sheetName);
            const sheet = workbook.Sheets[sheetName];
            
            // Get the raw data as array of arrays
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            
            console.log('Raw Excel Data (first 10 rows):', rawData.slice(0, 10));
            
            // Extract report date (look for date pattern in first few rows)
            let reportDate = '';
            for (let i = 0; i < Math.min(5, rawData.length); i++) {
              if (rawData[i] && rawData[i][0]) {
                const dateMatch = String(rawData[i][0]).match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dateMatch) {
                  reportDate = dateMatch[0];
                  break;
                }
              }
            }
            
            // Initialize statement
            const statement: Statement = {
              id: uuidv4(),
              name: file.name.replace(/\.[^/.]+$/, ''),
              reportDate,
              reports: []
            };
            
            // Process all data rows
            let currentParty: Report | null = null;
            
            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i];
              
              // Skip empty rows
              if (!row || row.length === 0) continue;
              
              // Try to detect party headers - they might be in different formats
              // Common patterns: contains party code and Days
              if (row[0] && typeof row[0] === 'string') {
                const rowText = row[0].toString();
                console.log(`Row ${i}: ${rowText}`);
                
                // Pattern 1: Looks like a party code followed by name
                // More flexible party header detection - any row that looks like it has a party code
                // and is not a transaction row (JV, BP, etc.)
                if (rowText && !['JV', 'BP', 'DC', 'TOTAL'].includes(rowText) && 
                    (rowText.includes('Days') || /^[A-Z0-9]{2,6}\s/.test(rowText) || rowText.match(/^[A-Z0-9]+[\s,]/))) {
                    
                  console.log('Found potential party header:', rowText);
                  
                  // If we have a previous party, add it to the statement
                  if (currentParty && currentParty.entries.length > 0) {
                    statement.reports.push(currentParty);
                  }
                  
                  // Try different patterns to extract party information
                  // Pattern 1: CODE NAME,LOCATION (CONTACT) (Days : XX)
                  // Pattern 2: CODE NAME,LOCATION - (CONTACT) (Days : XX)
                  // Pattern 3: CODE NAME,LOCATION
                  // Pattern 4: Just the party code and name (no days or contact)
                  let partyCode = '';
                  let partyName = '';
                  let contactInfo = '';
                  let creditDays = '';
                  
                  // Improved pattern matching for party headers
                  console.log('Attempting to parse party header:', rowText);
                  
                  // First, specifically extract the code at the beginning (alphanumeric characters)
                  const codeMatch = rowText.match(/^([A-Z0-9]+[\w-]*)/i);
                  if (codeMatch) {
                    // Extract the party code
                    partyCode = codeMatch[1].trim();
                    console.log('Extracted party code:', partyCode);
                    
                    // Remove the code from the text to get the rest
                    let restText = rowText.substring(partyCode.length).trim();
                    
                    // Try to extract contact info (anything in parentheses that's not days)
                    const contactMatches = restText.match(/\(([^)]*Days[^)]*)\)/ig);
                    const nonDaysMatches = restText.match(/\(([^)]*(?!Days)[^)]*)\)/ig);
                    
                    if (contactMatches && contactMatches.length > 0) {
                      // This pattern contains "Days", likely the credit days
                      const daysMatch = contactMatches[0].match(/Days\s*:\s*(\d+)/i);
                      if (daysMatch) {
                        creditDays = daysMatch[1];
                      }
                    }
                    
                    if (nonDaysMatches && nonDaysMatches.length > 0) {
                      // This is likely the contact info
                      const contactText = nonDaysMatches[0];
                      contactInfo = contactText.replace(/[()]/g, '').trim();
                    }
                    
                    // Extract party name by removing code, contact info and days info
                    partyName = restText
                      .replace(/\([^)]*Days[^)]*\)/ig, '') // Remove days part
                      .replace(/\([^)]*\)/g, '')           // Remove contact part
                      .replace(/,\s*$/, '')                 // Remove trailing commas
                      .trim();
                    
                    console.log('Extracted party components:', {
                      partyCode,
                      partyName,
                      contactInfo,
                      creditDays
                    });
                  } else {
                    // Fallback to regex approach if code couldn't be extracted
                    let partyMatch = rowText.match(/^([A-Z0-9]+[\w-]*)\s+(.+?)(?:\s*-\s*)?(?:\((.+?)\))?\s*(?:\(Days\s*:\s*(\d+)\))?$/i);
                    
                    if (!partyMatch) {
                      // Try another pattern focusing on comma separation
                      partyMatch = rowText.match(/^([A-Z0-9]+[\w-]*)\s+([^(]+)(?:\((.+?)\))?\s*(?:\(Days\s*:\s*(\d+)\))?$/i);
                    }
                    
                    if (partyMatch) {
                      console.log('Party matched with regex:', partyMatch);
                      partyCode = partyMatch[1].trim();
                      
                      // Get the full party name without the code
                      partyName = partyMatch[2].trim();
                      
                      // Clean up the party name (remove trailing commas)
                      partyName = partyName.replace(/,\s*$/, '');
                      
                      if (partyMatch[3]) contactInfo = partyMatch[3].trim();
                      if (partyMatch[4]) creditDays = partyMatch[4].trim();
                    }
                  }
                  
                  console.log('Extracted party info:', { partyCode, partyName, contactInfo, creditDays });
                  
                  // Create party object if we have at least a code
                  if (partyCode) {
                    if (!partyName) partyName = partyCode; // Use code as name if name not found
                    
                    currentParty = {
                      partyCode,
                      partyName,
                      contactInfo,
                      creditDays,
                      entries: [],
                      total: {
                        debits: 0,
                        partAdjustment: 0,
                        balance: 0,
                        discountNarration: ''
                      }
                    };
                  }
                  continue;
                }
              }
              
              // Process transaction rows - now try to match transaction rows more flexibly
              if (currentParty && row[0]) {
                const transType = String(row[0]).trim();
                
                // Check if this looks like a transaction row (expanded list of transaction types)
                // Add more transaction types to the list and make detection more flexible
                if (['JV', 'BP', 'DB', 'CR', 'SL', 'PR', 'SP', 'DN', 'CN', 'CZ', 'SR', 'PY', 'RT', 'AE', 'CP', 'CD', 'BJ', 'SB', 'RV', 'I'].includes(transType) || 
                    /^[A-Z]{1,3}$/.test(transType)) { // Also match any 1-3 uppercase letters as a fallback
                  console.log(`Processing transaction type ${transType} with values:`, row);
                  
                  try {
                    // Map values to the correct columns based on the standard Excel format we've observed
                    // This approach uses direct column indices based on the known structure
                    let voucherNumber = '';
                    let debits = 0;
                    let partAdjustment = 0;
                    let balance = 0;
                    let balanceCarryForward = 0;
                    let days = 0;
                    let discountNarration = '';
                    
                    // Column 4 is usually VoucherNo
                    if (row[4] !== undefined && row[4] !== null) {
                      voucherNumber = String(row[4]).trim();
                    }
                    
                    // Special handling for 'I' type transactions - check for 'INV' type in column 3
                    if (transType === 'I' && row[3] !== undefined && row[3] !== null) {
                      const voucherType = String(row[3]).trim();
                      if (voucherType === 'INV') {
                        // For 'I' type with 'INV', include the type in the voucher number
                        voucherNumber = `${voucherType} ${voucherNumber}`;
                      }
                    }
                    
                    // Column 5 is Debits
                    if (row[5] !== undefined && row[5] !== null) {
                      debits = parseNumberSafe(row[5]);
                    }
                    
                    // Column 6 is Part Adj.
                    if (row[6] !== undefined && row[6] !== null) {
                      partAdjustment = parseNumberSafe(row[6]);
                    }
                    
                    // Column 7 is Balance
                    if (row[7] !== undefined && row[7] !== null) {
                      balance = parseNumberSafe(row[7]);
                    }
                    
                    // Column 8 is Balance C/f
                    if (row[8] !== undefined && row[8] !== null) {
                      balanceCarryForward = parseNumberSafe(row[8]);
                    }
                    
                    // Column 9 is Days
                    if (row[9] !== undefined && row[9] !== null) {
                      days = parseNumberSafe(row[9]);
                    }
                    
                    // Column 10 is Disc.
                    if (row[10] !== undefined && row[10] !== null) {
                      discountNarration = String(row[10]).trim();
                    }
                    
                    // Column 11 is Narration (alternative location)
                    if (!discountNarration && row[11] !== undefined && row[11] !== null) {
                      discountNarration = String(row[11]).trim();
                    }
                    
                    console.log('Extracted transaction values:', {
                      voucherNumber,
                      debits,
                      partAdjustment,
                      balance,
                      balanceCarryForward,
                      days,
                      discountNarration
                    });
                    
                    // Handle the date in column 1
                    let voucherDate = '';
                    if (row[1] !== undefined && row[1] !== null) {
                      if (typeof row[1] === 'number') {
                        // Excel stores dates as days since 1900-01-01 (with a leap year bug)
                        const excelEpoch = new Date(1899, 11, 30);
                        const msPerDay = 24 * 60 * 60 * 1000;
                        const date = new Date(excelEpoch.getTime() + row[1] * msPerDay);
                        voucherDate = date.toLocaleDateString();
                      } else if (typeof row[1] === 'string') {
                        // Try to parse various date formats
                        if (row[1].includes('-')) {
                          // Format like "31-Mar-21"
                          voucherDate = row[1];
                        } else {
                          voucherDate = String(row[1]);
                        }
                      }
                    }
                    
                    // Build the entry with the mapped values
                    const entry: FinancialEntry = {
                      dc: transType,
                      voucherDate,
                      voucherNumber,
                      debits,
                      partAdjustment,
                      balance,
                      balanceCarryForward,
                      days,
                      discountNarration
                    };
                    
                    // Ensure we have at least some valid data before adding the entry
                    if (voucherNumber || debits > 0 || balance > 0) {
                      currentParty.entries.push(entry);
                      
                      // Update party totals
                      currentParty.total.debits += entry.debits;
                      currentParty.total.partAdjustment += entry.partAdjustment;
                      currentParty.total.balance = entry.balanceCarryForward || entry.balance;
                    }
                  } catch (err) {
                    console.error('Error processing transaction row:', err);
                  }
                }
              }
            }
            
            // Add the last party if exists
            if (currentParty && currentParty.entries.length > 0) {
              statement.reports.push(currentParty);
            }
            
            console.log('Final statement reports count:', statement.reports.length);
            console.log('Final statement:', statement);
            
            if (statement.reports.length === 0) {
              throw new Error('No valid statement data found in the file');
            }
            
            resolve([statement]);
          } else {
            throw new Error('Failed to read the file');
          }
        } catch (error: any) {
          console.error('Error processing file:', error);
          reject(error);
        }
      };
      
      reader.onerror = (event) => {
        console.error('File reader error:', event);
        reject(new Error('Error reading the file'));
      };
      
      reader.readAsArrayBuffer(file);
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

// Helper function to safely parse numbers from various formats
function parseNumberSafe(value: any): number {
  if (value === undefined || value === null) return 0;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and other non-numeric characters
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleanValue) || 0;
  }
  
  return 0;
} 