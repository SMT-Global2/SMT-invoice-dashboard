import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { PaymentMethod, ReceiptData } from '@/store/useReceiptStore'; // Assuming this path is correct
import moment from 'moment';
import { Image } from '@react-pdf/renderer'; // Added Image import

// --- Configuration ---

// Simplified Color Palette (Print-friendly)
const colors = {
  primary: '#1a237e', // Dark Indigo
  secondary: '#5c6bc0', // Medium Indigo (Original user section header background)
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

  // --- User Section (MODIFIED FOR LESS INK) ---
  userSectionHeader: {
    marginTop: 15, // Space between users
    paddingVertical: 5, // Adjusted padding
    paddingHorizontal: 8,
    backgroundColor: colors.white, // Use white background
    borderBottomWidth: 1.5, // Add a border for separation
    borderBottomColor: colors.primary, // Use primary color for border
    // Removed border radius as background is gone
    breakInside: 'avoid', // Try to keep header with content
    marginBottom: 0, // Remove margin if body border provides separation
  },
  userTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold', // Use 'Roboto-Bold'
    color: colors.primary, // Use dark text color
  },
  userInfo: {
    fontSize: 9,
    color: colors.textSecondary, // Use secondary text color
    // Removed opacity
    marginTop: 2,
  },
  userSectionBody: {
    borderWidth: 1,
    borderColor: colors.border,
    // borderTopWidth: 0, // Keep this if header border is enough separation, or set to 1 if needed
    borderTopWidth: 0, // Removed top border since header now has bottom border
    padding: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderTopLeftRadius: 0, // Removed radius matching the header change
    borderTopRightRadius: 0, // Removed radius matching the header change
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
                key={receipt.id || `receipt-${index}`} // Added fallback key
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
                                <Text style={styles.chequeValue}>{receipt.party?.customerName || 'N/A'}</Text>
                            </View>
                            <View style={styles.chequeInfoRow}>
                                <Text style={styles.chequeLabel}>Party Code:</Text>
                                <Text style={styles.chequeValue}>{receipt.party?.code}</Text>
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

    const denominations = ['500', '200', '100', '50', '20', '10']; // Add more if needed
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
             {/* Optional: Show total from denominations if needed */}
             {/* <View style={styles.cashTotalRow}>
                 <Text style={styles.cashTotalLabel}>Denomination Total:</Text>
                 <Text style={styles.cashTotalValue}>{formatAmount(totalDenominationAmount)}</Text>
             </View> */}
        </View>
    );
};


