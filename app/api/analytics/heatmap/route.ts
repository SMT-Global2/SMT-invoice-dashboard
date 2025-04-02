import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone'

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
    const activityType = searchParams.get('type') || 'all'
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
    
    // Build date range filter
    const dateFilter = {}
    if (fromDate) {
      Object.assign(dateFilter, { gte: fromDate })
    }
    if (toDate) {
      Object.assign(dateFilter, { lte: toDate })
    }
    
    // Build activity filter based on type
    const whereClause = {}
    if (dateFilter && Object.keys(dateFilter).length > 0) {
      if (activityType === 'invoicing') {
        Object.assign(whereClause, { invoiceTimestamp: dateFilter })
      } else if (activityType === 'checking') {
        Object.assign(whereClause, { checkTimestamp: dateFilter })
      } else if (activityType === 'packing') {
        Object.assign(whereClause, { packageTimestamp: dateFilter })
      } else if (activityType === 'delivery') {
        Object.assign(whereClause, { deliveredTimestamp: dateFilter })
      } else if (activityType === 'billing') {
        Object.assign(whereClause, { billedTimestamp: dateFilter })
      } else {
        // For 'all' type, we'll query all activities but need to structure differently
        Object.assign(whereClause, {
          OR: [
            { invoiceTimestamp: dateFilter },
            { checkTimestamp: dateFilter },
            { packageTimestamp: dateFilter },
            { deliveredTimestamp: dateFilter },
            { billedTimestamp: dateFilter }
          ]
        })
      }
    }
    
    // Get invoices matching the criteria
    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        invoiceTimestamp: true,
        checkTimestamp: true,
        packageTimestamp: true,
        deliveredTimestamp: true,
        billedTimestamp: true
      }
    })
    
    // Process data for heatmap (grouped by day and hour)
    const activityHeatmap = new Map()
    
    invoices.forEach(invoice => {
      // Process based on the activity type
      let timestamps = []
      
      if (activityType === 'invoicing' || activityType === 'all') {
        if (invoice.invoiceTimestamp) timestamps.push(invoice.invoiceTimestamp)
      }
      if (activityType === 'checking' || activityType === 'all') {
        if (invoice.checkTimestamp) timestamps.push(invoice.checkTimestamp)
      }
      if (activityType === 'packing' || activityType === 'all') {
        if (invoice.packageTimestamp) timestamps.push(invoice.packageTimestamp)
      }
      if (activityType === 'delivery' || activityType === 'all') {
        if (invoice.deliveredTimestamp) timestamps.push(invoice.deliveredTimestamp)
      }
      if (activityType === 'billing' || activityType === 'all') {
        if (invoice.billedTimestamp) timestamps.push(invoice.billedTimestamp)
      }
      
      // Count each timestamp in the appropriate day and hour
      timestamps.forEach(timestamp => {
        const m = moment(timestamp)
        const day = m.day() // 0-6 (Sunday-Saturday)
        const hour = m.hour() // 0-23
        const date = m.format('YYYY-MM-DD')
        
        const key = `${day}-${hour}`
        const current = activityHeatmap.get(key) || { day, hour, date, value: 0 }
        current.value += 1
        activityHeatmap.set(key, current)
      })
    })
    
    // Convert to array format for the heatmap
    const heatmapData = Array.from(activityHeatmap.values())
    
    return NextResponse.json({
      heatmapData,
      activityType
    })
    
  } catch (error) {
    console.error('Activity Heatmap API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 