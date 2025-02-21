import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment'

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if(session.user.type !== 'ADMIN') {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  return null
}

export async function GET(request: Request) {
  const authError = await checkAdminAccess()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date')
    const sortField = searchParams.get('sortField') || 'invoiceTimestamp'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {
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

    // Get total count
    const total = await prisma.invoice.count({ where })

    // Get paginated invoices
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder
      },
      include: {
        party: true,
        invoicedBy: true,
        checkedBy: true,
        packedBy: true,
        deliveredBy: true,
        pickedUpBy: true
      },
      skip: page * limit,
      take: limit
    })

    return NextResponse.json({
      invoices,
      total,
    })

  } catch (error) {
    console.error('Analytics API Error:', (error as any).message)
    return new NextResponse('Internal Error', { status: 500 })
  }
}