import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone'
import { CheckStatus, DeliveryStatus, PackageStatus, BilledStatus } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  if(session.user.type !== 'ADMIN') {
    return Response.json({
      success: false,
      message: 'Forbidden'
    }, { status: 403 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'invoiceTimestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const progressStage = searchParams.get('progressStage') || 'all';
    const date = searchParams.get('date');
    const regionalCodesParam = searchParams.get('regionalCodes');
    const transporterFilter = searchParams.get('transporterFilter') || 'all';
    const fetchAll = searchParams.get('fetchAll') === 'true'

    // Build where clause
    let where: any = {
      AND: [
        {
          OR: [
            ...(isNaN(parseInt(search)) ? [] : [{
              invoiceNumber: parseInt(search)
            }]),
            { partyCode: { 
              contains: search, 
              mode: 'insensitive' 
            }},
            { party: { 
              customerName: { 
                contains: search, 
                mode: 'insensitive' 
              } 
            }}
          ]
        },
        ...(date ? [{
          invoiceTimestamp: {
            gte: moment(date).startOf('day').toDate(),
            lte: moment(date).endOf('day').toDate()
          }
        }] : [])
      ]
    }

    // Add regional codes filter if provided
    let regionalCodesFilter = {}
    if (regionalCodesParam) {
      try {
        const regionalCodes = JSON.parse(regionalCodesParam)
        if (Array.isArray(regionalCodes) && regionalCodes.length > 0) {
          regionalCodesFilter = {
            party: {
              regionalCode: {
                in: regionalCodes
              }
            }
          }
          where.AND.push(regionalCodesFilter)
        }
      } catch (error) {
        console.error('Error parsing regional codes:', error)
      }
    }

    // Add process stage filter
    switch (progressStage) {
      case 'generated':
        // Only generated, not checked
        where.AND.push({ checkStatus: CheckStatus.NOT_CHECKED })
        break
      case 'checked':
        // Checked but not packed
        where.AND.push({ 
          checkStatus: CheckStatus.CHECKED,
          packageStatus: PackageStatus.NOT_PACKED
        })
        break
      case 'packed':
        // Packed but not picked up or delivered
        where.AND.push({ 
          packageStatus: PackageStatus.PACKED,
          deliveryStatus: DeliveryStatus.NOT_DELIVERED
        })
        break
      case 'picked_up':
        // Picked up but not delivered
        where.AND.push({ deliveryStatus: DeliveryStatus.PICKED_UP })
        break
      case 'delivered':
        // Delivered but not billed
        where.AND.push({ 
          deliveryStatus: DeliveryStatus.DELIVERED,
          billedStatus: BilledStatus.NOT_BILLED
        })
        break
      case 'billed':
        // Fully billed
        where.AND.push({ billedStatus: BilledStatus.BILLED })
        break
      case 'incomplete':
        // Not fully processed (not delivered or not billed)
        where.AND.push({ 
          OR: [
            { deliveryStatus: { not: DeliveryStatus.DELIVERED } },
            { billedStatus: BilledStatus.NOT_BILLED }
          ]
        })
        break
      case 'complete':
        // Fully processed (delivered and billed)
        where.AND.push({ 
          deliveryStatus: DeliveryStatus.DELIVERED,
          billedStatus: BilledStatus.BILLED
        })
        break
    }

    // Add transportation filter if specified
    if (transporterFilter && transporterFilter !== 'all') {
      if (transporterFilter === 'none') {
        // Only invoices without transportation
        where.AND.push({
          transportationId: null
        });
      } else {
        // Specific transporter
        where.AND.push({
          transportationId: transporterFilter
        });
      }
    }

    // For analytics, fetch counts of invoices by status
    const [
      total, 
      invoices,
      totalChecked,
      totalPacked,
      totalPickedUp,
      totalDelivered,
      totalBilled,
      totalOTC,
      totalTransportDeliveries
    ] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: page * limit,
        take: limit,
        include: {
          party: true,
          transportation: true
        },
        orderBy: {
          [sortField]: sortOrder
        } as any
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          checkStatus: CheckStatus.CHECKED
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          packageStatus: PackageStatus.PACKED
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          deliveryStatus: DeliveryStatus.PICKED_UP
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          deliveryStatus: DeliveryStatus.DELIVERED
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          billedStatus: BilledStatus.BILLED
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          isOtc: true
        }
      }),
      prisma.invoice.count({ 
        where: {
          ...where,
          deliveryStatus: DeliveryStatus.DELIVERED,
          transportationId: { not: null }
        }
      })
    ])

    return NextResponse.json({
      invoices: invoices.map(invoice => ({
        ...invoice,
        transportationName: invoice.transportation?.companyName || null
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filteredAnalytics: {
        totalGenerated: total,
        totalChecked,
        totalPacked,
        totalPickedUp,
        totalDelivered,
        totalTransportDeliveries,
        totalBilled,
        totalOTC
      }
    })

  } catch (error) {
    console.error('Analytics API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}