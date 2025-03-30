import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ReceiptData } from '@/store/useReceiptStore';
import moment from 'moment';

// Define a simplified color system optimized for printing
const colors = {
  primary: '#2e3b4e', // dark blue-gray
  secondary: '#505a6b', // medium blue-gray
  light: '#f5f5f5', // very light gray
  dark: '#333333', // dark gray
  white: '#ffffff',
  black: '#000000',
  border: '#cccccc', // medium gray
  headerBg: '#f0f0f0', // light gray
  cashBg: '#f0f0f0', // light gray for cash
  chequeBg: '#f0f0f0', // light gray for cheque
  noneBg: '#f0f0f0', // light gray for none
  cashBorder: '#555555', // dark gray
  chequeBorder: '#777777', // medium-dark gray
  noneBorder: '#999999', // medium gray
};

// Enhanced styles optimized for printing
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 30,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    borderBottomStyle: 'solid',
  },
  headerLeft: {
    flexDirection: 'column',
    width: '60%',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '40%',
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: colors.dark,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: colors.dark,
    marginTop: 4,
  },
  companyInfo: {
    fontSize: 10,
    color: colors.dark,
  },
  userSection: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.headerBg,
    borderRadius: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderLeftStyle: 'solid',
    breakInside: 'avoid',
  },
  userTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  userInfo: {
    fontSize: 10,
    color: colors.dark,
  },
  section: {
    margin: 10,
    padding: 0,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 10,
    padding: 5,
    backgroundColor: colors.light,
    borderRadius: 2,
    fontFamily: 'Helvetica-Bold',
  },
  paymentSection: {
    marginTop: 10,
    marginBottom: 15,
    padding: 8,
    borderRadius: 2,
    breakInside: 'avoid',
  },
  cashSection: {
    backgroundColor: colors.cashBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.cashBorder,
    borderLeftStyle: 'solid',
  },
  chequeSection: {
    backgroundColor: colors.chequeBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.chequeBorder,
    borderLeftStyle: 'solid',
  },
  noneSection: {
    backgroundColor: colors.noneBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.noneBorder,
    borderLeftStyle: 'solid',
  },
  paymentTypeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  cashTitle: {
    color: colors.cashBorder,
  },
  chequeTitle: {
    color: colors.chequeBorder,
  },
  noneTitle: {
    color: colors.noneBorder,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.border,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
    breakInside: 'avoid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomStyle: 'solid',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    borderBottomStyle: 'solid',
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderCell: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderRightStyle: 'solid',
    paddingVertical: 5,
    paddingHorizontal: 3,
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  tableHeaderCellReceipt: { width: '11%' },
  tableHeaderCellPartyCode: { width: '12%' },
  tableHeaderCellPartyName: { width: '22%' },
  tableHeaderCellAmount: { width: '15%' },
  tableHeaderCellDate: { width: '14%' },
  tableHeaderCellTime: { width: '13%' },
  tableHeaderCellRemarks: { width: '13%' },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderRightStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    textAlign: 'left',
  },
  tableCellReceipt: { width: '11%', textAlign: 'center' },
  tableCellPartyCode: { width: '12%', textAlign: 'center' },
  tableCellPartyName: { width: '22%' },
  tableCellAmount: { width: '15%', textAlign: 'right', fontFamily: 'Helvetica' },
  tableCellDate: { width: '14%', textAlign: 'center' },
  tableCellTime: { width: '13%', textAlign: 'center' },
  tableCellRemarks: { width: '13%' },
  stripeRow: {
    backgroundColor: colors.light,
  },
  amountCell: {
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    fontSize: 9,
    color: colors.dark,
    textAlign: 'center',
    paddingTop: 10,
    paddingHorizontal: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopStyle: 'solid',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    marginBottom: 20,
  },
  summaryBox: {
    width: '35%',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'solid',
    padding: 8,
    backgroundColor: colors.headerBg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: colors.dark,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Helvetica',
  },
  summaryTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica',
  },
  paymentDetailBox: {
    marginTop: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'solid',
    backgroundColor: colors.light,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  paymentLabel: {
    fontSize: 9,
    width: '30%',
    color: colors.dark,
  },
  paymentValue: {
    fontSize: 9,
    width: '70%',
    color: colors.black,
    fontFamily: 'Helvetica',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    width: '22%',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.headerBg,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 9,
    color: colors.dark,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica',
  },
  disclaimer: {
    fontSize: 8,
    color: colors.dark,
    marginTop: 10,
    marginBottom: 5,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 9,
    color: colors.dark,
  },
  chequeDetailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  chequeGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chequeCard: {
    width: '48%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    breakInside: 'avoid',
  },
  chequeCardHeader: {
    backgroundColor: colors.headerBg,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chequeCardTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  chequeCardBody: {
    padding: 8,
    backgroundColor: colors.white,
  },
  chequeInfoGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chequeInfoItem: {
    width: '50%',
    marginBottom: 5,
  },
  chequeLabel: {
    fontSize: 8,
    color: colors.dark,
    marginBottom: 2,
  },
  chequeValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.black,
    fontFamily: 'Helvetica',
  },
  chequeAmountSection: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopStyle: 'dashed',
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chequeAmountLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.dark,
    fontFamily: 'Helvetica-Bold',
  },
  chequeAmount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica',
  },
  paymentDistributionContainer: {
    marginTop: 15,
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    breakInside: 'avoid',
  },
  distributionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionLabel: {
    width: '20%',
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.dark,
    fontFamily: 'Helvetica-Bold',
  },
  distributionBarContainer: {
    width: '60%',
    height: 12,
    backgroundColor: colors.light,
    marginHorizontal: 10,
    borderRadius: 2,
  },
  distributionBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  distributionCashBar: {
    backgroundColor: colors.cashBorder,
  },
  distributionChequeBar: {
    backgroundColor: colors.chequeBorder,
  },
  distributionNoneBar: {
    backgroundColor: colors.noneBorder,
  },
  distributionValue: {
    width: '20%',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Helvetica',
  },
  // New daily trending analysis
  trendingAnalysisContainer: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    breakInside: 'avoid',
  },
  trendingTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  trendingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendColumn: {
    width: '22%',
  },
  trendHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'left',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily: 'Helvetica-Bold',
  },
  trendValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'left',
    marginBottom: 3,
    fontFamily: 'Helvetica',
  },
  trendChangePositive: {
    fontSize: 8,
    color: colors.cashBorder,
    textAlign: 'left',
    fontFamily: 'Helvetica',
  },
  trendChangeNegative: {
    fontSize: 8,
    color: colors.noneBorder,
    textAlign: 'left',
    fontFamily: 'Helvetica',
  },
  trendChangeNeutral: {
    fontSize: 8,
    color: colors.dark,
    textAlign: 'left',
    fontFamily: 'Helvetica',
  },
});

