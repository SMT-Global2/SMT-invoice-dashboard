import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface ExcelRow {
  [key: string]: string | number;
}

interface PartySection {
  partyName: string;
  partyCode: string;
  location: string;
  contact: string;
  creditDays: string;
  data: ExcelRow[];
}

// Common transaction types to identify non-party rows
const TRANSACTION_TYPES = [
  'JV', 'BP', 'I', 'CP', 'CD', 'RV', 'CR', 'CN', 'BR', 'DB', 'SL', 'PR', 'SP', 'DN',
  'CZ', 'SR', 'PY', 'RT', 'AE', 'BJ', 'SB'
];

// Enhanced party header detection - more flexible approach
function isPartyHeader(rowData: ExcelRow): boolean {
  // Get the first cell value as potential party code
  const firstCell = String(rowData.col0 || '').trim();
  if (!firstCell) return false;
  
  // Automatic exclusions
  if (firstCell.toLowerCase() === 'total' || 
      firstCell.toLowerCase().includes('grand total') ||
      firstCell.toLowerCase().includes('outstanding') ||
      TRANSACTION_TYPES.includes(firstCell.toUpperCase())) {
    return false;
  }
  
  // Get all row values as a joint string for fallback checks
  const rowValues = Object.values(rowData).map(v => String(v || '').trim()).filter(Boolean);
  const rowText = rowValues.join(' ');
  
  // Multiple criteria for party header detection
  
  // 1. Format check: Party Code typically starts with letter(s) followed by numbers
  const hasPartyCodeFormat = /^[A-Z]{1,3}\d{1,4}/i.test(firstCell);
  
  // 2. Days mention anywhere in the row
  const hasDaysMention = rowText.toLowerCase().includes('days');
  
  // 3. Phone number pattern anywhere in the row
  const hasPhonePattern = /\(.*\d{5}.*\d{5}.*\)/i.test(rowText) || 
                        /\(.*\d{10}.*\)/i.test(rowText);
  
  // 4. Location pattern (comma followed by text, typical in party headers)
  const hasLocationPattern = firstCell.includes(',') || Boolean(rowText.match(/,[^,]+?[^,]*\(/));
  
  // 5. Special case for party codes: 2-5 characters followed by space and UPPERCASE text
  const isCodeWithName = /^[A-Z0-9]{2,5}\s+[A-Z\s]/i.test(firstCell) && firstCell.length > 6;
  
  // Primary detection logic
  if (hasPartyCodeFormat) {
    // If it looks like a party code, require at least one of the confirming patterns
    return hasDaysMention || hasPhonePattern || hasLocationPattern || isCodeWithName;
  }
  
  // Special fallback cases - long name with uppercase and some pattern that looks like a party
  if (firstCell.length > 5 && 
      /^[A-Z][A-Z0-9\s]+/.test(firstCell) && 
      (hasDaysMention || hasPhonePattern)) {
    return true;
  }
  
  // Extremely specific case for any headers that still don't match
  // Some party headers might be very unique, add specific patterns here
  // if (firstCell.startsWith('S0') || firstCell.startsWith('K0')) return true;
  
  return false;
}

// Improved information extraction from party headers
function parsePartyInfo(rowData: ExcelRow): { 
  partyCode: string; 
  partyName: string; 
  location: string; 
  contact: string; 
  creditDays: string; 
} {
  // Get text values
  const firstCell = String(rowData.col0 || '').trim();
  const rowValues = Object.values(rowData).map(v => String(v || '').trim()).filter(Boolean);
  const rowText = rowValues.join(' ');
  
  // Extract party code
  let partyCode = '';
  const codeMatch = firstCell.match(/^([A-Z]{1,3}\d{1,4})/i);
  if (codeMatch) {
    partyCode = codeMatch[1];
  } else {
    // Fallback: first word of the header
    partyCode = firstCell.split(/\s+/)[0];
  }
  
  // Extract days
  let creditDays = '';
  const daysMatch = rowText.match(/days\s*:?\s*(\d+)/i) || 
                   rowText.match(/\(.*?(\d+)\s*days/i);
  if (daysMatch) {
    creditDays = daysMatch[1];
  }
  
  // Extract contact info (phone numbers)
  let contact = '';
  const contactMatches = rowText.match(/\(\s*(\d[\d\s-]{8,})\s*\)/g);
  if (contactMatches) {
    contact = contactMatches.join(' ');
  }
  
  // Extract location info (after comma but before parenthesis)
  let location = '';
  const locationMatch = firstCell.match(/,\s*([^(]+)/);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else {
    // Try to find location in other cells
    for (let i = 1; i < 5; i++) {
      const cellValue = String(rowData[`col${i}`] || '').trim();
      if (cellValue && !cellValue.includes('Days')) {
        location = cellValue;
        break;
      }
    }
  }
  
  // Extract party name
  let partyName = firstCell.replace(/^[A-Z]{1,3}\d{1,4}\s+/i, ''); // Remove code prefix
  
  // Remove location part if it exists
  if (location && partyName.includes(',')) {
    partyName = partyName.split(',')[0].trim();
  }
  
  // Remove days part if found
  partyName = partyName.replace(/\(\s*days\s*:?\s*\d+\s*\)/i, '').trim();
  
  // Remove contact part if found
  if (contact) {
    const contactClean = contact.replace(/[()]/g, '\\$&'); // Escape parentheses
    partyName = partyName.replace(new RegExp(contactClean, 'i'), '').trim();
  }
  
  // Clean up extra spaces, commas, etc.
  partyName = partyName.replace(/\s{2,}/g, ' ').replace(/,\s*$/, '').trim();
  
  // If name is empty, use code as name
  if (!partyName) {
    partyName = partyCode;
  }
  
  return {
    partyCode,
    partyName,
    location,
    contact,
    creditDays
  };
}

// Verify if a row is a transaction
function isTransactionRow(rowData: ExcelRow): boolean {
  const firstCell = String(rowData.col0 || '').trim().toUpperCase();
  
  // Check if the first cell is a known transaction type
  if (TRANSACTION_TYPES.includes(firstCell)) {
    return true;
  }
  
  // Also match 1-3 letter codes that might be transaction types
  if (/^[A-Z]{1,3}$/.test(firstCell) && firstCell !== 'DC') {
    return true;
  }
  
  // Check if it's a Total row
  if (firstCell === 'TOTAL') {
    return true;
  }
  
  return false;
}

// Check if a row is a total row
function isTotalRow(rowData: ExcelRow): boolean {
  const firstCell = String(rowData.col0 || '').trim().toLowerCase();
  return firstCell === 'total' || firstCell.includes('grand total');
}

// Process the total row
function parseTotalRow(rowData: ExcelRow): ExcelRow {
  // Simply return the row as is for totals
  return rowData;
}

// Define a more complete type that includes our custom fields
interface ExtendedStatement {
  id: string;
  name: string;
  originalName: string;
  uploadDate: Date;
  statementDate: Date;
  reportSections: any[];
  createdAt: Date;
  updatedAt: Date;
  fileUrl: string | null;
  uploadedUsername: string | null;
  uploadedTimestamp: Date | null;
}

// Main export handler
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    // Get the selected date from the form data
    const selectedDateStr = formData.get('selectedDate') as string;
    
    console.log("Processing file upload with date:", selectedDateStr);
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    
    // Parse Excel file
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 'A' });

    // Map column letters to more descriptive keys
    const rows = data.map((row: any) => {
      const mappedRow: ExcelRow = {};
      Object.entries(row).forEach(([key, value]) => {
        const colIndex = key.charCodeAt(0) - 'A'.charCodeAt(0);
        mappedRow[`col${colIndex}`] = String(value || '');
      });
      return mappedRow;
    });

    // Process rows into party sections
    const partySections: PartySection[] = [];
    let currentPartySection: PartySection | null = null;
    
    // Debug information
    console.log(`Processing ${rows.length} rows from Excel file`);
    
    // First pass: identify all party headers
    const partyHeaderRows: number[] = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const rowData = rows[idx];
      if (isPartyHeader(rowData)) {
        partyHeaderRows.push(idx);
        console.log(`Found party header at row ${idx + 1}: ${rowData.col0}`);
      }
    }
    
    console.log(`Identified ${partyHeaderRows.length} potential party headers`);
    
    // Second pass: process each party section based on the identified headers
    for (let i = 0; i < partyHeaderRows.length; i++) {
      const headerIdx = partyHeaderRows[i];
      const nextHeaderIdx = i < partyHeaderRows.length - 1 ? partyHeaderRows[i + 1] : rows.length;
      
      // Extract party info from the header row
      const partyInfo = parsePartyInfo(rows[headerIdx]);
      
      // Start a new party section
      currentPartySection = {
        ...partyInfo,
        data: []
      };
      
      // Process transactions for this party
      for (let rowIdx = headerIdx + 1; rowIdx < nextHeaderIdx; rowIdx++) {
        const rowData = rows[rowIdx];
        
        // Only include rows that look like transactions
        if (isTransactionRow(rowData)) {
          currentPartySection.data.push(rowData);
        }
      }
      
      // Add the party section to our collection
      partySections.push(currentPartySection);
      console.log(`Processed party: ${currentPartySection.partyCode} with ${currentPartySection.data.length} transaction rows`);
    }
    
    console.log(`Total party sections parsed: ${partySections.length}`);
    
    // Extract headers from the first data row (assuming consistent structure)
    let headers: string[] = [];
    if (partySections.length > 0 && partySections[0].data.length > 0) {
      headers = Object.keys(partySections[0].data[0]).map(key => {
        // Map the col# headers to more readable headers
        if (key === 'col0') return 'DC';
        if (key === 'col1') return 'Voucher Date';
        if (key === 'col2') return '*';
        if (key === 'col3') return 'Voucherser';
        if (key === 'col4') return 'Voucher No.';
        if (key === 'col5') return 'Debits';
        if (key === 'col6') return 'Part Adj.';
        if (key === 'col7') return 'Balance';
        if (key === 'col8') return 'Balance C/f';
        if (key === 'col9') return 'Days';
        if (key === 'col10') return 'Disc.';
        if (key === 'col11') return 'Narration';
        if (key === 'col12') return 'Adj';
        return key;
      });
    }

    // Parse the selected date string to a Date object
    const statementDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
    console.log("Using statement date:", statementDate);
    
    try {
      // Create a new Statement record in the database
      const prismaResult = await prisma.statement.create({
        data: {
          // @ts-ignore - These fields exist in the database but not in TS types
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          originalName: file.name,
          statementDate: statementDate,
          uploadDate: new Date(),
          uploadedUsername: "admin", // Ideally this would come from a logged-in user
          uploadedTimestamp: new Date(),
          // @ts-ignore
          reportSections: {
            create: partySections.map(section => ({
              partyCode: section.partyCode,
              partyName: section.partyName,
              location: section.location || null,
              contact: section.contact || null,
              creditDays: section.creditDays || null,
              data: section.data as any, // Store the transaction data as JSON
              images: []
            }))
          }
        },
        include: {
          // @ts-ignore
          reportSections: true
        }
      });

      // Cast to our extended type to access the fields for the response
      const statement = prismaResult as unknown as ExtendedStatement;
      console.log("Statement created successfully with ID:", statement.id);

      return NextResponse.json({
        id: statement.id,
        name: statement.name,
        uploadDate: statement.uploadDate,
        statementDate: statement.statementDate,
        partySections: partySections,
        headers: headers,
        totalParties: partySections.length
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json({ 
      error: 'Failed to process Excel file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 