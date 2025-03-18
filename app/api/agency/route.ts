import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AgencyCodeSchema } from '@/store/useAgencyStore'

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
              companyName: {
                not : null,
              },
            },
            {
              companyName: {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        },
        {
          AND : [
            {
              shortName: {
                not : null,
              },
            },
            {
              shortName: {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        }
      ]
    } : {}

    const [total, agencies] = await Promise.all([
      prisma.agencyCode.count({ where }),
      prisma.agencyCode.findMany({
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
      data: agencies,
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
    const validatedData = AgencyCodeSchema.parse(body)
    
    const agencyCode = await prisma.agencyCode.create({
      data: validatedData
    })

    return Response.json({
      success: true,
      message: 'Agency code created successfully'
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
        message: 'Agency ID is required'
      }, { status: 400 })
    }

    const validatedData = AgencyCodeSchema.partial().parse(updateData)
    
    const agencyCode = await prisma.agencyCode.update({
      where: { id },
      data: validatedData
    })

    return Response.json({
      success: true,
      message: 'Agency code updated successfully'
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
        message: 'Agency ID is required'
      }, { status: 400 })
    }

    // Check if agency code is in use by inventory
    const inventoryWithAgencyCode = await prisma.inventory.count({
      where: {
        agency : {
          id : id
        }
      }
    })

    if(inventoryWithAgencyCode > 0) {
      return Response.json({
        success: false,
        message: 'Agency code is in use by some inventory records'
      }, { status: 409 })
    }
    
    await prisma.agencyCode.delete({
      where: { id }
    })
    
    return Response.json({
      success: true,
      message: 'Agency code deleted successfully'
    }, { status: 200 })
    
  } catch (error) {
    return Response.json({
      success: false,
      message: 'Invalid Request'
    }, { status: 400 })
  }
} 