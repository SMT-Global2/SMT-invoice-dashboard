import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format, addDays, isValid } from 'date-fns';

// --- Interfaces (Unchanged) ---
interface ExcelData {
  [key: string]: string | number | undefined;
  col0?: string; // DC
  col1?: string | number; // Voucher Date / "Total"
  col2?: string; // *
  col3?: string; // Voucherser / "Total"
  col4?: string | number; // Voucher No.
  col5?: string | number; // Debits
  col6?: string | number; // Part Adj.
  col7?: string | number; // Balance
  col8?: string | number; // Balance C/f
  col9?: string | number; // Days
  col10?: string | number; // Disc.
  col11?: string; // Narration
  col12?: string; // Adj
}

interface PartySection {
  partyCode: string;
  partyName: string;
  location: string;
  contact: string; // Contact prop remains, even if not displayed per target
  creditDays: string;
  data: ExcelData[];
}

// --- Props Interface (Updated) ---
interface StatementPDFProps {
  section: PartySection;
  fileName: string;
  totalDebits?: number | string;
  totalAdjustments?: number | string;
  outstandingBalance?: number | string;
  totalDiscount?: number | string;
}

// --- Font Registration (Optional - Ensure availability) ---
// Font.register({ family: 'Helvetica', src: 'path/to/Helvetica.ttf' });
// Font.register({ family: 'Helvetica-Bold', src: 'path/to/Helvetica-Bold.ttf', fontWeight: 'bold' });

// --- Excel Date Conversion Helper (Unchanged) ---
const convertExcelDate = (excelSerialDate: number): string => {
  try {
    const baseDate = new Date(Date.UTC(1899, 11, 30));
    const resultDate = addDays(baseDate, excelSerialDate);
    if (isValid(resultDate)) {
      return format(resultDate, 'd MMM yyyy');
    }
    return excelSerialDate.toString();
  } catch (error) {
    // console.error("Error converting Excel date:", error);
    return excelSerialDate.toString();
  }
};

// --- Number Formatting Helper (Unchanged) ---
const formatNumber = (value: number | string | undefined): string => {
    if (value === undefined || value === null || String(value).trim() === '') {
        return '0.00';
    }
    const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
    const numberValue = parseFloat(cleanedValue);
    if (isNaN(numberValue)) {
        return '0.00';
    }
    return numberValue.toFixed(2);
};

// --- Helper function to format numbers safely with a maximum limit ---
const formatNumberSafely = (value: number | string | undefined): number => {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'string') {
    value = value.replace(/,/g, '');
  }
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  const MAX_SAFE_VALUE = 999999; // 6 digits
  const MIN_SAFE_VALUE = -999999; // 6 digits

  if (num > MAX_SAFE_VALUE) {
    console.warn(`PDF Render: Number ${num} exceeds maximum safe value, truncating to ${MAX_SAFE_VALUE}`);
    return MAX_SAFE_VALUE;
  }
  if (num < MIN_SAFE_VALUE) {
    console.warn(`PDF Render: Number ${num} exceeds minimum safe value, truncating to ${MIN_SAFE_VALUE}`);
    return MIN_SAFE_VALUE;
  }

  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
};

// --- UI Enhancement: Color Palette (Updated Blue) ---
const NEW_BLUE = 'rgb(28, 85, 230)'; // Updated to exact RGB values
const NEW_BLUE_DARK = '#1a3fb8';

const colors = {
  primary: NEW_BLUE,
  primaryDark: NEW_BLUE_DARK,
  secondary: '#64748b', // Gray text
  lightGray: '#f8fafc', // Zebra stripe background
  mediumGray: '#cbd5e1', // Table borders
  darkGray: '#374151', // Body text
  white: '#ffffff',
  textLight: '#ffffff', // Header text
  noticeBg: '#fffbeb', // Notice Background
  noticeBorder: '#fef3c7',
  noticeText: '#a16207',
  totalBg: '#e0f2fe', // Light blue total row background
  totalBorder: '#7dd3fc', // Unused, border handled by table lines
  summaryBg: '#e0f2fe', // Summary background matches total row
  summaryBorder: '#bfdbfe', // Summary border
  complaintLink: '#2563eb', // Blue color for complaint link
};

