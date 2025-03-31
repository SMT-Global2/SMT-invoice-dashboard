import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { PaymentMethod, ReceiptData } from '@/store/useReceiptStore'; // Assuming this path is correct
import moment from 'moment';

// --- Configuration ---

// Simplified Color Palette (Print-friendly)
const colors = {
  primary: '#1a237e', // Dark Indigo
  secondary: '#5c6bc0', // Medium Indigo
  textPrimary: '#212121', // Almost Black
  textSecondary: '#757575', // Medium Gray
  border: '#e0e0e0', // Light Gray Border
  backgroundLight: '#f5f5f5', // Very Light Gray Background
  white: '#ffffff',
  black: '#000000',
  accentCash: '#4caf50', // Green for Cash emphasis (used sparingly)
  accentCheque: '#ff9800', // Orange for Cheque emphasis (used sparingly)
  accentNone: '#9e9e9e',  // Gray for Other emphasis (used sparingly)
};

// Register Fonts (if needed, ensure fonts are available)
// Font.register({ family: 'Roboto', src: '/path/to/Roboto-Regular.ttf' });
// Font.register({ family: 'Roboto-Bold', src: '/path/to/Roboto-Bold.ttf' });

// --- Styles ---
const styles = StyleSheet.create({
  // --- Page & Layout ---
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 30,
    paddingBottom: 50, // Extra space for footer
    fontFamily: 'Helvetica', // Use registered font like 'Roboto' if available
    fontSize: 9,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: 15,
  },
  // --- Header ---
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  headerLeft: {
    width: '60%',
  },
  headerRight: {
    width: '40%',
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary,
    marginBottom: 2,
  },
  companyName: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reportDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // --- Statistics (Revised) ---
  statsContainer: {
      // No flexDirection here, we'll use rows inside
      padding: 10,
      backgroundColor: colors.backgroundLight,
      borderRadius: 4, // Slightly more rounded
      marginBottom: 20,
      borderWidth: 1, // Add a subtle border
      borderColor: colors.border,
  },
  statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between', // Distribute items evenly
      marginBottom: 8, // Space between rows
  },
  statItem: {
      width: '32%', // Fit 3 items per row with small gaps
      alignItems: 'center',
      paddingVertical: 5, // Add some vertical padding inside item
      // Optional: Add border to each item if you prefer boxes
      // borderWidth: 1,
      // borderColor: colors.border,
      // borderRadius: 2,
      // backgroundColor: colors.white, // If using borders
  },
  statItemLastRow: { // To remove margin from the last row if needed
      width: '32%',
      alignItems: 'center',
      paddingVertical: 5,
  },
  statLabel: {
      fontSize: 8,
      color: colors.textSecondary,
      marginBottom: 3, // Slightly more space
      textTransform: 'uppercase',
      textAlign: 'center', // Ensure label is centered
  },
  statValue: {
      fontSize: 10, // Slightly smaller to fit potentially large amounts
      fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold' if registered
      color: colors.primary,
      textAlign: 'center', // Ensure value is centered
  },
  statValueAmount: { // Specific style for amounts if needed (e.g., different color/size)
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: colors.primary,
      textAlign: 'center',
  },

  // --- User Section ---
  userSectionHeader: {
    marginTop: 15, // Space between users
    padding: 8,
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    breakInside: 'avoid', // Try to keep header with content
  },
  userTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.white,
  },
  userInfo: {
    fontSize: 9,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  userSectionBody: {
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0, // Avoid double border with header
    padding: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  // --- Payment Type Section ---
  paymentTypeContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  paymentTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentTypeIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTypeIconText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
  },
  paymentTypeTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
  },
  // --- Table Styles ---
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 20, // Adjust as needed
    alignItems: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 20, // Adjust as needed
    alignItems: 'stretch', // Ensure cells stretch to row height
    backgroundColor: colors.white, // Ensure clean background for each row
  },
  // Striped rows (optional - uncomment data row style below if needed)
  // tableDataRowStriped: {
  //   backgroundColor: colors.backgroundLight,
  // },
  tableHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    textAlign: 'center',
    color: colors.textPrimary,
    flexGrow: 1, // Allow text wrapping
    flexShrink: 1,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    textAlign: 'left',
    flexGrow: 1,
    flexShrink: 1,
    // Add this to help with vertical alignment if needed
    display: 'flex',
    justifyContent: 'center',
  },
  // Column Widths (adjust percentages as needed)
  colReceipt: { width: '10%' },
  colPartyCode: { width: '10%' },
  colPartyName: { width: '25%' },
  colAmount: { width: '15%', textAlign: 'right' },
  colDate: { width: '12%', textAlign: 'center' },
  colTime: { width: '10%', textAlign: 'center' },
  colRemarks: { width: '18%' },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },

  // --- Cheque Details ---
  chequeDetailsContainer: {
    marginTop: 10,
  },
  chequeGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chequeCard: {
    width: '48%', // Two columns
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    marginBottom: 10,
    backgroundColor: colors.white,
    breakInside: 'avoid', // Try to keep cards intact
  },
  chequeCardHeader: {
    backgroundColor: colors.backgroundLight,
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chequeCardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
  },
  chequeCardBody: {
    padding: 6,
  },
  chequeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  chequeLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    width: '40%',
  },
  chequeValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
    width: '60%',
    textAlign: 'right',
  },
  chequeAmountRow: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chequeAmountLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
  },
  chequeAmountValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary,
  },

  // --- Cash Denominations ---
  cashSummaryContainer: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  cashSummaryTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  denominationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  denominationItem: {
    width: '31%', // Three columns
    padding: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 5,
    backgroundColor: colors.backgroundLight,
  },
  denominationLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  denominationValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  cashTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cashTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
    marginRight: 10,
  },
  cashTotalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary,
  },

  // --- Summary ---
  summaryContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBox: {
    width: '40%',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 3,
    padding: 10,
    backgroundColor: colors.backgroundLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.textPrimary,
  },
  summaryTotalRow: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary,
  },
  summaryTotalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary,
  },

  // --- Footer ---
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    fontSize: 8,
    color: colors.textSecondary,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 5,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 30,
    fontSize: 8,
    color: colors.textSecondary,
  },
});

