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
    
    // Calculate trend data by day
    const whereClause: any = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.invoiceTimestamp = dateFilter
    }
    
    // Get invoices with timestamps
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        invoiceTimestamp: true,
        // We don't need additional fields since we'll calculate items/orders ourselves
      },
      orderBy: {
        invoiceTimestamp: 'asc'
      }
    });
    
    // Group invoices by day and calculate totals
    const dailyData = new Map();
    
    // Process each invoice
    invoices.forEach(invoice => {
      if (invoice.invoiceTimestamp) {
        const day = invoice.invoiceTimestamp.toISOString().split('T')[0];
        const current = dailyData.get(day) || {
          invoiceCount: 0
        };
        
        current.invoiceCount += 1;
        dailyData.set(day, current);
      }
    });
    
    // Convert to array format for the chart
    const trendData = Array.from(dailyData.entries()).map(([date, data]) => {
      return {
        date,
        invoiceCount: data.invoiceCount,
        invoices: data.invoiceCount, // Alias for consistency with UI
        items: data.invoiceCount, // Use actual invoice count
        orders: data.invoiceCount // Use actual invoice count
      };
    });
    
    return NextResponse.json({
      trendData
    });
    
  } catch (error) {
    console.error('Trend API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 