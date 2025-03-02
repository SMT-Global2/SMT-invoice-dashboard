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

    return Response.json({
      success: true,
      data: parties,
      total,
      page,
      limit
    })

  } catch (error) {
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const validatedData = PartyCodeSchema.parse(body)
    
    const partyCode = await prisma.partyCode.create({
      data: validatedData
    })

    return Response.json({
      success: true,
      message: 'Party code created successfully'
    }, { status: 200 })

  } catch (error) {
    return Response.json({
      success: false,
      message: 'Invalid Request'
    }, { status: 400 })
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return Response.json({
        success: false,
        message: 'Party ID is required'
      }, { status: 400 })
    }

    const validatedData = PartyCodeSchema.partial().parse(updateData)
    
    const partyCode = await prisma.partyCode.update({
      where: { id },
      data: validatedData
    })

    return Response.json({
      success: true,
      message: 'Party code updated successfully'
    }, { status: 200 })
    
  } catch (error) {
    return Response.json({
      success: false,
      message: 'Invalid Request'
    }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
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
    const id = searchParams.get('id')
    
    if (!id) {
      return Response.json({
        success: false,
        message: 'Party ID is required'
      }, { status: 400 })
    }

    // Check if party code is in use
    const invoicesWithPartyCode = await prisma.invoice.count({
      where: {
        party : {
          id : id
        }
      }
    })

    console.log("HERE" , {invoicesWithPartyCode})

    if(invoicesWithPartyCode > 0) {
      console.log({invoicesWithPartyCode})
      return Response.json({
        success: false,
        message: 'Party code is in use by some invoices'
      }, { status: 409 })
    }
    
    await prisma.partyCode.delete({
      where: { id }
    })
    
    return Response.json({
      success: true,
      message: 'Party code deleted successfully'
    }, { status: 200 })
    
  } catch (error) {
    return Response.json({
      success: false,
      message: 'Invalid Request'
    }, { status: 400 })
  }
}