// --- Helper Functions ---
const formatAmount = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'Rs. 0.00';
    return 'Rs. ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return '*';
    return moment(date).format('DD/MM/YYYY');
};

const formatTime = (date: string | Date | undefined | null): string => {
    if (!date) return '*';
    return moment(date).format('HH:mm');
};

// --- Reusable Components ---

interface ReportHeaderProps {
    formattedDate: string;
    companyName: string;
}
const ReportHeader: React.FC<ReportHeaderProps> = ({ formattedDate, companyName }) => (
    <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
            <Text style={styles.reportTitle}>Daily Receipt Report</Text>
            <Text style={styles.companyName}>{companyName}</Text>
        </View>
        <View style={styles.headerRight}>
            <Text style={styles.reportDate}>Report Date: {formattedDate}</Text>
        </View>
    </View>
);

interface StatisticsProps {
    chequeReceipts: number;
    cashReceipts: number;
    totalReceipts: number;
    cashTotal: number;
    chequeTotal: number;
    totalAmount: number;
}

// --- Updated Statistics Component ---
const Statistics: React.FC<StatisticsProps> = ({
    chequeReceipts,
    cashReceipts,
    totalReceipts,
    cashTotal,
    chequeTotal,
    totalAmount
}) => (
    <View style={styles.statsContainer} wrap={false}>
        {/* Row 1: Counts */}
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cheque Receipts</Text>
                {/* Removed 'Total' for brevity */}
                <Text style={styles.statValue}>{chequeReceipts}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cash Receipts</Text>
                {/* Removed 'Total' for brevity */}
                <Text style={styles.statValue}>{cashReceipts}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Receipts</Text>
                <Text style={styles.statValue}>{totalReceipts}</Text>
            </View>
        </View>

        {/* Row 2: Amounts */}
        {/* Use specific style for last row items if needed, and remove margin from row */}
        <View style={[styles.statsRow, { marginBottom: 0 }]}>
             <View style={styles.statItemLastRow}>
                <Text style={styles.statLabel}>Cheque Amount</Text>
                <Text style={styles.statValueAmount}>{formatAmount(chequeTotal)}</Text>
            </View>
            <View style={styles.statItemLastRow}>
                <Text style={styles.statLabel}>Cash Amount</Text>
                <Text style={styles.statValueAmount}>{formatAmount(cashTotal)}</Text>
            </View>
            <View style={styles.statItemLastRow}>
                <Text style={styles.statLabel}>Total Amount</Text>
                <Text style={styles.statValueAmount}>{formatAmount(totalAmount)}</Text>
            </View>
        </View>
    </View>
);
// --- End Updated Statistics Component ---

