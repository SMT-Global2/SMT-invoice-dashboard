import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import moment from 'moment-timezone';
import { Department } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  if (session.user.type !== 'ADMIN') {
    return Response.json({
      success: false,
      message: 'Forbidden'
    }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from')
      ? moment(searchParams.get('from')).startOf('day').toDate()
      : moment().subtract(30, 'days').startOf('day').toDate();
    
    const toDate = searchParams.get('to')
      ? moment(searchParams.get('to')).endOf('day').toDate()
      : moment().endOf('day').toDate();
    
    const departmentFilter = searchParams.get('department');
    
    // Base where clause for date filtering
    const dateFilter = {
      OR: [
        { invoiceTimestamp: { gte: fromDate, lte: toDate } },
        { checkTimestamp: { gte: fromDate, lte: toDate } },
        { packageTimestamp: { gte: fromDate, lte: toDate } },
        { deliveredTimestamp: { gte: fromDate, lte: toDate } },
        { billedTimestamp: { gte: fromDate, lte: toDate } }
      ]
    };
    
    // Get all users
    const userWhere: any = {};
    if (departmentFilter && departmentFilter !== "ALL") {
      userWhere.department = {
        has: departmentFilter as Department
      };
    }
    
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        department: true
      }
    });
    
    // Define date filters per model (adjust field names as needed)
    const invoiceDateFilter = { generatedDate: { gte: fromDate, lte: toDate } }; // Assuming generatedDate for Invoice
    const receiptDateFilter = { generatedDate: { gte: fromDate, lte: toDate } }; // Assuming generatedDate for Receipt
    const inventoryDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const dmDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };
    const expiryDateFilter = { generatedDate: { gte: fromDate, lte: toDate } };

    // Get metrics for each user
    const userPerformancePromises = users.map(async (user) => {
      const [ // Use Promise.all for efficiency
        invoicesCreated,
        invoicesChecked,
        invoicesPacked,
        invoicesDelivered,
        invoicesBilled,
        receiptsCreated,       // New
        inventoriesChecked,    // New
        inventoriesVouchered,  // New
        dmsCollected,        // New
        dmsChecked,          // New
        expiriesUploaded,      // New
        expiriesCreditNoted    // New
      ] = await Promise.all([
        // Invoice counts (use correct date filter)
        prisma.invoice.count({ where: { invoiceUsername: user.username, ...invoiceDateFilter } }),
        prisma.invoice.count({ where: { checkUsername: user.username, ...invoiceDateFilter } }),
        prisma.invoice.count({ where: { packageUsername: user.username, ...invoiceDateFilter } }),
        prisma.invoice.count({ where: { deliveredUsername: user.username, ...invoiceDateFilter } }),
        prisma.invoice.count({ where: { billedUsername: user.username, ...invoiceDateFilter } }),
        // New counts (use correct date filters and usernames)
        prisma.receipt.count({ where: { receiptUsername: user.username, ...receiptDateFilter } }), 
        prisma.inventory.count({ where: { inventoryCheckUsername: user.username, ...inventoryDateFilter } }),
        prisma.inventory.count({ where: { inventoryVoucherUsername: user.username, ...inventoryDateFilter } }),
        prisma.deliveryMemo.count({ where: { goodsCollectedUsername: user.username, ...dmDateFilter } }),
        prisma.deliveryMemo.count({ where: { goodsCheckedUsername: user.username, ...dmDateFilter } }),
        prisma.expiry.count({ where: { expiryUsername: user.username, ...expiryDateFilter } }),
        prisma.expiry.count({ where: { creditNoteUsername: user.username, creditNoteNumber: { not: null }, ...expiryDateFilter } }) // Only count if CN exists
      ]);
      
      // Recalculate overall score (optional - adjust weights as needed)
      const totalActivity = invoicesCreated + invoicesChecked + invoicesPacked + invoicesDelivered + invoicesBilled + 
                          receiptsCreated + inventoriesChecked + inventoriesVouchered + dmsCollected + 
                          dmsChecked + expiriesUploaded + expiriesCreditNoted;
      const overallScore = totalActivity > 0 ? Math.round((
        (invoicesCreated * 1) + (invoicesChecked * 1.2) + (invoicesPacked * 1.5) + 
        (invoicesDelivered * 1.8) + (invoicesBilled * 2) + 
        // Add weights for new actions
        (receiptsCreated * 1) + (inventoriesChecked * 1.2) + (inventoriesVouchered * 1.5) +
        (dmsCollected * 1) + (dmsChecked * 1.2) + (expiriesUploaded * 1) + (expiriesCreditNoted * 1.5) 
      ) / (11.2) * 10) : 0; // Simplified weighting - adjust denominator based on max possible weighted sum or use average
      
      return {
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        department: Array.isArray(user.department) ? user.department : [],
        performance: {
          invoices: invoicesCreated,
          checking: invoicesChecked,
          packing: invoicesPacked,
          delivery: invoicesDelivered,
          billing: invoicesBilled,
          // Add new metrics
          receipts: receiptsCreated,
          invChecks: inventoriesChecked,
          invVouchers: inventoriesVouchered,
          dmCollects: dmsCollected,
          dmChecks: dmsChecked,
          expUploads: expiriesUploaded,
          expCreditNotes: expiriesCreditNoted,
          // Updated overall score
          overall: overallScore 
        }
      };
    });
    
    let userPerformanceData = await Promise.all(userPerformancePromises);
    
    // Update filter to include new activity metrics
    userPerformanceData = userPerformanceData.filter(user => 
      user.performance.invoices > 0 || user.performance.checking > 0 || 
      user.performance.packing > 0 || user.performance.delivery > 0 ||
      user.performance.billing > 0 || user.performance.receipts > 0 ||
      user.performance.invChecks > 0 || user.performance.invVouchers > 0 ||
      user.performance.dmCollects > 0 || user.performance.dmChecks > 0 ||
      user.performance.expUploads > 0 || user.performance.expCreditNotes > 0
    );
    
    // Sort by overall performance
    userPerformanceData.sort((a, b) => b.performance.overall - a.performance.overall);
    
    // Return data in the format expected by the interface
    return NextResponse.json({
      users: userPerformanceData
    });

  } catch (error) {
    console.error('User Performance API Error:', (error as any).message);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 