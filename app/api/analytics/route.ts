import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone';
import { CheckStatus, DeliveryStatus, PackageStatus } from '@prisma/client';


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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date')
  
    // Build where clause
    const where: any = {
      AND: [
        {
          OR: [
            ...(isNaN(parseInt(search)) ? [] : [{ invoiceNumber: parseInt(search) }]),
            { partyCode: { contains: search, mode: 'insensitive' } },
            { party: { customerName: { contains: search, mode: 'insensitive' } } }
          ]
        },
        ...(date ? [{
          invoiceTimestamp: {
            gte: moment(date).startOf('day').toDate(),
            lte: moment(date).endOf('day').toDate()
          }
        }] : [])
      ]
    };

    const [
      totalGenerated,
      totalChecked,
      totalPacked,
      totalPickedUp,
      totalDelivered,
      totalOTC
    ] = await Promise.all([
      prisma.invoice.count({ where }), // ✅ Properly nested inside `where`
      prisma.invoice.count({ where: { ...where, checkStatus: CheckStatus.CHECKED } }),
      prisma.invoice.count({ where: { ...where, packageStatus: PackageStatus.PACKED } }),
      prisma.invoice.count({ where: { ...where, deliveryStatus: { in: [DeliveryStatus.PICKED_UP, DeliveryStatus.DELIVERED] } } }),
      prisma.invoice.count({ where: { ...where, deliveryStatus: DeliveryStatus.DELIVERED } }),
      prisma.invoice.count({ where: { ...where, isOtc: true } })
    ]);


    return NextResponse.json({
      analytics: {
        totalGenerated: totalGenerated ?? 0,
        totalChecked: totalChecked ?? 0,
        totalPacked: totalPacked ?? 0,
        totalPickedUp: totalPickedUp ?? 0,
        totalDelivered: totalDelivered ?? 0,
        totalOTC: totalOTC ?? 0
      }
    })

  } catch (error) {
    console.error('Analytics API Error:', (error as any).message)
    return new NextResponse('Internal Error', { status: 500 })
  }
}