interface ReceiptTableProps {
    receipts: ReceiptData[];
}
const ReceiptTable: React.FC<ReceiptTableProps> = ({ receipts }) => (
    <View style={styles.table}>
        {/* Table Header - Keep header from breaking */}
        <View style={styles.tableHeaderRow} wrap={false}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Sr. No.</Text>
            <Text style={[styles.tableHeaderCell, styles.colReceipt]}>Receipt#</Text>
            <Text style={[styles.tableHeaderCell, styles.colPartyCode]}>Party Code</Text>
            <Text style={[styles.tableHeaderCell, styles.colPartyName]}>Party Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount, styles.textRight]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.colRemarks]}>Remarks</Text>
        </View>

        {/* Table Rows - Allow rows to break, but try to keep each row intact */}
        {receipts.map((receipt, index) => (
            <View
                style={[
                    styles.tableDataRow,
                    // index % 2 === 1 ? styles.tableDataRowStriped : {} // Optional: Uncomment for striped rows
                ]}
                key={receipt.id}
                wrap={false} // Try to keep the row content together
            >
                <Text style={[styles.tableCell, styles.colDate, styles.textCenter]}>{receipt.receiptNumber as any === '*' ? '*' : (receipt as any).idx}</Text>
                <Text style={[styles.tableCell, styles.colReceipt, styles.textCenter]}>{receipt.receiptNumber}</Text>
                <Text style={[styles.tableCell, styles.colPartyCode, styles.textCenter]}>{receipt.partyCode}</Text>
                <Text style={[styles.tableCell, styles.colPartyName]}>{receipt.party?.customerName || '*'}</Text>
                <Text style={[styles.tableCell, styles.colAmount, styles.textRight]}>{receipt.amount as any === '*' ? '*' : formatAmount(receipt.amount)}</Text>
                <Text style={[styles.tableCell, styles.colRemarks]}>{receipt.remarks || '-'}</Text>
            </View>
        ))}
    </View>
);

