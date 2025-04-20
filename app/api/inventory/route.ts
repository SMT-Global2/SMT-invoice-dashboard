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
  voucher: z.string().nullable().optional(), // Add voucher parameter
  status: z.string().nullable().optional(), // Add status filter parameter
  image: z.string().nullable().optional(), // Add image filter parameter
});

const createInventorySchema = z.object({
  agencyCode: z.string().min(1, "Agency code is required"),
  invoiceNumber: z.string().min(1, "Bill / Order / Invoice No. is required"),
  invoiceDate: z.coerce.date().or(z.string().transform(str => new Date(str))),
  dueDate: z.coerce.date().or(z.string().transform(str => new Date(str))).optional(),
  lrNumber: z.string().nullable().optional(),
  lrDate: z.coerce.date().or(z.string().transform(str => new Date(str))).nullable().optional(),
  through: z.string().nullable().optional(),
  packages: z.string().nullable().optional(),
  generatedDate: z.coerce.date().or(z.string().transform(str => new Date(str))).default(new Date()),
});

const updateInventorySchema = z.object({
  agencyCode: z.string().min(1, "Agency code is required").optional(),
  invoiceNumber: z.string().min(1, "Bill / Order / Invoice No. is required").optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  lrNumber: z.string().nullable().optional(),
  lrDate: z.coerce.date().nullable().optional(),
  through: z.string().nullable().optional(),
  packages: z.string().nullable().optional(),
  generatedDate: z.coerce.date().optional(),
  image: z.array(z.string()).optional(),
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
      voucher: url.searchParams.get("voucher"), // Get voucher parameter
      status: url.searchParams.get("status"), // Get status filter
      image: url.searchParams.get("image"), // Get image filter
    });
    
    if (!queryParsed.success) {
      return NextResponse.json({ message: 'Invalid query parameters', errors: queryParsed.error.flatten() }, { status: 400 });
    }
    
    const { page, limit, search, date, id, voucher, status, image } = queryParsed.data;
    
    // If ID is provided, return a single item
    if (id) {
      const inventoryItem = await prisma.inventory.findUnique({
        where: { id },
        include: { agency: true }
      });
      
      if (!inventoryItem) {
        return NextResponse.json(
          { message: "Inventory item not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ data: inventoryItem });
    }
    
    // Check if searching for voucher items (items that have been checked)
    const isVoucher = voucher === "true";
    
    // Build the WHERE clause for the query
    const whereConditions: Prisma.InventoryWhereInput[] = [];
    
    // Base condition for voucher items (always checked items)
    if (isVoucher) {
      whereConditions.push({ inventoryCheckTimestamp: { not: null } });
      
      // Status filter (vouchered/checked)
      if(status === "All Status") {
      } else if (status === "vouchered") {
        whereConditions.push({ inventoryVoucherTimestamp  : { not: null } });
      } else if (status === "checked") {
        whereConditions.push({ 
          inventoryVoucherTimestamp: null 
        });
      }
      
      // Image filter (uploaded/remaining)
      if(image === "All Images") {
      } else if (image === "uploaded") {
        whereConditions.push({ 
          image: { 
            isEmpty: false 
          } 
        });
      } else if (image === "remaining") {
        whereConditions.push({ 
          image: { 
            isEmpty: true 
          } 
        });
      }
    }

    // Search by agency code, invoice number, etc.
    if (search) {
      whereConditions.push({
        OR: [
          { 
            agencyCode: { 
              contains: search, 
              mode: 'insensitive' 
            } 
          },
          { 
            agency: {
              OR: [
                { 
                  companyName: { 
                    contains: search, 
                    mode: 'insensitive' 
                  } 
                },
                { 
                  shortName: { 
                    contains: search, 
                    mode: 'insensitive' 
                  } 
                }
              ]
            }
          }
        ]
      });
    }
    
    // Filter by date
    if (date) {
      whereConditions.push({
        generatedDate: {
          gte: moment(date).startOf('day').toDate(),
          lt: moment(date).endOf('day').toDate()
        }
      });
    }
    
    // Build the final query
    const query: Prisma.InventoryFindManyArgs = {
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      include: {
        agency: true
      },
      orderBy: {
        generatedDate: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    };
    
    // Execute count and find queries
    const [total, data] = await Promise.all([
      prisma.inventory.count({ where: query.where }),
      prisma.inventory.findMany(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data,
      totalPages,
      currentPage: page,
      totalItems: total
    });
    
  } catch (error : any) {
    console.error("Error fetching inventory items:", error.message);
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
    const validation = createInventorySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: validation.error.flatten() 
      }, { status: 400 });
    }
    
    const { agencyCode, invoiceNumber, invoiceDate, dueDate, lrNumber, lrDate, through, packages, generatedDate } = validation.data;
    // Check if agency code exists
    const agency = await prisma.agencyCode.findUnique({
      where: { code: agencyCode }
    });
    
    if (!agency) {
      return NextResponse.json(
        { message: "Agency code not found" },
        { status: 404 }
      );
    }
    
    // Convert date objects to ISO strings for safe serialization
    const data = {
      agencyCode,
      invoiceNumber: invoiceNumber.toString(),
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      lrNumber,
      lrDate: lrDate ? new Date(lrDate) : null,
      through,
      packages,
      generatedDate: new Date(generatedDate),
      orderNumber: null,
      orderDate: null,
      inventoryCheckUsername: session.user.username,
      inventoryCheckTimestamp: new Date(),
      image: [],
    };
    
    // Create inventory item
    const inventoryItem = await prisma.inventory.create({
      data,
      include: {
        agency: true
      }
    });
    
    return NextResponse.json({
      message: "Inventory item created successfully",
      data: inventoryItem
    });
    
  } catch (error : any) {
    console.error("Error creating inventory item:", error.message);
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
    const validatedBody = updateInventorySchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedBody.error.flatten() },
        { status: 400 }
      );
    }
    
    const updateData = validatedBody.data;
    
    // Check if inventory item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Check if agency code exists (if updating)
    if (updateData.agencyCode) {
      const agency = await prisma.agencyCode.findUnique({
        where: { code: updateData.agencyCode }
      });
      
      if (!agency) {
        return NextResponse.json(
          { message: "Agency code not found" },
          { status: 404 }
        );
      }
    }
    
    // Update inventory item with type assertion
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: updateData as any, // Use type assertion to bypass TypeScript check
      include: { agency: true }
    });
    
    return NextResponse.json({
      message: "Inventory item updated successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error updating inventory item:", error);
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
    
    // Check if inventory item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Delete inventory item
    await prisma.inventory.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: "Inventory item deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 