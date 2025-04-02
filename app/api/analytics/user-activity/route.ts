import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
    
    // Build date filter
    const dateFilter: any = {}
    if (fromDate) {
      dateFilter.gte = fromDate
    }
    if (toDate) {
      dateFilter.lte = toDate
    }
    
    // Find all invoices with their timestamps
    const whereClause: any = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.OR = [
        { invoiceTimestamp: dateFilter },
        { checkTimestamp: dateFilter },
        { packageTimestamp: dateFilter },
        { pickupTimestamp: dateFilter },
        { deliveredTimestamp: dateFilter },
        { billedTimestamp: dateFilter }
      ]
    }
    
    // Get all unique usernames who performed any actions
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        invoiceUsername: true,
        invoiceTimestamp: true,
        checkUsername: true,
        checkTimestamp: true,
        packageUsername: true,
        packageTimestamp: true,
        pickupUsername: true,
        pickupTimestamp: true,
        deliveredUsername: true,
        deliveredTimestamp: true,
        billedUsername: true,
        billedTimestamp: true
      }
    });
    
    // Count activities by user and type
    const userActivities = new Map();
    
    invoices.forEach(invoice => {
      // Process invoice creation
      if (invoice.invoiceUsername && invoice.invoiceTimestamp) {
        if (dateFilter.gte && invoice.invoiceTimestamp < dateFilter.gte) return;
        if (dateFilter.lte && invoice.invoiceTimestamp > dateFilter.lte) return;
        
        const userData = userActivities.get(invoice.invoiceUsername) || {
          username: invoice.invoiceUsername,
          name: '', // Will be filled later
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        
        userData.invoiceCount += 1;
        userData.created += 1;
        userData.total += 1;
        userActivities.set(invoice.invoiceUsername, userData);
      }
      
      // Process check operations
      if (invoice.checkUsername && invoice.checkTimestamp) {
        if (dateFilter.gte && invoice.checkTimestamp < dateFilter.gte) return;
        if (dateFilter.lte && invoice.checkTimestamp > dateFilter.lte) return;
        
        const userData = userActivities.get(invoice.checkUsername) || {
          username: invoice.checkUsername,
          name: '', // Will be filled later
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        
        userData.checked += 1;
        userData.total += 1;
        userActivities.set(invoice.checkUsername, userData);
      }
      
      // Process package operations
      if (invoice.packageUsername && invoice.packageTimestamp) {
        if (dateFilter.gte && invoice.packageTimestamp < dateFilter.gte) return;
        if (dateFilter.lte && invoice.packageTimestamp > dateFilter.lte) return;
        
        const userData = userActivities.get(invoice.packageUsername) || {
          username: invoice.packageUsername,
          name: '', // Will be filled later
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        
        userData.packed += 1;
        userData.total += 1;
        userActivities.set(invoice.packageUsername, userData);
      }
      
      // Process delivery operations
      if (invoice.deliveredUsername && invoice.deliveredTimestamp) {
        if (dateFilter.gte && invoice.deliveredTimestamp < dateFilter.gte) return;
        if (dateFilter.lte && invoice.deliveredTimestamp > dateFilter.lte) return;
        
        const userData = userActivities.get(invoice.deliveredUsername) || {
          username: invoice.deliveredUsername,
          name: '', // Will be filled later
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        
        userData.delivered += 1;
        userData.total += 1;
        userActivities.set(invoice.deliveredUsername, userData);
      }
      
      // Process billing operations
      if (invoice.billedUsername && invoice.billedTimestamp) {
        if (dateFilter.gte && invoice.billedTimestamp < dateFilter.gte) return;
        if (dateFilter.lte && invoice.billedTimestamp > dateFilter.lte) return;
        
        const userData = userActivities.get(invoice.billedUsername) || {
          username: invoice.billedUsername,
          name: '', // Will be filled later
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        
        userData.billed += 1;
        userData.total += 1;
        userActivities.set(invoice.billedUsername, userData);
      }
    });
    
    // Get user details to add names
    const uniqueUsernames = Array.from(userActivities.keys());
    const userDetails = await prisma.user.findMany({
      where: {
        username: {
          in: uniqueUsernames
        }
      },
      select: {
        username: true,
        firstName: true,
        lastName: true
      }
    });
    
    // Add user names to the activity data
    userDetails.forEach(user => {
      const userData = userActivities.get(user.username);
      if (userData) {
        userData.name = `${user.firstName} ${user.lastName}`.trim();
      }
    });
    
    // Convert Map to Array and sort by total activity count
    const userActivityArray = Array.from(userActivities.values())
      .sort((a, b) => b.total - a.total);
    
    return NextResponse.json({
      userActivities: userActivityArray
    });
    
  } catch (error) {
    console.error('User Activity API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 