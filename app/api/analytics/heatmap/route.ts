import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone'
import { getCached, setCache } from '@/lib/api-cache'

// Map activityType to the specific timestamp field needed
const timestampFieldMap: Record<string, string> = {
  invoicing: 'invoiceTimestamp',
  checking: 'checkTimestamp',
  packing: 'packageTimestamp',
  delivery: 'deliveredTimestamp',
  billing: 'billedTimestamp'
};

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
    const activityType = searchParams.get('type') || 'all'
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    // Build date range filter
    const dateFilter: any = {}
    if (fromDate) {
      Object.assign(dateFilter, { gte: fromDate })
    }
    if (toDate) {
      Object.assign(dateFilter, { lte: toDate })
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build where clause — only filter on the relevant timestamp field(s)
    const whereClause: any = {}
    if (hasDateFilter) {
      if (activityType !== 'all' && timestampFieldMap[activityType]) {
        whereClause[timestampFieldMap[activityType]] = dateFilter;
      } else {
        whereClause.OR = [
          { invoiceTimestamp: dateFilter },
          { checkTimestamp: dateFilter },
          { packageTimestamp: dateFilter },
          { deliveredTimestamp: dateFilter },
          { billedTimestamp: dateFilter }
        ];
      }
    }

    // Only select the timestamp fields needed for the specific activityType
    const selectFields: Record<string, boolean> = {};
    if (activityType === 'all') {
      selectFields.invoiceTimestamp = true;
      selectFields.checkTimestamp = true;
      selectFields.packageTimestamp = true;
      selectFields.deliveredTimestamp = true;
      selectFields.billedTimestamp = true;
    } else if (timestampFieldMap[activityType]) {
      selectFields[timestampFieldMap[activityType]] = true;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: selectFields
    });

    // Process data for heatmap (grouped by day and hour)
    const activityHeatmap = new Map<string, { day: number; hour: number; date: string; value: number }>();

    for (const invoice of invoices) {
      const timestamps: Date[] = [];

      if (activityType === 'invoicing' || activityType === 'all') {
        if ((invoice as any).invoiceTimestamp) timestamps.push((invoice as any).invoiceTimestamp);
      }
      if (activityType === 'checking' || activityType === 'all') {
        if ((invoice as any).checkTimestamp) timestamps.push((invoice as any).checkTimestamp);
      }
      if (activityType === 'packing' || activityType === 'all') {
        if ((invoice as any).packageTimestamp) timestamps.push((invoice as any).packageTimestamp);
      }
      if (activityType === 'delivery' || activityType === 'all') {
        if ((invoice as any).deliveredTimestamp) timestamps.push((invoice as any).deliveredTimestamp);
      }
      if (activityType === 'billing' || activityType === 'all') {
        if ((invoice as any).billedTimestamp) timestamps.push((invoice as any).billedTimestamp);
      }

      for (const timestamp of timestamps) {
        const m = moment(timestamp);
        const day = m.day();
        const hour = m.hour();
        const date = m.format('YYYY-MM-DD');

        const key = `${day}-${hour}`;
        const current = activityHeatmap.get(key) || { day, hour, date, value: 0 };
        current.value += 1;
        activityHeatmap.set(key, current);
      }
    }

    const heatmapData = Array.from(activityHeatmap.values());

    const result = { heatmapData, activityType };
    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Activity Heatmap API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
