import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schema
const getQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().default(10),
  search: z.string().nullable().optional(),
  id: z.string().nullable().optional(),
})

const createTransportationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPersonName: z.string().optional().or(z.literal("")),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  remarks: z.string().optional().or(z.literal(""))
})

const updateTransportationSchema = createTransportationSchema.partial()

// GET /api/transportation - Fetch all transportation companies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const validated = getQuerySchema.parse(Object.fromEntries(searchParams))
    
    const { page, limit, search, id } = validated

    // If a specific ID is requested, return just that transportation company
    if (id) {
      const transportation = await prisma.transportation.findUnique({
        where: { id }
      })
      
      // if (!transportation) {
      //   return NextResponse.json({ error: 'Transportation not found' }, { status: 404 })
      // }
      
      return NextResponse.json(transportation)
    }
    
    // Build the search query
    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { contactPersonName: { contains: search, mode: Prisma.QueryMode.insensitive } }
          ],
        }
      : {}
    
    // Get total count for pagination
    const total = await prisma.transportation.count({ where })
    
    // Get paginated list
    const transportations = await prisma.transportation.findMany({
      where,
      orderBy: { companyName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    
    return NextResponse.json({
      data: transportations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching transportations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transportation companies' },
      { status: 500 }
    )
  }
}

// POST /api/transportation - Create a new transportation company
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const validatedData = createTransportationSchema.parse(body)
    
    const newTransportation = await prisma.transportation.create({
      data: {
        companyName: validatedData.companyName,
        contactPersonName: validatedData.contactPersonName || '',
        contactNumber: validatedData.contactNumber,
        email: validatedData.email || '',
        city: validatedData.city,
        remarks: validatedData.remarks || ''
      }
    })
    
    return NextResponse.json(newTransportation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating transportation:', error)
    return NextResponse.json(
      { error: 'Failed to create transportation company' },
      { status: 500 }
    )
  }
}

// PUT /api/transportation - Update an existing transportation company
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...data } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transportation ID is required' },
        { status: 400 }
      )
    }
    
    const validatedData = updateTransportationSchema.parse(data)
    
    const updatedTransportation = await prisma.transportation.update({
      where: { id },
      data: {
        companyName: validatedData.companyName,
        contactPersonName: validatedData.contactPersonName || undefined,
        contactNumber: validatedData.contactNumber || undefined,
        email: validatedData.email || undefined,
        city: validatedData.city || undefined,
        remarks: validatedData.remarks || undefined
      }
    })
    
    return NextResponse.json(updatedTransportation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating transportation:', error)
    return NextResponse.json(
      { error: 'Failed to update transportation company' },
      { status: 500 }
    )
  }
}

// DELETE /api/transportation - Delete a transportation company
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transportation ID is required' },
        { status: 400 }
      )
    }
    
    await prisma.transportation.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Transportation deleted successfully' })
  } catch (error) {
    console.error('Error deleting transportation:', error)
    return NextResponse.json(
      { error: 'Failed to delete transportation company' },
      { status: 500 }
    )
  }
} 