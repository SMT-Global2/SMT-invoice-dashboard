import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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


export async function GET() {
  const authError = await checkAdminAccess()
  if (authError) return authError

  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get all invoices
    const invoices = await prisma.invoice.findMany({
      orderBy: {
        invoiceNumber: 'desc'
      },
      include: {
        party: true,
        // invoicedBy: true,
        // checkedBy: true,
        // packedBy: true,
        // deliveredBy: true,
        // pickedUpBy: true
      }
    })

    // Calculate total
    const invoiceTotal = invoices.length

    return NextResponse.json({
      invoices,
      invoiceTotal,
    })

  } catch (error) {
    console.error('Analytics API Error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}