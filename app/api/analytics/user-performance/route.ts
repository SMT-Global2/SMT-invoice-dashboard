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
      
      // Calculate completion rate
      const completionRate = invoicesCreated > 0
        ? Math.round((invoicesDelivered / invoicesCreated) * 100)
        : 0;
      
      return {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        metrics: {
          invoicesCreated,
          invoicesChecked,
          invoicesPacked,
          invoicesDelivered,
          invoicesBilled,
          avgProcessingTime: completedCount > 0 
            ? totalProcessingHours / completedCount 
            : 0,
          completionRate,
          // Rank will be calculated later
          rank: 0
        }
      };
    });
    
    let userPerformance = await Promise.all(userPerformancePromises);
    
    // Filter out users with no activity
    userPerformance = userPerformance.filter(user => 
      user.metrics.invoicesCreated > 0 || 
      user.metrics.invoicesChecked > 0 || 
      user.metrics.invoicesPacked > 0 || 
      user.metrics.invoicesDelivered > 0 ||
      user.metrics.invoicesBilled > 0
    );
    
    // Calculate ranks based on total processed invoices
    userPerformance.sort((a, b) => {
      const totalA = a.metrics.invoicesCreated + a.metrics.invoicesChecked + 
                     a.metrics.invoicesPacked + a.metrics.invoicesDelivered +
                     a.metrics.invoicesBilled;
      const totalB = b.metrics.invoicesCreated + b.metrics.invoicesChecked + 
                     b.metrics.invoicesPacked + b.metrics.invoicesDelivered +
                     b.metrics.invoicesBilled;
      return totalB - totalA;
    });
    
    // Assign ranks
    userPerformance.forEach((user, index) => {
      user.metrics.rank = index + 1;
    });
    
    // Generate top performers data
    const topPerformers = [];
    
    // Top invoice creators
    const topCreators = [...userPerformance]
      .filter(u => u.metrics.invoicesCreated > 0)
      .sort((a, b) => b.metrics.invoicesCreated - a.metrics.invoicesCreated)
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        displayName: `${u.firstName} ${u.lastName}`,
        category: 'created',
        total: u.metrics.invoicesCreated,
        avgTimeHours: u.metrics.avgProcessingTime
      }));
    
    // Top checkers
    const topCheckers = [...userPerformance]
      .filter(u => u.metrics.invoicesChecked > 0)
      .sort((a, b) => b.metrics.invoicesChecked - a.metrics.invoicesChecked)
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        displayName: `${u.firstName} ${u.lastName}`,
        category: 'checked',
        total: u.metrics.invoicesChecked,
        avgTimeHours: u.metrics.avgProcessingTime
      }));
    
    // Top packers
    const topPackers = [...userPerformance]
      .filter(u => u.metrics.invoicesPacked > 0)
      .sort((a, b) => b.metrics.invoicesPacked - a.metrics.invoicesPacked)
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        displayName: `${u.firstName} ${u.lastName}`,
        category: 'packed',
        total: u.metrics.invoicesPacked,
        avgTimeHours: u.metrics.avgProcessingTime
      }));
    
    // Top deliverers
    const topDeliverers = [...userPerformance]
      .filter(u => u.metrics.invoicesDelivered > 0)
      .sort((a, b) => b.metrics.invoicesDelivered - a.metrics.invoicesDelivered)
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        displayName: `${u.firstName} ${u.lastName}`,
        category: 'delivered',
        total: u.metrics.invoicesDelivered,
        avgTimeHours: u.metrics.avgProcessingTime
      }));
    
    // Top billers
    const topBillers = [...userPerformance]
      .filter(u => u.metrics.invoicesBilled > 0)
      .sort((a, b) => b.metrics.invoicesBilled - a.metrics.invoicesBilled)
      .slice(0, 5)
      .map(u => ({
        username: u.username,
        displayName: `${u.firstName} ${u.lastName}`,
        category: 'billed',
        total: u.metrics.invoicesBilled,
        avgTimeHours: u.metrics.avgProcessingTime
      }));
    
    // Combine all top performers
    topPerformers.push(...topCreators, ...topCheckers, ...topPackers, ...topDeliverers, ...topBillers);
    
    // Generate user comparison data (for radar chart)
    const userComparison = userPerformance
      .slice(0, 5) // Take top 5 users only
      .map(user => ({
        username: user.username,
        displayName: `${user.firstName} ${user.lastName}`,
        invoicesCreated: user.metrics.invoicesCreated,
        invoicesChecked: user.metrics.invoicesChecked,
        invoicesPacked: user.metrics.invoicesPacked,
        invoicesDelivered: user.metrics.invoicesDelivered,
        invoicesBilled: user.metrics.invoicesBilled,
        totalProcessed: user.metrics.invoicesCreated + user.metrics.invoicesChecked + 
                         user.metrics.invoicesPacked + user.metrics.invoicesDelivered +
                         user.metrics.invoicesBilled
      }));
    
    // Generate speed metrics data
    const speedMetricsPromises = userPerformance.slice(0, 8).map(async (user) => {
      // Get all invoices with timestamps for this user
      const invoices = await prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceUsername: user.username },
            { checkUsername: user.username },
            { packageUsername: user.username },
            { deliveredUsername: user.username },
            { billedUsername: user.username }
          ],
          AND: [
            {
              OR: [
                { invoiceTimestamp: { gte: fromDate, lte: toDate } },
                { checkTimestamp: { gte: fromDate, lte: toDate } },
                { packageTimestamp: { gte: fromDate, lte: toDate } },
                { deliveredTimestamp: { gte: fromDate, lte: toDate } },
                { billedTimestamp: { gte: fromDate, lte: toDate } }
              ]
            }
          ]
        },
        select: {
          invoiceTimestamp: true,
          checkTimestamp: true,
          packageTimestamp: true,
          pickupTimestamp: true,
          deliveredTimestamp: true,
          billedTimestamp: true
        }
      });
      
      let generateToCheckHours = 0;
      let checkToPackHours = 0;
      let packToDeliveryHours = 0;
      let deliveryToBillHours = 0;
      let totalTimeHours = 0;
      
      let generateToCheckCount = 0;
      let checkToPackCount = 0;
      let packToDeliveryCount = 0;
      let deliveryToBillCount = 0;
      
      invoices.forEach(invoice => {
        // Calculate time from generation to check
        if (invoice.invoiceTimestamp && invoice.checkTimestamp) {
          const diffHours = moment(invoice.checkTimestamp).diff(moment(invoice.invoiceTimestamp), 'hours', true);
          if (diffHours > 0 && diffHours < 240) { // 10 days max
            generateToCheckHours += diffHours;
            generateToCheckCount++;
          }
        }
        
        // Calculate time from check to pack
        if (invoice.checkTimestamp && invoice.packageTimestamp) {
          const diffHours = moment(invoice.packageTimestamp).diff(moment(invoice.checkTimestamp), 'hours', true);
          if (diffHours > 0 && diffHours < 240) {
            checkToPackHours += diffHours;
            checkToPackCount++;
          }
        }
        
        // Calculate time from pack to delivery
        if (invoice.packageTimestamp && invoice.deliveredTimestamp) {
          const diffHours = moment(invoice.deliveredTimestamp).diff(moment(invoice.packageTimestamp), 'hours', true);
          if (diffHours > 0 && diffHours < 240) {
            packToDeliveryHours += diffHours;
            packToDeliveryCount++;
          }
        }
        
        // Calculate time from delivery to billing
        if (invoice.deliveredTimestamp && invoice.billedTimestamp) {
          const diffHours = moment(invoice.billedTimestamp).diff(moment(invoice.deliveredTimestamp), 'hours', true);
          if (diffHours > 0 && diffHours < 240) {
            deliveryToBillHours += diffHours;
            deliveryToBillCount++;
          }
        }
        
        // Calculate total time
        if (invoice.invoiceTimestamp && invoice.billedTimestamp) {
          const diffHours = moment(invoice.billedTimestamp).diff(moment(invoice.invoiceTimestamp), 'hours', true);
          if (diffHours > 0 && diffHours < 720) { // 30 days max
            totalTimeHours += diffHours;
          }
        }
      });
      
      return {
        username: user.username,
        displayName: `${user.firstName} ${user.lastName}`,
        generateToCheck: generateToCheckCount > 0 ? generateToCheckHours / generateToCheckCount : 0,
        checkToPack: checkToPackCount > 0 ? checkToPackHours / checkToPackCount : 0,
        packToDelivery: packToDeliveryCount > 0 ? packToDeliveryHours / packToDeliveryCount : 0,
        deliveryToBill: deliveryToBillCount > 0 ? deliveryToBillHours / deliveryToBillCount : 0,
        totalTime: totalTimeHours > 0 ? totalTimeHours : 0
      };
    });
    
    const speedMetrics = await Promise.all(speedMetricsPromises);
    
    // Return all data
    return NextResponse.json({
      userPerformance,
      topPerformers,
      userComparison,
      speedMetrics
    });

  } catch (error) {
    console.error('User Performance API Error:', (error as any).message);
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 