interface PaymentTypeSectionProps {
    title: string;
    iconBgColor: string; // Not currently used, but kept for potential future use
    receipts: ReceiptData[];
    children?: React.ReactNode; // For additional details like Cheque/Cash summary
}
const PaymentTypeSection: React.FC<PaymentTypeSectionProps> = ({ title, iconBgColor, receipts, children }) => {
    if (receipts.length === 0) return null;

    // No separate header for payment type needed inside user section body
    // const total = receipts.reduce((sum, r) => sum + r.amount, 0);

    return (
        <View style={styles.paymentTypeContainer}>
            {/* Optional: Add a simple text title if needed */}
            {/* <Text style={styles.paymentTypeTitle}>{title}</Text> */}
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
    const userTotalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0); // Added fallback for amount

    const functionThatHandlesTheBlankRangesBetweenReceiptNumbers = (receipts: ReceiptData[] , paymentMethod : PaymentMethod) => {
        if (!receipts || receipts.length === 0) return []; // Added null/empty check

        // Ensure receipts are sorted by receiptNumber if they aren't already
        const sortedReceipts = [...receipts].sort((a, b) => (a.receiptNumber || 0) - (b.receiptNumber || 0));

        let idx = 1;
        const changedReceipts : any[] = [];
        for(let i = 0; i < sortedReceipts.length; i++) {
          // Check for gap only if not the first receipt and previous receipt exists
          if(i > 0 && sortedReceipts[i-1] && sortedReceipts[i].receiptNumber !== (sortedReceipts[i-1].receiptNumber || 0) + 1) {
            // Add a placeholder for the gap
            changedReceipts.push({
              id: `gap-${paymentMethod}-${i}`, // Unique key for gap
              receiptNumber : '*',
              amount : '*',
              paymentMethod : paymentMethod,
              currencyBills : null, // Use null instead of '*' for consistency
              cheque : null,
              remarks : '*', // More descriptive remark
              partyCode : '*',
              party: { customerName: '*' }, // Add party structure
              createdAt : null,
              updatedAt : null,
              idx: '*' // Indicate non-sequential
            });
            idx++; // Increment index for the gap row itself
          }
          // Add the actual receipt
          changedReceipts.push({...sortedReceipts[i] , idx : idx});
          idx++;
        }
        return changedReceipts;
    }

    const userCashReceipts = receipts.filter(r => r.paymentMethod === 'CASH');
    const userChequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE');

    // Only render the section if there are receipts for this user
    if (receipts.length === 0) {
        return null;
    }

    return (
        // Add 'break' prop to View for page break *before* this section if it's not the first one
        <View break={!isFirstUser}>
            {/* --- USER SECTION HEADER (Uses modified styles) --- */}
            <View style={styles.userSectionHeader}>
                <Text style={styles.userTitle}>Receipts by: {username}</Text>
                <Text style={styles.userInfo}>
                    Total Receipts: {receipts.length} | Total Amount: {formatAmount(userTotalAmount)}
                </Text>
            </View>
            {/* --- END USER SECTION HEADER --- */}

            <View style={styles.userSectionBody}>
                {/* Cheque Section */}
                {userChequeReceipts.length > 0 && (
                    <PaymentTypeSection
                        title="Cheque Payments" // Title not displayed by default in current setup
                        iconBgColor={colors.accentCheque} // Not used by default
                        receipts={userChequeReceipts}
                    >
                        <ChequeDetails receipts={userChequeReceipts} />
                    </PaymentTypeSection>
                )}

                 {/* Cash Section */}
                {userCashReceipts.length > 0 && (
                    <PaymentTypeSection
                        title="Cash Payments" // Title not displayed by default
                        iconBgColor={colors.accentCash} // Not used by default
                        receipts={functionThatHandlesTheBlankRangesBetweenReceiptNumbers(userCashReceipts , 'CASH')}
                    >
                        <CashDenominationSummary receipts={userCashReceipts} />
                    </PaymentTypeSection>
                )}

                 {/* Add message if user has receipts but neither cash nor cheque (unlikely but possible) */}
                 {userCashReceipts.length === 0 && userChequeReceipts.length === 0 && receipts.length > 0 && (
                     <Text style={{ fontSize: 9, color: colors.textSecondary, textAlign: 'center', padding: 10 }}>
                         No cash or cheque receipts found for this user (check payment methods).
                     </Text>
                 )}
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

// --- Statement Images Section Component ---
interface StatementImage {
    imageUrl: string;
    medicalName: string;
    userName: string;
    partyCode: string;
    location?: string;
    contact?: string;
    statementFileName?: string; // Add statement file name
}

interface StatementImagesSectionProps {
    images: StatementImage[];
}

const StatementImagesSection: React.FC<StatementImagesSectionProps> = ({ images }) => {
    // Calculate images per row (4 images per row for A4 optimization)
    const imagesPerRow = 4; // Changed from 3 to 4
    const imageWidth = 110; // Reduced width to fit 4 images with spacing
    const imageHeight = 85; // Reduced height to fit 5 rows
    const spacing = 12; // Reduced spacing between images
    
    // Group images into rows
    const imageRows = [];
    for (let i = 0; i < images.length; i += imagesPerRow) {
        imageRows.push(images.slice(i, i + imagesPerRow));
    }

    return (
        <View style={{ marginTop: 0, marginBottom: 10 }}> {/* Removed top margin to start from page beginning */}
            {/* Section Header */}
            <View style={{ 
                backgroundColor: colors.primary, 
                padding: 6, // Reduced padding
                marginBottom: 10, // Reduced margin
                borderRadius: 4
            }}>
                <Text style={{ 
                    color: colors.white, 
                    fontSize: 12, // Reduced font size
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    Statement Images - {images.length} Total
                </Text>
            </View>

            {/* Images Grid */}
            {imageRows.map((row, rowIndex) => (
                <View key={rowIndex} style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    marginBottom: 12 // Reduced margin to fit 5 rows
                }} wrap={false}>
                    {row.map((image, imageIndex) => (
                        <View key={imageIndex} style={{ 
                            width: imageWidth,
                            alignItems: 'center'
                        }}>
                            {/* Image */}
                            <Image 
                                src={image.imageUrl} 
                                style={{ 
                                    width: imageWidth, 
                                    height: imageHeight,
                                    objectFit: 'contain',
                                    borderRadius: 3, // Reduced border radius
                                    border: `1px solid ${colors.border}`
                                }} 
                            />
                            
                            {/* Medical Name with Code in parentheses */}
                            <Text style={{ 
                                fontSize: 7, // Reduced font size for 4 columns
                                fontWeight: 'bold',
                                color: colors.textPrimary,
                                textAlign: 'center',
                                marginTop: 2, // Reduced margin
                                maxWidth: imageWidth - 6,
                                lineHeight: 1.0
                            }}>
                                {image.medicalName} ({image.partyCode})
                            </Text>
                            
                            {/* File name and username in one line */}
                            <Text style={{ 
                                fontSize: 6, // Reduced font size for 4 columns
                                color: colors.textSecondary,
                                textAlign: 'center',
                                marginTop: 1, // Reduced margin
                                maxWidth: imageWidth - 6,
                                lineHeight: 1.0
                            }}>
                                {image.statementFileName || 'Unknown'}; By: {image.userName}
                            </Text>
                        </View>
                    ))}
                    
                    {/* Fill empty spaces in the last row */}
                    {row.length < imagesPerRow && 
                        Array.from({ length: imagesPerRow - row.length }).map((_, index) => (
                            <View key={`empty-${index}`} style={{ width: imageWidth }} />
                        ))
                    }
                </View>
            ))}
        </View>
    );
};

// --- Main PDF Document Component ---
interface ReceiptPDFProps {
    receipts: ReceiptData[];
    date: string;
    companyName?: string; // Optional: Pass company name as prop
    statementImages?: Array<{
        images: string[];
        medicalName: string;
        userName: string;
        partyCode: string;
        location?: string;
        contact?: string;
        statementFileName?: string;
    }>;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipts = [], date, companyName = "Sanjivan Medico Traders", statementImages = [] }) => { // Added default empty array for receipts
    const formattedDate = moment(date).format('MMMM D, YYYY');

    // Group receipts by username
    const groupedReceipts = receipts.reduce((acc, receipt) => {
        // Handle potential null/undefined username
        const username = receipt.receiptUsername || 'Unassigned';
        if (!acc[username]) {
            acc[username] = [];
        }
        acc[username].push(receipt);
        return acc;
    }, {} as Record<string, ReceiptData[]>);

    // Calculate overall statistics
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0); // Added fallback
    const cashReceipts = receipts.filter(r => r.paymentMethod === 'CASH');
    const chequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE');
    const cashTotal = cashReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0); // Added fallback
    const chequeTotal = chequeReceipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0); // Added fallback

    // Flatten all statement images for display
    const allStatementImages = statementImages.flatMap(section => 
        section.images.map(imageUrl => ({
            imageUrl,
            medicalName: section.medicalName,
            userName: section.userName,
            partyCode: section.partyCode,
            location: section.location,
            contact: section.contact,
            statementFileName: section.statementFileName
        }))
    );

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

                 {/* Message if no receipts found at all */}
                {receipts.length === 0 && (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                            No receipts found for this date.
                        </Text>
                    </View>
                )}

                {/* Statement Images Section */}
                {allStatementImages.length > 0 && (
                    <View style={{ marginTop: 0 }} break={true}>
                        <StatementImagesSection images={allStatementImages} />
                    </View>
                )}

                {/* Fixed Footer */}
                <ReportFooter companyName={companyName} />
            </Page>
        </Document>
    );
};

export default ReceiptPDF;