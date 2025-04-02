import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  try {
    // Get all unique regional codes from the party codes
    const result = await prisma.partyCode.findMany({
      select: {
        regionalCode: true
      },
      where: {
        regionalCode: {
          not: null
        }
      },
      distinct: ['regionalCode']
    })

    // Extract the regional codes and filter out any null values
    const regionalCodes = result
      .map(item => item.regionalCode)
      .filter(Boolean) as string[]

    return NextResponse.json({ regionalCodes })
  } catch (error) {
    console.error('Error fetching regional codes:', error)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 