// --- Column Definition (Using User Provided Definition) ---
const columnDefinition = [
  { header: "DC",          key: "col0",  width: "3.7%",   align: "center" },
  { header: "Voucher Date",key: "col1",  width: "9.8%",   align: "left"  },
  { header: "*",           key: "col2",  width: "1.6%",   align: "center"},
  { header: "Voucherser",  key: "col3",  width: "6.8%",   align: "center"},
  { header: "Voucher No.", key: "col4",  width: "8.3%",   align: "center"},
  { header: "Debits",      key: "col5",  width: "10.8%",  align: "right" },
  { header: "Part Adj.",   key: "col6",  width: "10%",  align: "right" },
  { header: "Balance",     key: "col7",  width: "10.8%",  align: "right" },
  { header: "Balance C/f", key: "col8",  width: "11%",    align: "right" },
  { header: "Days",        key: "col9",  width: "5.4%",   align: "center"},
  { header: "Disc.",       key: "col10", width: "9%",    align: "right" },
  { header: "Narr-\nation",key: "col11", width: "8%",     align: "left"  },
  { header: "Adj",         key: "col12", width: "4.8%",   align: "center"},
];// Verify Sum: 2.8 + 9.8 + 1.8 + 6.8 + 7.8 + 10.8 + 10.8 + 10.8 + 11 + 4.8 + 10 + 8 + 4.8 = 100%

const styles = StyleSheet.create({
  page: {
    paddingTop: 25,
    paddingBottom: 45,
    paddingHorizontal: 30,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
    lineHeight: 1.3,
  },
  pageHeader: {
    marginBottom: 15,
    textAlign: 'center',
    position: 'relative',
  },
  companyName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: NEW_BLUE,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  reportTitle: {
    fontSize: 11,
    color: colors.darkGray,
    marginBottom: 5,
    fontFamily: 'Helvetica',
  },
   generationInfo: {
     fontSize: 8,
     color: colors.secondary,
     position: 'absolute',
     top: 5,
     right: 0,
  },
  partyInfoContainer: {
    backgroundColor: colors.lightGray,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary, // Use new blue
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  partyDetailsLine: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  partyDetailItem: {
    fontSize: 8.5,
    color: colors.darkGray,
    lineHeight: 1.2,
  },
  partyDetailSeparator: {
    fontSize: 8.5,
    color: colors.secondary,
    marginHorizontal: 5,
  },
  table: {
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
    paddingHorizontal: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: colors.mediumGray,
    paddingHorizontal: 0,
    minHeight: 21,
    backgroundColor: colors.white,
    breakInside: 'avoid',
  },
  tableRowEven: {
    backgroundColor: colors.lightGray,
  },
  totalRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: colors.mediumGray,
    borderTopWidth: 1.5,
    borderTopColor: colors.mediumGray,
    paddingHorizontal: 0,
    minHeight: 21,
    backgroundColor: colors.totalBg,
    breakInside: 'avoid',
  },
  cell: {
    fontSize: 9.5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    color: colors.darkGray,
    borderRightWidth: 0.6,
    borderRightColor: colors.mediumGray,
    wordWrap: 'break-word',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  headerCell: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.textLight,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 0.6,
    borderRightColor: colors.mediumGray,
    textAlign: 'center',
    lineHeight: 1.1,
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  cellAlignLeft: { textAlign: 'left' },
  cellAlignRight: { textAlign: 'right' },
  cellAlignCenter: { textAlign: 'center' },
  boldText: {
      fontFamily: 'Helvetica-Bold',
      fontWeight: 'bold',
  },
  summarySection: {
      marginTop: 15,
      padding: 12,
      backgroundColor: `${colors.summaryBg}8A`,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.summaryBorder,
  },
  summaryTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      marginBottom: 10,
  },
  summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
      paddingHorizontal: 5,
  },
  summaryLabel: {
      fontSize: 10,
      color: colors.darkGray,
      fontFamily: 'Helvetica',
  },
  summaryValue: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: colors.darkGray,
      textAlign: 'right',
  },
   notice: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.noticeBg,
    borderRadius: 3,
  },
  noticeTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: colors.noticeText,
    textAlign:'center',
  },
  noticeText: {
    fontSize: 8.5,
    lineHeight: 1.2,
    color: colors.noticeText,
    textAlign: 'center',
  },
  noticeLink: {
    fontSize: 8.5,
    lineHeight: 1.2,
    color: colors.complaintLink,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginTop: 2,
    marginBottom: 2,
  },
  footerText: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7.5,
    color: colors.secondary,
    borderTopWidth: 0.5,
    borderTopColor: colors.mediumGray,
    paddingTop: 5,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 30,
    fontSize: 8,
    color: colors.secondary,
  },
});


