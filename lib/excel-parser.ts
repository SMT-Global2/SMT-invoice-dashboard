import * as XLSX from 'xlsx';

/**
 * Parse an Excel file and return its contents as JSON
 * @param buffer The Excel file as an ArrayBuffer
 * @returns An array of objects representing the Excel data
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<any[]> {
  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer);
    
    // Get the first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
} 