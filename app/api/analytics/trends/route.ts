import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCached, setCache } from '@/lib/api-cache'
import moment from 'moment-timezone'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }

  const cacheKey = request.url;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

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

    const whereClause: any = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.invoiceTimestamp = dateFilter
    }

    // groupBy generatedDate instead of fetching ALL invoices
    const dailyGroups = await prisma.invoice.groupBy({
      by: ['generatedDate'],
      where: whereClause,
      _count: true
    });

    // Aggregate by date string (generatedDate may have time components)
    const dailyData = new Map<string, number>();
    for (const group of dailyGroups) {
      if (group.generatedDate) {
        const day = moment(group.generatedDate).format('YYYY-MM-DD');
        dailyData.set(day, (dailyData.get(day) || 0) + group._count);
      }
    }

    // Convert to array format sorted by date
    const trendData = Array.from(dailyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        invoiceCount: count,
        invoices: count,
        items: count,
        orders: count
      }));

    const result = { trendData };
    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Trend API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