// --- Component ---
const StatementPDF: React.FC<StatementPDFProps> = ({ section, fileName }) => {

  const numericColumns = ['col5', 'col6', 'col7', 'col8', 'col10']; // Keys for decimal formatting

  // Safely calculate totals within the component
  const safeDebits = formatNumberSafely(section.data?.reduce((sum, row) => sum + formatNumberSafely(row.col5), 0));
  const safeAdjustments = formatNumberSafely(section.data?.reduce((sum, row) => sum + formatNumberSafely(row.col6), 0));
  const safeBalance = formatNumberSafely(section.data?.reduce((sum, row) => sum + formatNumberSafely(row.col7), 0));
  const safeDiscount = formatNumberSafely(section.data?.reduce((sum, row) => sum + formatNumberSafely(row.col10), 0));

  const regularRows = section.data.filter(row => !String(row.col4 || '').toLowerCase().includes('total'));

  return (
    <Document title={`${fileName} - ${section.partyName}`}>
      <Page size="A4" style={styles.page} wrap>

        {/* --- Page Header (First Page Only) --- */}
        <View style={styles.pageHeader}>
           <Text style={styles.generationInfo}>
             Generated: {format(new Date(), "d MMM yyyy, h:mm a")}
           </Text>
          <Text style={styles.companyName}>Sanjivan Medico Traders</Text>
          <Text style={[styles.reportTitle, { fontWeight: 'bold' }]}>Outstanding Statement</Text>
        </View>

        {/* --- Party Information (First Page Only) --- */}
        <View style={styles.partyInfoContainer}>
          <Text style={styles.partyName}>
            {section.partyCode || 'N/A'} - {section.partyName || 'N/A'}
          </Text>
          <View style={styles.partyDetailsLine}>
             {section.location && <Text style={styles.partyDetailItem}>Location: {section.location}</Text>}
             {(section.location) && section.creditDays && <Text style={styles.partyDetailSeparator}>|</Text>}
             {section.creditDays && <Text style={styles.partyDetailItem}>Credit Period: {section.creditDays} days</Text>}
          </View>
        </View>

        {/* --- Table --- */}
        <View style={styles.table}>
          {/* Table Header (Repeats) */}
          <View style={styles.tableHeader} fixed>
            {columnDefinition.map((col, index) => (
              <Text
                key={`header-${col.key}`}
                style={[
                  styles.headerCell, // Base style includes center alignment now
                  // Specific alignment for header text if needed (overrides base)
                  // col.headerAlign === 'left' ? styles.cellAlignLeft : col.headerAlign === 'right' ? styles.cellAlignRight : {},
                  { width: col.width },
                  index === columnDefinition.length - 1 ? styles.headerCellLast : {},
                ]}
              >
                {/* Handle potential newline in header text */}
                {col.header.split('\n').map((line, i) => (
                    <Text key={i}>{line}</Text>
                ))}
              </Text>
            ))}
          </View>

          {/* Table Body */}
          {regularRows.map((row, rowIndex) => (
            <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.tableRowEven : {}]}>
              {columnDefinition.map((col, cellIndex) => {
                let cellValue = row[col.key as keyof ExcelData];
                let displayValue = '';

                // Apply safe formatting to numeric columns
                if (['col5', 'col6', 'col7', 'col8', 'col10'].includes(col.key)) {
                  displayValue = formatNumberSafely(cellValue).toFixed(2);
                } else if (col.key === 'col1') { // Date column
                  // Force numeric parsing for Excel dates which might come as strings
                  const numericValue = typeof cellValue === 'string' ? 
                    parseFloat(cellValue.replace(/,/g, '')) : 
                    typeof cellValue === 'number' ? cellValue : 0;
                  
                  if (!isNaN(numericValue) && numericValue > 0) {
                    // Convert Excel serial date to JS date
                    const baseDate = new Date(Date.UTC(1899, 11, 30));
                    const resultDate = new Date(baseDate.getTime() + (numericValue * 24 * 60 * 60 * 1000));
                    displayValue = format(resultDate, 'd MMM yyyy');
                  } else {
                    displayValue = String(cellValue || '');
                  }
                } else {
                  displayValue = String(cellValue || '');
                }

                return (
                  <Text
                    key={cellIndex}
                    style={[
                      styles.cell,
                      cellIndex === columnDefinition.length - 1 ? styles.cellLast : {},
                      { width: col.width, textAlign: col.align as any }
                    ]}
                  >
                    {displayValue}
                  </Text>
                );
              })}
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.totalRow}>
            {columnDefinition.map((col, cellIndex) => {
              let totalValue = '';
              if (cellIndex === 4) totalValue = 'Total';
              else if (cellIndex === 5) totalValue = safeDebits.toFixed(2);
              else if (cellIndex === 6) totalValue = safeAdjustments.toFixed(2);
              else if (cellIndex === 7) totalValue = safeBalance.toFixed(2);
              else if (cellIndex === 10) totalValue = safeDiscount.toFixed(2);

              return (
                <Text
                  key={cellIndex}
                  style={[
                    styles.cell,
                    styles.boldText, // Make total row bold
                    cellIndex === columnDefinition.length - 1 ? styles.cellLast : {},
                    { width: col.width, textAlign: col.align as any }
                  ]}
                >
                  {totalValue}
                </Text>
              );
            })}
          </View>
        </View>

        {/* --- Summary Section --- */}
        <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.boldText]}>Total Debits:</Text>
                <Text style={[styles.summaryValue, styles.boldText]}>{safeDebits.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Adjustments:</Text>
                <Text style={styles.summaryValue}>{safeAdjustments.toFixed(2)}</Text>
            </View>
             <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.boldText]}>Outstanding Balance:</Text>
                <Text style={[styles.summaryValue, styles.boldText]}>{safeBalance.toFixed(2)}</Text>
            </View>
        </View>

        {/* --- Important Notice --- */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Important Notice</Text>
          <Text style={styles.noticeText}>
            Review the outstanding balance and make a timely payment to ensure uninterrupted service. Process at your earliest convenience.
            {'\n'}
            If you have any concerns or feedback, please use our online complaint form :
            <span style={{ color: colors.complaintLink, textDecoration: 'underline' }}>
              <a href="http://invoice.sanjivanmedicotraders.in/contact-form" target="_blank" rel="noopener noreferrer">Contact Form</a>
            </span> 
          </Text>
          <Text style={styles.noticeLink}>
            http://invoice.sanjivanmedicotraders.in/contact-form
          </Text>
          <Text style={styles.noticeText}>
            Queries/Payments: Ph: +91 9422137362 | Email: info@sanjivanmedico.in | Web: www.sanjivanmedicotraders.in
          </Text>
        </View>

        {/* --- Footer --- */}
        <Text style={styles.footerText} fixed>
          This is a computer-generated statement and does not require a signature. | Sanjivan Medico Traders
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

export default StatementPDF;
