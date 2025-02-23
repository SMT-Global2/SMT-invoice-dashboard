import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PartyCodeSchema } from '@/store/usePartyStore'

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
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const skip = page * limit

    const where : any = search ? {
      OR: [
        {
          code: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          AND : [
            {
              city: {
                not : null,
              },
            },
            {
              city: {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        },
        {
          AND : [
            {
              customerName: {
                not : null,
              },
            },
            {
              customerName : {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        },
      ]
    } : {}

    const [total, parties] = await Promise.all([
      prisma.partyCode.count({ where }),
      prisma.partyCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { 
          createdAt: 'desc' 
        }
      })
    ])

    return NextResponse.json({
      data: parties,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching parties:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(request: Request) {
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
    const body = await request.json()
    const validatedData = PartyCodeSchema.parse(body)
    
    const partyCode = await prisma.partyCode.create({
      data: validatedData
    })
    
    return NextResponse.json(partyCode)
  } catch (error) {
    console.error('Error creating party:', error)
    return new NextResponse('Invalid Request', { status: 400 })
  }
}

export async function PUT(request: Request) {
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
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return new NextResponse('Party ID is required', { status: 400 })
    }
    
    const validatedData = PartyCodeSchema.partial().parse(updateData)
    
    const partyCode = await prisma.partyCode.update({
      where: { id },
      data: validatedData
    })
    
    return NextResponse.json(partyCode)
  } catch (error) {
    console.error('Error updating party:', error)
    return new NextResponse('Invalid Request', { status: 400 })
  }
}

export async function DELETE(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return new NextResponse('Party ID is required', { status: 400 })
    }
    
    await prisma.partyCode.delete({
      where: { id }
    })
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting party:', error)
    return new NextResponse('Invalid Request', { status: 400 })
  }
}
