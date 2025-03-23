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
});

const createExpirySchema = z.object({
  partyCode: z.string().min(1, "Party code is required"),
  voucherNumber: z.string().min(1, "Voucher number is required"),
  image: z.array(z.string()).min(1, "At least one image is required"),
  expiryDate: z.string().transform((date) => moment(date).toDate()),
  generatedDate: z.string().default(() => moment().format()).transform((date) => moment(date).toDate()),
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
    });
    
    if (!queryParsed.success) {
      return NextResponse.json({ message: 'Invalid query parameters', errors: queryParsed.error.flatten() }, { status: 400 });
    }
    
    const { page, limit, search, date } = queryParsed.data;
    
    const query: Prisma.ExpiryFindManyArgs = {
      where: {
        AND:  [
          // Search by party code
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