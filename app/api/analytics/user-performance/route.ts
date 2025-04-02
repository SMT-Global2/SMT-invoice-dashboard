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
    
    // Get metrics for each user
    const userPerformancePromises = users.map(async (user) => {
      // Count invoices created
      const invoicesCreated = await prisma.invoice.count({
        where: {
          ...dateFilter,
          invoiceUsername: user.username
        }
      });
      
      // Count invoices checked
      const invoicesChecked = await prisma.invoice.count({
        where: {
          ...dateFilter,
          checkUsername: user.username
        }
      });
      
      // Count invoices packed
      const invoicesPacked = await prisma.invoice.count({
        where: {
          ...dateFilter,
          packageUsername: user.username
        }
      });
      
      // Count invoices delivered
      const invoicesDelivered = await prisma.invoice.count({
        where: {
          ...dateFilter,
          deliveredUsername: user.username
        }
      });
      
      // Count invoices billed
      const invoicesBilled = await prisma.invoice.count({
        where: {
          ...dateFilter,
          billedUsername: user.username
        }
      });
      
      // Calculate average processing time
      const completedInvoices = await prisma.invoice.findMany({
        where: {
          invoiceUsername: user.username,
          deliveryStatus: 'DELIVERED',
          invoiceTimestamp: { not: null },
          deliveredTimestamp: { not: null },
          ...dateFilter
        },
        select: {
          invoiceTimestamp: true,
          deliveredTimestamp: true
        }
      });
      
      let totalProcessingHours = 0;
      let completedCount = 0;
      
      completedInvoices.forEach(invoice => {
        if (invoice.invoiceTimestamp && invoice.deliveredTimestamp) {
          const startTime = moment(invoice.invoiceTimestamp);
          const endTime = moment(invoice.deliveredTimestamp);
          const diffHours = endTime.diff(startTime, 'hours', true);
          
          if (diffHours > 0 && diffHours < 720) { // Exclude outliers (30 days max)
            totalProcessingHours += diffHours;
            completedCount++;
          }
        }
      });
      
      // Calculate overall performance score based on various metrics
      // This is a simple weighted average, but could be more sophisticated
      const totalActivity = invoicesCreated + invoicesChecked + invoicesPacked + invoicesDelivered + invoicesBilled;
      const overallScore = totalActivity > 0 ? Math.round((
        (invoicesCreated * 1) +
        (invoicesChecked * 1.2) +
        (invoicesPacked * 1.5) +
        (invoicesDelivered * 1.8) +
        (invoicesBilled * 2)
      ) / totalActivity * 10) : 0;
      
      // Format response according to UserPerformanceResponse interface
      return {
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        department: Array.isArray(user.department) ? user.department.join(', ') : 'Unknown',
        performance: {
          invoices: invoicesCreated,
          checking: invoicesChecked,
          packing: invoicesPacked,
          delivery: invoicesDelivered,
          billing: invoicesBilled,
          overall: overallScore
        }
      };
    });
    
    let userPerformanceData = await Promise.all(userPerformancePromises);
    
    // Filter out users with no activity
    userPerformanceData = userPerformanceData.filter(user => 
      user.performance.invoices > 0 || 
      user.performance.checking > 0 || 
      user.performance.packing > 0 || 
      user.performance.delivery > 0 ||
      user.performance.billing > 0
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