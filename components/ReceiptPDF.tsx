import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { ReceiptData } from '@/store/useReceiptStore';
import moment from 'moment';

// Register fonts if needed
// Font.register({
//   family: 'Oswald',
//   src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf'
// });

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 20,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '16.6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableHeader: {
    width: '16.6%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f0f0f0',
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 10,
    padding: 5,
  },
  headerCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 10,
    fontWeight: 'bold',
    padding: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: 'grey',
  },
  subtitle: {
    fontSize: 18,
    margin: 12,
    textAlign: 'center',
  },
  summary: {
    margin: 12,
    fontSize: 14,
    textAlign: 'right',
  },
});

type ReceiptPDFProps = {
  receipts: ReceiptData[];
  date: string;
};

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipts, date }) => {
  // Calculate total amount
  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  
  // Format date
  const formattedDate = moment(date).format('MMMM D, YYYY');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Daily Receipt Report</Text>
        <Text style={styles.date}>Date: {formattedDate}</Text>
        
        <View style={styles.section}>
          <Text style={styles.subtitle}>Receipt Summary</Text>
          
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Receipt No.</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Party Code</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Party Name</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Amount</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Payment Method</Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Remarks</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {receipts.map((receipt) => (
              <View style={styles.tableRow} key={receipt.id}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{receipt.receiptNumber}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{receipt.partyCode}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{receipt.party?.customerName || 'N/A'}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>₹{receipt.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{receipt.paymentMethod}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{receipt.remarks || '-'}</Text>
                </View>
              </View>
            ))}
          </View>
          
          <Text style={styles.summary}>Total Amount: ₹{totalAmount.toLocaleString()}</Text>
        </View>
        
        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {moment().format('MMMM D, YYYY, h:mm A')}
        </Text>
      </Page>
    </Document>
  );
};

export default ReceiptPDF; 