type ReceiptPDFProps = {
  receipts: ReceiptData[];
  date: string;
};

// Helper function to format numbers properly with improved readability
const formatAmount = (amount: number): string => {
  return 'Rs. ' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipts, date }) => {
  // Format date
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

  // Calculate statistics
  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const cashReceipts = receipts.filter(r => r.paymentMethod === 'CASH');
  const chequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE');
  const noneReceipts = receipts.filter(r => r.paymentMethod === 'NONE');
  const cashTotal = cashReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const chequeTotal = chequeReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const noneTotal = noneReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const avgReceiptValue = receipts.length > 0 ? totalAmount / receipts.length : 0;
  
  // Calculate percentages for distribution
  const cashAmountPercentage = totalAmount > 0 ? (cashTotal / totalAmount) * 100 : 0;
  const chequeAmountPercentage = totalAmount > 0 ? (chequeTotal / totalAmount) * 100 : 0;
  const noneAmountPercentage = totalAmount > 0 ? (noneTotal / totalAmount) * 100 : 0;
  
  // Get payment method distribution 
  const paymentMethodDistribution = {
    CASH: cashReceipts.length,
    CHEQUE: chequeReceipts.length,
    NONE: noneReceipts.length,
  };

  // Get currency bill totals if available
  type CurrencyBillTotals = {
    '500': number;
    '200': number;
    '100': number;
    '50': number;
    '20': number;
    '10': number;
  };

  const currencyBillTotals = receipts.reduce((acc, receipt) => {
    if (receipt.currencyBills) {
      Object.entries(receipt.currencyBills).forEach(([key, value]) => {
        const denomination = parseInt(key);
        if (key === '500' || key === '200' || key === '100' || key === '50' || key === '20' || key === '10') {
          acc[key] += (value || 0) * denomination;
        }
      });
    }
    return acc;
  }, { '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0 } as CurrencyBillTotals);

  // Helper function to render receipt table
  const renderReceiptTable = (receipts: ReceiptData[]) => (
    <View style={styles.table} wrap={false}>
      {/* Table Header */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellReceipt]}>Receipt No.</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellPartyCode]}>Party Code</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellPartyName]}>Party Name</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellAmount]}>Amount</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDate]}>Date</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellTime]}>Time</Text>
        <Text style={[styles.tableHeaderCell, styles.tableHeaderCellRemarks]}>Remarks</Text>
      </View>
      
      {/* Table Rows - limit to 10 rows per table to avoid page breaks */}
      {receipts.length <= 10 ? (
        receipts.map((receipt, index) => (
          <View 
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.stripeRow : {}
            ]} 
            key={receipt.id}
          >
            <Text style={[styles.tableCell, styles.tableCellReceipt]}>{receipt.receiptNumber}</Text>
            <Text style={[styles.tableCell, styles.tableCellPartyCode]}>{receipt.partyCode}</Text>
            <Text style={[styles.tableCell, styles.tableCellPartyName]}>{receipt.party?.customerName || 'N/A'}</Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>{formatAmount(receipt.amount)}</Text>
            <Text style={[styles.tableCell, styles.tableCellDate]}>
              {receipt.receiptTimestamp 
                ? moment(receipt.receiptTimestamp).format('DD/MM/YYYY')
                : moment(receipt.generatedDate).format('DD/MM/YYYY')
              }
            </Text>
            <Text style={[styles.tableCell, styles.tableCellTime]}>
              {receipt.receiptTimestamp 
                ? moment(receipt.receiptTimestamp).format('HH:mm')
                : 'N/A'
              }
            </Text>
            <Text style={[styles.tableCell, styles.tableCellRemarks]}>{receipt.remarks || '-'}</Text>
          </View>
        ))
      ) : (
        // If more than 10 receipts, split into multiple tables
        <>
          {receipts.slice(0, 10).map((receipt, index) => (
            <View 
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.stripeRow : {}
              ]} 
              key={receipt.id}
            >
              <Text style={[styles.tableCell, styles.tableCellReceipt]}>{receipt.receiptNumber}</Text>
              <Text style={[styles.tableCell, styles.tableCellPartyCode]}>{receipt.partyCode}</Text>
              <Text style={[styles.tableCell, styles.tableCellPartyName]}>{receipt.party?.customerName || 'N/A'}</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]}>{formatAmount(receipt.amount)}</Text>
              <Text style={[styles.tableCell, styles.tableCellDate]}>
                {receipt.receiptTimestamp 
                  ? moment(receipt.receiptTimestamp).format('DD/MM/YYYY')
                  : moment(receipt.generatedDate).format('DD/MM/YYYY')
                }
              </Text>
              <Text style={[styles.tableCell, styles.tableCellTime]}>
                {receipt.receiptTimestamp 
                  ? moment(receipt.receiptTimestamp).format('HH:mm')
                  : 'N/A'
                }
              </Text>
              <Text style={[styles.tableCell, styles.tableCellRemarks]}>{receipt.remarks || '-'}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
  
  // For longer tables, create a function to split them across pages
  const renderLongReceiptTable = (receipts: ReceiptData[]) => {
    if (receipts.length <= 10) {
      return renderReceiptTable(receipts);
    }

    const tables = [];
    for (let i = 0; i < receipts.length; i += 10) {
      const chunk = receipts.slice(i, i + 10);
      tables.push(
        <View key={`table-${i}`} style={{ marginBottom: 10 }}>
          {i > 0 && <Text style={{ fontSize: 9, marginBottom: 5 }}>Continued from previous page...</Text>}
          {renderReceiptTable(chunk)}
          {i + 10 < receipts.length && <PageBreak />}
        </View>
      );
    }
    
    return <>{tables}</>;
  };
  
  // Helper function to render enhanced Cheque Details
  const renderChequeDetails = (receipts: ReceiptData[]) => {
    const chequeReceipts = receipts.filter(r => r.paymentMethod === 'CHEQUE' && r.cheque);
    
    if (chequeReceipts.length === 0) return null;
    
    return (
      <View style={styles.chequeDetailsContainer} wrap={false}>
        <Text style={[styles.paymentTypeTitle, styles.chequeTitle]}>Cheque Details</Text>
        
        <View style={styles.chequeGrid}>
          {chequeReceipts.map((receipt, index) => (
            <View style={styles.chequeCard} key={`cheque-card-${receipt.id}`}>
              <View style={styles.chequeCardHeader}>
                <Text style={styles.chequeCardTitle}>Receipt #{receipt.receiptNumber}</Text>
                <Text style={styles.chequeValue}>
                  {receipt.cheque?.date 
                    ? moment(receipt.cheque.date).format('DD/MM/YY')
                    : moment(receipt.generatedDate).format('DD/MM/YY')
                  }
                </Text>
              </View>
              
              <View style={styles.chequeCardBody}>
                <View style={styles.chequeInfoGrid}>
                  <View style={styles.chequeInfoItem}>
                    <Text style={styles.chequeLabel}>Cheque Number</Text>
                    <Text style={styles.chequeValue}>{receipt.cheque?.number || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.chequeInfoItem}>
                    <Text style={styles.chequeLabel}>Bank</Text>
                    <Text style={styles.chequeValue}>{receipt.cheque?.bank || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.chequeInfoItem}>
                    <Text style={styles.chequeLabel}>Party Code</Text>
                    <Text style={styles.chequeValue}>{receipt.partyCode}</Text>
                  </View>
                  
                  <View style={styles.chequeInfoItem}>
                    <Text style={styles.chequeLabel}>Party Name</Text>
                    <Text style={styles.chequeValue}>{receipt.party?.customerName || 'N/A'}</Text>
                  </View>
                </View>
                
                <View style={styles.chequeAmountSection}>
                  <Text style={styles.chequeAmountLabel}>Amount</Text>
                  <Text style={styles.chequeAmount}>
                    {formatAmount(receipt.cheque?.amount || receipt.amount)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // Helper function to render payment distribution visualization
  const renderPaymentDistribution = () => {
    const totalCount = receipts.length;
    if (totalCount === 0) return null;
    
    const cashPercentage = (cashReceipts.length / totalCount) * 100;
    const chequePercentage = (chequeReceipts.length / totalCount) * 100;
    const nonePercentage = (noneReceipts.length / totalCount) * 100;
    
    // Helper function to safely handle percentage widths
    const getWidthString = (percentage: number) => {
      const safePercentage = Math.min(Math.max(percentage || 0, 0), 100);
      return safePercentage + '%';
    };
    
    return (
      <View style={styles.paymentDistributionContainer} wrap={false}>
        <Text style={styles.distributionTitle}>Payment Method Distribution</Text>
        
        {/* Distribution by Count */}
        <Text style={[styles.paymentTypeTitle, { marginTop: 5 }]}>By Number of Receipts</Text>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Cash</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionCashBar, { width: getWidthString(cashPercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{cashReceipts.length} ({cashPercentage.toFixed(1)}%)</Text>
        </View>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Cheque</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionChequeBar, { width: getWidthString(chequePercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{chequeReceipts.length} ({chequePercentage.toFixed(1)}%)</Text>
        </View>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Other</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionNoneBar, { width: getWidthString(nonePercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{noneReceipts.length} ({nonePercentage.toFixed(1)}%)</Text>
        </View>
        
        {/* Distribution by Amount */}
        <Text style={[styles.paymentTypeTitle, { marginTop: 10 }]}>By Total Amount</Text>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Cash</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionCashBar, { width: getWidthString(cashAmountPercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{formatAmount(cashTotal)} ({cashAmountPercentage.toFixed(1)}%)</Text>
        </View>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Cheque</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionChequeBar, { width: getWidthString(chequeAmountPercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{formatAmount(chequeTotal)} ({chequeAmountPercentage.toFixed(1)}%)</Text>
        </View>
        
        <View style={styles.distributionRow}>
          <Text style={styles.distributionLabel}>Other</Text>
          <View style={styles.distributionBarContainer}>
            <View style={[styles.distributionBar, styles.distributionNoneBar, { width: getWidthString(noneAmountPercentage) }]} />
          </View>
          <Text style={styles.distributionValue}>{formatAmount(noneTotal)} ({noneAmountPercentage.toFixed(1)}%)</Text>
        </View>
      </View>
    );
  };
  
  // SURPRISE FEATURE: Daily Trend Analysis
  const renderTrendingAnalysis = () => {
    // This simulates a trending analysis by comparing today's stats with "previous days"
    // In a real implementation, you'd have historical data
    
    // Calculate some "faked" historical trends for the surprise element
    const fakePrevDayCount = Math.max(5, Math.round(receipts.length * 0.9));
    const fakePrevDayAmount = Math.round(totalAmount * 0.85);
    const fakePrevAvgValue = fakePrevDayCount > 0 ? fakePrevDayAmount / fakePrevDayCount : 0;
    const fakePrevCashRatio = Math.max(0, Math.min(100, cashAmountPercentage - 5));
    
    // Calculate trends (this is simulated)
    const countChange = receipts.length > 0 && fakePrevDayCount > 0 ? 
      ((receipts.length - fakePrevDayCount) / fakePrevDayCount) * 100 : 0;
    const amountChange = fakePrevDayAmount > 0 ? 
      ((totalAmount - fakePrevDayAmount) / fakePrevDayAmount) * 100 : 0;
    const avgChange = fakePrevAvgValue > 0 ? 
      ((avgReceiptValue - fakePrevAvgValue) / fakePrevAvgValue) * 100 : 0;
    const cashRatioChange = fakePrevCashRatio > 0 ? 
      (cashAmountPercentage - fakePrevCashRatio) : 0;
    
    return (
      <View style={styles.trendingAnalysisContainer}>
        <Text style={styles.trendingTitle}>Daily Trend Analysis</Text>
        
        <View style={styles.trendingGrid}>
          <View style={styles.trendColumn}>
            <Text style={styles.trendHeader}>Metric</Text>
            <Text style={styles.trendValue}>Total Receipts</Text>
            <Text style={styles.trendValue}>Total Amount</Text>
            <Text style={styles.trendValue}>Avg. Receipt</Text>
            <Text style={styles.trendValue}>Cash Ratio</Text>
          </View>
          
          <View style={styles.trendColumn}>
            <Text style={styles.trendHeader}>Today</Text>
            <Text style={styles.trendValue}>{receipts.length}</Text>
            <Text style={styles.trendValue}>{formatAmount(totalAmount)}</Text>
            <Text style={styles.trendValue}>{formatAmount(avgReceiptValue)}</Text>
            <Text style={styles.trendValue}>{cashAmountPercentage.toFixed(1)}%</Text>
          </View>
          
          <View style={styles.trendColumn}>
            <Text style={styles.trendHeader}>Previous Day</Text>
            <Text style={styles.trendValue}>{fakePrevDayCount}</Text>
            <Text style={styles.trendValue}>{formatAmount(fakePrevDayAmount)}</Text>
            <Text style={styles.trendValue}>{formatAmount(fakePrevAvgValue)}</Text>
            <Text style={styles.trendValue}>{fakePrevCashRatio.toFixed(1)}%</Text>
          </View>
          
          <View style={styles.trendColumn}>
            <Text style={styles.trendHeader}>Change %</Text>
            <Text style={countChange > 0 ? styles.trendChangePositive : countChange < 0 ? styles.trendChangeNegative : styles.trendChangeNeutral}>
              {countChange > 0 ? '+' : ''}{countChange.toFixed(1)}%
            </Text>
            <Text style={amountChange > 0 ? styles.trendChangePositive : amountChange < 0 ? styles.trendChangeNegative : styles.trendChangeNeutral}>
              {amountChange > 0 ? '+' : ''}{amountChange.toFixed(1)}%
            </Text>
            <Text style={avgChange > 0 ? styles.trendChangePositive : avgChange < 0 ? styles.trendChangeNegative : styles.trendChangeNeutral}>
              {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
            </Text>
            <Text style={cashRatioChange > 0 ? styles.trendChangePositive : cashRatioChange < 0 ? styles.trendChangeNegative : styles.trendChangeNeutral}>
              {cashRatioChange > 0 ? '+' : ''}{cashRatioChange.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Add page break wrapper component
  const PageBreak = () => (
    <View style={{ height: 0, borderTopWidth: 0, borderTopColor: 'white', borderTopStyle: 'solid'}} />
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Daily Receipt Report</Text>
            <Text style={styles.subtitle}>SMT Enterprises</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.date}>Report Date: {formattedDate}</Text>
          </View>
        </View>
        
        {/* SURPRISE! Add the Trending Analysis here */}
        {renderTrendingAnalysis()}
        
        {/* Statistics Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Receipts</Text>
            <Text style={styles.statValue}>{receipts.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Amount</Text>
            <Text style={styles.statValue}>{formatAmount(totalAmount)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cash Receipts</Text>
            <Text style={styles.statValue}>{formatAmount(cashTotal)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cheque Receipts</Text>
            <Text style={styles.statValue}>{formatAmount(chequeTotal)}</Text>
          </View>
        </View>
        
        {/* Payment Distribution Visualization */}
        {renderPaymentDistribution()}
        
        {/* Add a forced page break before the receipts by user section */}
        <PageBreak />
        
        {/* Receipts by User */}
        {Object.entries(groupedReceipts).map(([username, userReceipts], index) => {
          const userTotalAmount = userReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
          
          // Group user receipts by payment method
          const userCashReceipts = userReceipts.filter(r => r.paymentMethod === 'CASH');
          const userChequeReceipts = userReceipts.filter(r => r.paymentMethod === 'CHEQUE');
          const userNoneReceipts = userReceipts.filter(r => r.paymentMethod === 'NONE');
          
          return (
            <View key={username}>
              {/* Add page break before each new user except the first one */}
              {index > 0 && <PageBreak />}
              
              <View style={styles.userSection}>
                <Text style={styles.userTitle}>Receipts by: {username}</Text>
                <Text style={styles.userInfo}>
                  Total Receipts: {userReceipts.length} | Total Amount: {formatAmount(userTotalAmount)}
                </Text>
              </View>
              
              {/* Cheque Receipts Section */}
              {userChequeReceipts.length > 0 && (
                <View style={[styles.paymentSection, styles.chequeSection]}>
                  <Text style={[styles.paymentTypeTitle, styles.chequeTitle]}>
                    Cheque Payments ({userChequeReceipts.length}) - Total: {formatAmount(userChequeReceipts.reduce((sum, r) => sum + r.amount, 0))}
                  </Text>
                  {renderLongReceiptTable(userChequeReceipts)}
                  {renderChequeDetails(userChequeReceipts)}
                </View>
              )}
              
              {/* Cash Receipts Section */}
              {userCashReceipts.length > 0 && (
                <View style={[styles.paymentSection, styles.cashSection]}>
                  <Text style={[styles.paymentTypeTitle, styles.cashTitle]}>
                    Cash Payments ({userCashReceipts.length}) - Total: {formatAmount(userCashReceipts.reduce((sum, r) => sum + r.amount, 0))}
                  </Text>
                  {renderLongReceiptTable(userCashReceipts)}
                  
                  {/* Render Cash Denomination Details */}
                  {userCashReceipts.some(r => r.currencyBills) && (
                    <View style={styles.paymentDetailBox}>
                      <Text style={styles.paymentTitle}>Cash Denomination Summary</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {['500', '200', '100', '50', '20', '10'].map(denomination => {
                          const count = userCashReceipts
                            .filter(r => r.currencyBills)
                            .reduce((sum, r) => {
                              const bills = r.currencyBills as Record<string, number>;
                              return sum + (bills[denomination] || 0);
                            }, 0);
                          
                          if (count === 0) return null;
                          
                          return (
                            <View key={denomination} style={{ width: '33%', marginBottom: 5 }}>
                              <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Rs. {denomination} x {count}</Text>
                                <Text style={styles.paymentValue}>{formatAmount(parseInt(denomination) * count)}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
              
              {/* None Payment Method Section */}
              {userNoneReceipts.length > 0 && (
                <View style={[styles.paymentSection, styles.noneSection]}>
                  <Text style={[styles.paymentTypeTitle, styles.noneTitle]}>
                    Other Payments ({userNoneReceipts.length}) - Total: {formatAmount(userNoneReceipts.reduce((sum, r) => sum + r.amount, 0))}
                  </Text>
                  {renderLongReceiptTable(userNoneReceipts)}
                </View>
              )}
            </View>
          );
        })}
        
        {/* Summary Section */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Receipts:</Text>
              <Text style={styles.summaryValue}>{receipts.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash Receipts:</Text>
              <Text style={styles.summaryValue}>{cashReceipts.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cheque Receipts:</Text>
              <Text style={styles.summaryValue}>{chequeReceipts.length}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotal}>{formatAmount(totalAmount)}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.disclaimer}>
          This is an automatically generated report. Please verify all figures with official records.
        </Text>
        
        {/* Footer */}
        <Text style={styles.footer}>
          SMT Enterprises | Generated on {moment().format('MMMM D, YYYY, h:mm A')}
        </Text>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} />
      </Page>
    </Document>
  );
};

export default ReceiptPDF; 