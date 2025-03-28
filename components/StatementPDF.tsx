import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Party, Statement } from '@/lib/statement-service';
import moment from 'moment';

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: '40 30',
    paddingTop: 40,
    fontFamily: 'Helvetica',
    position: 'relative',
    minHeight: '100%',
  },
  companyHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a365d',
    borderBottom: '2pt solid #4299e1',
    paddingBottom: 15,
    position: 'relative',
  },
  companyLogo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 100,
    color: '#f0f7ff',
    opacity: 0.3,
    zIndex: -1,
  },
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottom: '1pt solid #e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2d3748',
  },
  subTitle: {
    fontSize: 10,
    marginBottom: 4,
    color: '#4a5568',
  },
  generatedInfo: {
    fontSize: 8,
    color: '#718096',
    marginTop: 8,
    fontStyle: 'italic',
  },
  partyInfo: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderRadius: 6,
    borderLeft: '4pt solid #4299e1',
  },
  partyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#2c5282',
  },
  partyDetails: {
    fontSize: 9,
    color: '#4a5568',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableContainer: {
    marginTop: 15,
    flexGrow: 1,
    marginBottom: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  table: {
    display: 'flex',
    width: 'auto',
  },
  tableHeaderRow: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: '#2c5282',
    width: '100%',
    borderBottom: '2pt solid #90cdf4',
  },
  headerCell: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    fontSize: 9,
    fontWeight: 'bold',
    padding: '6 4',
    textAlign: 'center',
    color: '#ffffff',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    minHeight: 28,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  alternateRow: {
    backgroundColor: '#f8fafc',
  },
  tableFooterRow: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    fontWeight: 'bold',
    width: '100%',
    borderTop: '2pt solid #90cdf4',
    borderBottom: '1pt solid #e2e8f0',
  },
  // Column styles with consistent borders
  tableColDC: {
    width: '4%',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColDate: {
    width: '10%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColVoucher: {
    width: '12%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColAmount: {
    width: '12%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColDays: {
    width: '6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColNarration: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 1,
  },
  tableCell: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    fontSize: 8,
    padding: '3 4',
    textAlign: 'center',
    color: '#2d3748',
  },
  tableCellRight: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginRight: 4,
    fontSize: 8,
    padding: '3 4',
    textAlign: 'right',
    color: '#2d3748',
  },
  tableCellLeft: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginLeft: 4,
    fontSize: 8,
    padding: '2 4',
    textAlign: 'left',
  },
  footerCell: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    fontSize: 8,
    fontWeight: 'bold',
    padding: '3 4',
    textAlign: 'center',
  },
  footerCellRight: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginRight: 4,
    fontSize: 8,
    fontWeight: 'bold',
    padding: '3 4',
    textAlign: 'right',
  },
  footerCellLeft: {
    margin: 2,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginLeft: 4,
    fontSize: 8,
    fontWeight: 'bold',
    padding: '3 4',
    textAlign: 'left',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: 'grey',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#718096',
    fontStyle: 'italic',
    backgroundColor: '#f7fafc',
    padding: '4 0',
  },
  totalSection: {
    marginTop: 25,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderTop: '2pt solid #90cdf4',
    borderBottom: '2pt solid #90cdf4',
    position: 'relative',
  },
  totalSectionTitle: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#2c5282',
    color: '#ffffff',
    padding: '4 12',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
    alignItems: 'center',
    paddingRight: 10,
  },
  totalLabel: {
    width: 140,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2d3748',
    marginRight: 10,
  },
  totalValue: {
    width: 120,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2c5282',
    backgroundColor: '#ebf8ff',
    padding: '4 8',
    borderRadius: 4,
  },
  paymentNote: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff8f1',
    borderRadius: 8,
    borderLeft: '4pt solid #ed8936',
  },
  paymentNoteTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c05621',
    marginBottom: 8,
  },
  paymentNoteText: {
    fontSize: 9,
    color: '#2d3748',
    lineHeight: 1.4,
  },
  paymentDetails: {
    marginTop: 10,
    fontSize: 9,
    color: '#4a5568',
  },
});

type StatementPDFProps = {
  party: Party;
  statement: Statement;
};