interface ChequeDetailsProps {
    receipts: ReceiptData[];
}
const ChequeDetails: React.FC<ChequeDetailsProps> = ({ receipts }) => {
    const chequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE' && r.cheque);
    if (chequeReceipts.length === 0) return null;

    return (
        <View style={styles.chequeDetailsContainer}>
            {/* Optional Title: <Text style={styles.detailsTitle}>Cheque Details</Text> */}
            <View style={styles.chequeGrid}>
                {chequeReceipts.map((receipt) => (
                    <View style={styles.chequeCard} key={`cheque-${receipt.id}`}>
                        <View style={styles.chequeCardHeader}>
                            <Text style={styles.chequeCardTitle}>Receipt #{receipt.receiptNumber}</Text>
                        </View>
                        <View style={styles.chequeCardBody}>
                            <View style={styles.chequeInfoRow}>
                                <Text style={styles.chequeLabel}>Cheque #:</Text>
                                <Text style={styles.chequeValue}>{receipt.cheque?.number || 'N/A'}</Text>
                            </View>
                            <View style={styles.chequeInfoRow}>
                                <Text style={styles.chequeLabel}>Cheque Date:</Text>
                                <Text style={styles.chequeValue}>{formatDate(receipt.cheque?.date)}</Text>
                            </View>
                            <View style={styles.chequeInfoRow}>
                                <Text style={styles.chequeLabel}>Bank:</Text>
                                <Text style={styles.chequeValue}>{receipt.cheque?.bank || 'N/A'}</Text>
                            </View>
                            <View style={styles.chequeInfoRow}>
                                <Text style={styles.chequeLabel}>Party:</Text>
                                <Text style={styles.chequeValue}>{receipt.party?.customerName || receipt.partyCode}</Text>
                            </View>
                            <View style={styles.chequeAmountRow}>
                                <Text style={styles.chequeAmountLabel}>Amount:</Text>
                                <Text style={styles.chequeAmountValue}>{formatAmount(receipt.cheque?.amount || receipt.amount)}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

interface CashDenominationSummaryProps {
    receipts: ReceiptData[];
}
const CashDenominationSummary: React.FC<CashDenominationSummaryProps> = ({ receipts }) => {
    const cashReceiptsWithBills = receipts.filter(r => r.paymentMethod === 'CASH' && r.currencyBills);
    if (cashReceiptsWithBills.length === 0) return null;

    const denominations = ['500', '200', '100', '50', '20', '10'];
    let totalDenominationAmount = 0;

    const summary = denominations.map(denom => {
        const count = cashReceiptsWithBills.reduce((sum, r) => {
            const bills = r.currencyBills as Record<string, number> | undefined;
            return sum + (bills?.[denom] || 0);
        }, 0);
        const amount = parseInt(denom) * count;
        totalDenominationAmount += amount;
        return { denom, count, amount };
    }).filter(item => item.count > 0); // Only show denominations with counts

    if (summary.length === 0) return null; // Don't show if no counts entered

    return (
        <View style={styles.cashSummaryContainer}>
            <Text style={styles.cashSummaryTitle}>Cash Denomination Summary</Text>
            <View style={styles.denominationGrid}>
                {summary.map(({ denom, count, amount }) => (
                    <View key={denom} style={styles.denominationItem}>
                        <Text style={styles.denominationLabel}>{denom} x {count}</Text>
                        <Text style={styles.denominationValue}>{formatAmount(amount)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

interface PaymentTypeSectionProps {
    title: string;
    iconBgColor: string;
    receipts: ReceiptData[];
    children?: React.ReactNode; // For additional details like Cheque/Cash summary
}
const PaymentTypeSection: React.FC<PaymentTypeSectionProps> = ({ title, iconBgColor, receipts, children }) => {
    if (receipts.length === 0) return null;

    const total = receipts.reduce((sum, r) => sum + r.amount, 0);

    return (
        <View style={styles.paymentTypeContainer}>
            <ReceiptTable receipts={receipts} />
            {children}
        </View>
    );
};

interface UserSectionProps {
    username: string;
    receipts: ReceiptData[];
    isFirstUser: boolean;
}
const UserSection: React.FC<UserSectionProps> = ({ username, receipts, isFirstUser }) => {
    const userTotalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

    const functionThatHandlesTheBlankRangesBetweenReceiptNumbers = (receipts: ReceiptData[] , paymentMethod : PaymentMethod) => {
        if(receipts.length === 0) return [];
        let idx = 1;
        const changedReceipts : any[] = [];
        for(let i = 0; i < receipts.length; i++) {
          if(i - 1 > 0 && receipts[i].receiptNumber !== receipts[i-1].receiptNumber + 1) {
            changedReceipts.push({
              receiptNumber : '*',
              amount : '*',
              paymentMethod : paymentMethod,
              currencyBills : '*',
              cheque : '*',
              remarks : '*',
              partyCode : '*',
              createdAt : '*',
              updatedAt : '*',
            })
            
          }
          changedReceipts.push({...receipts[i] , idx : idx});
          idx++;
        }
        return changedReceipts;
    }

    const userCashReceipts = receipts.filter(r => r.paymentMethod === 'CASH');
    const userChequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE');

    return (
        // Add 'break' prop to View for page break *before* this section if it's not the first one
        <View break={!isFirstUser}>
            <View style={styles.userSectionHeader}>
                <Text style={styles.userTitle}>Receipts by: {username}</Text>
                <Text style={styles.userInfo}>
                    Total Receipts: {receipts.length} | Total Amount: {formatAmount(userTotalAmount)}
                </Text>
            </View>
            <View style={styles.userSectionBody}>
                <PaymentTypeSection
                    title="Cheque Payments"
                    iconBgColor={colors.accentCheque}
                    receipts={functionThatHandlesTheBlankRangesBetweenReceiptNumbers(userChequeReceipts , 'CHEQUE')}
                >
                    <ChequeDetails receipts={userChequeReceipts} />
                </PaymentTypeSection>

                <PaymentTypeSection
                    title="Cash Payments"
                    iconBgColor={colors.accentCash}
                    receipts={functionThatHandlesTheBlankRangesBetweenReceiptNumbers(userCashReceipts , 'CASH')}
                >
                    <CashDenominationSummary receipts={userCashReceipts} />
                </PaymentTypeSection>
            </View>
        </View>
    );
};

interface ReportFooterProps {
    companyName: string;
}
const ReportFooter: React.FC<ReportFooterProps> = ({ companyName }) => (
    <>
        <Text style={styles.footer} fixed>
            {companyName} | Generated on {moment().format('MMMM D, YYYY, h:mm A')} | This is an automatically generated report.
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} / ${totalPages}`
        )} fixed />
    </>
);

// --- Main PDF Document Component ---
interface ReceiptPDFProps {
    receipts: ReceiptData[];
    date: string;
    companyName?: string; // Optional: Pass company name as prop
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipts, date, companyName = "SMT Enterprises" }) => {
    const formattedDate = moment(date).format('MMMM D, YYYY');

    // Group receipts by username
    const groupedReceipts = receipts.reduce((acc, receipt) => {
        const username = receipt.receiptUsername || 'Unassigned';
        if (!acc[username]) {
            acc[username] = [];
        }
        acc[username].push(receipt);
        return acc;
    }, {} as Record<string, ReceiptData[]>);

    // Calculate overall statistics
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const cashReceipts = receipts.filter(r => r.paymentMethod === 'CASH');
    const chequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE');
    const cashTotal = cashReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const chequeTotal = chequeReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);


    return (
        <Document title={`Daily Receipt Report - ${formattedDate}`}>
            <Page size="A4" style={styles.page}>
                {/* Fixed Header */}
                <ReportHeader formattedDate={formattedDate} companyName={companyName} />

                {/* Overall Statistics (Uses Updated Component/Styles) */}
                <Statistics
                    chequeReceipts={chequeReceipts.length}
                    cashReceipts={cashReceipts.length}
                    totalReceipts={receipts.length}
                    cashTotal={cashTotal}
                    chequeTotal={chequeTotal}
                    totalAmount={totalAmount}
                />

                {/* Receipts by User Sections */}
                {Object.entries(groupedReceipts).map(([username, userReceipts], index) => (
                    <UserSection
                      key={username}
                      username={username}
                      receipts={userReceipts}
                      isFirstUser={index === 0} // Pass flag to control page break
                    />
                ))}

                {/* Fixed Footer */}
                <ReportFooter companyName={companyName} />
            </Page>
        </Document>
    );
};

export default ReceiptPDF;