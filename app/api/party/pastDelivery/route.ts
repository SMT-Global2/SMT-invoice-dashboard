import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PartyCodeSchema } from '@/store/usePartyStore'

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const partyCode = searchParams.get('partyCode')
    
    if (!partyCode) {
      return Response.json({
        success: false,
        message: 'Party code is required'
      }, { status: 400 })
    }

    // Fetch past deliveries for the party code
    const pastDeliveries = await prisma.invoice.findMany({
      where: {
        partyCode: partyCode,
        deliveryStatus: 'DELIVERED'
      },
      select: {
        id: true,
        invoiceNumber: true,
        generatedDate: true,
        deliveredTimestamp: true,
        deliveredLocationLink: true
      },
      orderBy: {
        deliveredTimestamp: 'desc'
      }
    })

    return Response.json({
      success: true,
      data: pastDeliveries
    })

  } catch (error) {
    console.error('Error fetching past deliveries:', error)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
