import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { z } from 'zod';
import moment from 'moment';

// Validation schemas
const getQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().default(10),
  search: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  id: z.string().nullable().optional(), // Added ID parameter for individual item operations
  imported: z.string().nullable().optional(), // Add imported parameter
});

const createExpirySchema = z.object({
  partyCode: z.string().min(1, "Party code is required"),
  voucherNumber: z.string().min(1, "Voucher number is required"),
  image: z.array(z.string()).min(1, "At least one image is required"),
  expiryDate: z.string().transform((date) => moment(date).toDate()),
  generatedDate: z.string().default(() => moment().format()).transform((date) => moment(date).toDate()),
});

const updateExpirySchema = z.object({
  partyCode: z.string().min(1, "Party code is required").optional(),
  voucherNumber: z.string().min(1, "Voucher number is required").optional(),
  image: z.array(z.string()).min(1, "At least one image is required").optional(),
  expiryDate: z.coerce.date().optional(),
  generatedDate: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    
    // Parse query parameters
    const queryParsed = getQuerySchema.safeParse({
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      search: url.searchParams.get("search"),
      date: url.searchParams.get("date"),
      id: url.searchParams.get("id"), // Get ID from query params
      imported: url.searchParams.get("imported"), // Get imported parameter
    });
    
    if (!queryParsed.success) {
      return NextResponse.json({ message: 'Invalid query parameters', errors: queryParsed.error.flatten() }, { status: 400 });
    }
    
    const { page, limit, search, date, id, imported } = queryParsed.data;
    
    // If ID is provided, return a single item
    if (id) {
      const expiryItem = await prisma.expiry.findUnique({
        where: { id },
        include: { party: true }
      });
      
      if (!expiryItem) {
        return NextResponse.json(
          { message: "Expiry item not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ data: expiryItem });
    }
    
    // Check if searching for imported items
    const importedFilter = imported === "true";
    
    // Otherwise, return paginated list
    const query: Prisma.ExpiryFindManyArgs = {
      where: {
        AND: [ 
          // Search by party code, voucher number, etc.
          search ? {
            OR: [
              { partyCode: { contains: search, mode: 'insensitive' } },
              { voucherNumber: { contains: search, mode: 'insensitive' } },
              { 
                party: {
                  OR: [
                    { customerName: { contains: search, mode: 'insensitive' } },
                    { city: { contains: search, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          } : {},
          
          // Filter by date
          date ? {
            generatedDate: {
              gte: moment(date).startOf('day').toDate(),
              lt: moment(date).endOf('day').toDate()
            }
          } : {},
        ]
      },
      include: {
        party: true
      },
      orderBy: {
        generatedDate: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    };
    
    // Execute count and find queries
    const [total, data] = await Promise.all([
      prisma.expiry.count({ where: query.where }),
      prisma.expiry.findMany(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data,
      totalPages,
      currentPage: page,
      totalItems: total
    });
    
  } catch (error) {
    console.error("Error fetching expiry items:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    // Validate request body
    const validation = createExpirySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: validation.error.flatten() 
      }, { status: 400 });
    }
    
    const { partyCode, voucherNumber, image, expiryDate, generatedDate } = validation.data;
    
    // Check if party code exists
    const party = await prisma.partyCode.findUnique({
      where: { code: partyCode }
    });
    
    if (!party) {
      return NextResponse.json(
        { message: "Party code not found" },
        { status: 404 }
      );
    }
    
    // Create expiry item
    const expiryItem = await prisma.expiry.create({
      data: {
        partyCode,
        voucherNumber,
        image,
        expiryDate,
        generatedDate,
        expiryUsername: session.user.username,
        expiryTimestamp: moment().toDate(),
      },
      include: {
        party: true
      }
    });
    
    return NextResponse.json({
      message: "Expiry item created successfully",
      data: expiryItem
    });
    
  } catch (error) {
    console.error("Error creating expiry item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Missing ID parameter" },
        { status: 400 }
      );
    }
    
    // Validate request body
    const body = await req.json();
    const validatedBody = updateExpirySchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedBody.error.flatten() },
        { status: 400 }
      );
    }
    
    const updateData = validatedBody.data;
    
    // Check if expiry item exists
    const existingItem = await prisma.expiry.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Expiry item not found" },
        { status: 404 }
      );
    }
    
    // Check if party code exists if it's being updated
    if (updateData.partyCode && updateData.partyCode !== existingItem.partyCode) {
      const party = await prisma.partyCode.findUnique({
        where: { code: updateData.partyCode }
      });
      
      if (!party) {
        return NextResponse.json(
          { message: "Party code not found" },
          { status: 404 }
        );
      }
    }
    
    // Update expiry item
    const updatedItem = await prisma.expiry.update({
      where: { id },
      data: updateData,
      include: { party: true }
    });
    
    return NextResponse.json({
      message: "Expiry item updated successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error updating expiry item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Missing ID parameter" },
        { status: 400 }
      );
    }
    
    // Check if expiry item exists
    const existingItem = await prisma.expiry.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Expiry item not found" },
        { status: 404 }
      );
    }
    
    // Delete expiry item
    await prisma.expiry.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: "Expiry item deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting expiry item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 