const StatementPDF: React.FC<StatementPDFProps> = ({ party, statement }) => {
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get party code without any dash prefix
  const displayPartyCode = party.partyCode.startsWith('-') 
    ? party.partyCode.substring(1).trim() 
    : party.partyCode;

  // Calculate the max entries per page (accounting for header, party info, summary)
  // This helps ensure rows don't split across pages
  const entriesPerPage = 20;
  
  // Split entries into pages
  const getPageEntries = () => {
    let pages = [];
    let remaining = [...party.entries];
    
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, entriesPerPage));
      remaining = remaining.slice(entriesPerPage);
    }
    
    return pages;
  };
  
  const pageEntries = getPageEntries();

  return (
    <Document>
      {pageEntries.map((entries, pageIndex) => (
        <Page size="A4" style={styles.page} key={`page-${pageIndex}`} wrap={false}>
          {/* Company Header and Details (only on first page) */}
          {pageIndex === 0 && (
            <>
              <View style={styles.companyHeader}>
                <Text>Sanjeevan Medico Traders</Text>
              </View>
              
              <View style={styles.header}>
                <Text style={styles.title}>Outstanding Statement Report</Text>
                <Text style={styles.subTitle}>Report Date: {statement.reportDate}</Text>
                <Text style={styles.subTitle}>Statement: {statement.name}</Text>
                <Text style={styles.generatedInfo}>Generated on {moment().format('MMMM D, YYYY, h:mm A')}</Text>
              </View>
              
              <View style={styles.partyInfo}>
                <Text style={styles.partyName}>{displayPartyCode} {party.partyName}</Text>
                <View style={styles.partyDetails}>
                  <Text>{party.contactInfo && `Contact: ${party.contactInfo}`}</Text>
                  <Text>{party.creditDays && `Credit Days: ${party.creditDays}`}</Text>
                </View>
              </View>
            </>
          )}
          
          {/* Table */}
          <View style={styles.tableContainer}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <View style={styles.tableColDC}>
                  <Text style={styles.headerCell}>DC</Text>
                </View>
                <View style={styles.tableColDate}>
                  <Text style={styles.headerCell}>Voucher Date</Text>
                </View>
                <View style={styles.tableColVoucher}>
                  <Text style={styles.headerCell}>Voucher Number</Text>
                </View>
                <View style={styles.tableColAmount}>
                  <Text style={styles.headerCell}>Debits</Text>
                </View>
                <View style={styles.tableColAmount}>
                  <Text style={styles.headerCell}>Part Adj.</Text>
                </View>
                <View style={styles.tableColAmount}>
                  <Text style={styles.headerCell}>Balance</Text>
                </View>
                <View style={styles.tableColAmount}>
                  <Text style={styles.headerCell}>Balance C/F</Text>
                </View>
                <View style={styles.tableColDays}>
                  <Text style={styles.headerCell}>Days</Text>
                </View>
                <View style={styles.tableColNarration}>
                  <Text style={styles.headerCell}>Discount Narration</Text>
                </View>
              </View>
              
              {/* Table Body with alternating rows */}
              {entries.map((entry, index) => (
                <View 
                  style={[
                    styles.tableRow,
                    index % 2 === 1 ? styles.alternateRow : styles.tableRow
                  ]} 
                  key={index}
                >
                  <View style={styles.tableColDC}>
                    <Text style={styles.tableCell}>{entry.dc}</Text>
                  </View>
                  <View style={styles.tableColDate}>
                    <Text style={styles.tableCell}>{entry.voucherDate}</Text>
                  </View>
                  <View style={styles.tableColVoucher}>
                    <Text style={styles.tableCell}>{entry.voucherNumber ? `${entry.dc} ${entry.voucherNumber}` : '*'}</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.tableCellRight}>{formatCurrency(entry.debits)}</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.tableCellRight}>
                      {entry.partAdjustment === 0 ? '-' : formatCurrency(entry.partAdjustment)}
                    </Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.tableCellRight}>{formatCurrency(entry.balance)}</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.tableCellRight}>{formatCurrency(entry.balanceCarryForward)}</Text>
                  </View>
                  <View style={styles.tableColDays}>
                    <Text style={styles.tableCell}>{entry.days}</Text>
                  </View>
                  <View style={styles.tableColNarration}>
                    <Text style={styles.tableCellLeft}>{entry.discountNarration}</Text>
                  </View>
                </View>
              ))}
              
              {/* Table Footer - Totals (only on last page) */}
              {pageIndex === pageEntries.length - 1 && party.total && (
                <View style={styles.tableFooterRow}>
                  <View style={styles.tableColDC}>
                    <Text style={styles.footerCell}></Text>
                  </View>
                  <View style={styles.tableColDate}>
                    <Text style={styles.footerCell}></Text>
                  </View>
                  <View style={styles.tableColVoucher}>
                    <Text style={styles.footerCell}>Total</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.footerCellRight}>{formatCurrency(party.total.debits)}</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.footerCellRight}>
                      {party.total.partAdjustment === 0 ? '-' : formatCurrency(party.total.partAdjustment)}
                    </Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.footerCellRight}>{formatCurrency(party.total.balance)}</Text>
                  </View>
                  <View style={styles.tableColAmount}>
                    <Text style={styles.footerCell}></Text>
                  </View>
                  <View style={styles.tableColDays}>
                    <Text style={styles.footerCell}></Text>
                  </View>
                  <View style={styles.tableColNarration}>
                    <Text style={styles.footerCellLeft}>{party.total.discountNarration}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
          
          {/* Summary Section with enhanced styling */}
          {pageIndex === pageEntries.length - 1 && party.total && (
            <>
              <View style={styles.totalSection}>
                <Text style={styles.totalSectionTitle}>Summary</Text>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Debits</Text>
                  <Text style={styles.totalValue}>₹ {formatCurrency(party.total.debits)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Adjustments</Text>
                  <Text style={styles.totalValue}>
                    ₹ {party.total.partAdjustment === 0 ? '0.00' : formatCurrency(party.total.partAdjustment)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Outstanding Balance</Text>
                  <Text style={styles.totalValue}>₹ {formatCurrency(party.total.balance)}</Text>
                </View>
              </View>

              {/* Payment Reminder Note */}
              <View style={styles.paymentNote}>
                <Text style={styles.paymentNoteTitle}>Important Notice</Text>
                <Text style={styles.paymentNoteText}>
                  We value our business relationship and would like to kindly remind you about the outstanding balance detailed above. 
                  Timely payments help us maintain uninterrupted service and support to valued partners like you. 
                  Please process the payment at your earliest convenience.
                </Text>
                <Text style={styles.paymentDetails}>
                  For any queries regarding this statement or to discuss payment arrangements, 
                  please contact us at +91 94221 37362, mail us at info@sanjivanmedico.in or visit our website at www.sanjivanmedicotraders.in
                </Text>
              </View>
            </>
          )} 
          
          {/* Page Number with maintained A4 size */}
          <View style={styles.pageNumber}>
            <Text>Page {pageIndex + 1} of {pageEntries.length}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default StatementPDF; 