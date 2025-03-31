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
  paymentMethod: z.enum(["NONE", "CASH", "CHEQUE"]).nullable().optional(),
  id: z.string().nullable().optional(), // Added ID parameter for individual item operations
});

// Schema for currency bills
const currencyBillsSchema = z.object({
  500: z.number().nonnegative().default(0),
  200: z.number().nonnegative().default(0),
  100: z.number().nonnegative().default(0),
  50: z.number().nonnegative().default(0),
  20: z.number().nonnegative().default(0),
  10: z.number().nonnegative().default(0),
});

// Schema for cheque
const chequeSchema = z.object({
  number: z.string().optional().nullable(),
  bank: z.string().optional().nullable(),
  date: z.string().optional().transform(date => moment(date).toDate()).nullable(),
  amount: z.number().optional().nullable().refine(val => !val || (val && val > 0), "Amount must be positive"),
});

// Schema for creating receipt()
const createReceiptSchema = z.object({
  partyCode: z.string().min(1, "Party code is required"),
  amount: z.number().positive("Amount must be positive"),
  remarks: z.string().optional(),
  paymentMethod: z.enum(["NONE", "CASH", "CHEQUE"]),
  currencyBills: currencyBillsSchema.optional().nullable(),
  cheque: chequeSchema.optional().nullable(),
  receiptNumber: z.number().nullable().optional(),
  generatedDate: z.string().default(() => moment().format()).transform((date) => moment(date).toDate()),
}).refine(data => {

  // Validate based on payment method
  // if (data.paymentMethod === "CASH" && !data.currencyBills) {
  //   return false;
  // }
  // if (data.paymentMethod === "CHEQUE" && !data.cheque) {
  //   return false;
  // }

  return true;
}, {
  message: "Currency bills required for CASH payment or Cheque details required for CHEQUE payment",
  path: ["paymentMethod"],
});

// Schema for updating receipt
const updateReceiptSchema = z.object({
  partyCode: z.string().min(1, "Party code is required").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  remarks: z.string().optional().nullable(),
  paymentMethod: z.enum(["NONE", "CASH", "CHEQUE"]).optional(),
  currencyBills: currencyBillsSchema.optional().nullable(),
  cheque: chequeSchema.optional().nullable(),
  generatedDate: z.string().optional().transform(date => date ? moment(date).toDate() : undefined),
  receiptNumber: z.number().nullable().optional(),
}).refine(data => {
  // Validate based on payment method
  if (data.paymentMethod === "CASH" && !data.currencyBills) {
    return false;
  }
  if (data.paymentMethod === "CHEQUE" && !data.cheque) {
    return false;
  }
  return true;
}, {
  message: "Currency bills required for CASH payment or Cheque details required for CHEQUE payment",
  path: ["paymentMethod"],
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
      paymentMethod: url.searchParams.get("paymentMethod"),
      id: url.searchParams.get("id"), // Get ID from query params
    });
    
    if (!queryParsed.success) {
      return NextResponse.json({ message: 'Invalid query parameters', errors: queryParsed.error.flatten() }, { status: 400 });
    }
    
    const { page, limit, search, date, paymentMethod, id } = queryParsed.data;
    
    // If ID is provided, return a single item
    if (id) {
      const receiptItem = await prisma.receipt.findUnique({
        where: { id },
        include: { party: true }
      });
      
      if (!receiptItem) {
        return NextResponse.json(
          { message: "Receipt item not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ data: receiptItem });
    }
    
    // Otherwise, return paginated list
    const query: Prisma.ReceiptFindManyArgs = {
      where: {
        AND: [ 
          // Search by party code, receipt number, etc.
          search ? {
            OR: [
              { partyCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { receiptNumber: search.match(/^\d+$/) ? { equals: parseInt(search) } : undefined },
              { remarks: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
              { 
                party: {
                  OR: [
                    { customerName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
                    { city: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
                  ]
                }
              }
            ].filter(Boolean)
          } : {},
          
          // Filter by date
          date ? {
            generatedDate: {
              gte: moment(date).startOf('day').toDate(),
              lt: moment(date).endOf('day').toDate()
            }
          } : {},
          
          // Filter by payment method
          paymentMethod ? {
            paymentMethod
          } : {}
        ]
      },
      include: {
        party: true
      },
      orderBy: {
        receiptNumber: "desc"
      },
      skip: (page - 1) * limit,
      take: limit
    };
    
    // Execute count and find queries
    const [total, data] = await Promise.all([
      prisma.receipt.count({ where: query.where }),
      prisma.receipt.findMany(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      data,
      totalPages,
      currentPage: page,
      totalItems: total
    });
    
  } catch (error) {
    console.error("Error fetching receipt items:", error);
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
    const validation = createReceiptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: validation.error.flatten() 
      }, { status: 400 });
    }

    if(validation.data?.paymentMethod === 'CASH') {
      if(!validation.data?.receiptNumber) {
        return NextResponse.json({
          message: 'Receipt number is required',
          errors: validation.error
        }, { status: 400 });
      }
    }

    if(validation.data?.paymentMethod === 'NONE') {
      return NextResponse.json({
        message: 'Payment method is required',
        errors: validation.error
      }, { status: 400 });
    }

    const { partyCode, amount, remarks, paymentMethod, currencyBills, cheque, generatedDate } = validation.data;
    
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

    const receiptNumber = validation.data?.receiptNumber;
    
    // Create receipt
    const receiptItem = await prisma.receipt.create({
      data: {
        receiptNumber,
        partyCode,
        amount,
        remarks,
        paymentMethod,
        currencyBills,
        cheque,
        generatedDate,
      },
      include: {
        party: true
      }
    });
    
    return NextResponse.json({
      message: "Receipt created successfully",
      data: receiptItem
    });
    
  } catch (error) {
    console.error("Error creating receipt:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Receipt ID is required" },
        { status: 400 }
      );
    }
    
    // Check if receipt exists
    const existingReceipt = await prisma.receipt.findUnique({
      where: { id }
    });
    
    if (!existingReceipt) {
      return NextResponse.json(
        { message: "Receipt not found" },
        { status: 404 }
      );
    }
    
    const body = await req.json();
    
    // Validate request body
    const validation = updateReceiptSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Validation error', 
        errors: validation.error.flatten() 
      }, { status: 400 });
    }

    if(validation.data?.paymentMethod === 'CASH') {
      if(!validation.data?.receiptNumber) {
        return NextResponse.json({
          message: 'Receipt number is required',
          errors: validation.error
        }, { status: 400 });
      }
    }

    if(validation.data?.paymentMethod === 'NONE') {
      return NextResponse.json({
        message: 'Payment method is required',
        errors: validation.error
      }, { status: 400 });
    }

    const { partyCode, amount, remarks, paymentMethod, currencyBills, cheque, generatedDate , receiptNumber } = validation.data;
    
    // If partyCode is provided, check if it exists
    if (partyCode) {
      const party = await prisma.partyCode.findUnique({
        where: { code: partyCode }
      });
      
      if (!party) {
        return NextResponse.json(
          { message: "Party code not found" },
          { status: 404 }
        );
      }
    }
    
    // Update receipt
    const updatedReceipt = await prisma.receipt.update({
      where: { id },
      data: {
        receiptNumber,
        partyCode,
        amount,
        remarks,
        paymentMethod,
        currencyBills,
        cheque,
        generatedDate,
        updatedAt: new Date()
      },
      include: {
        party: true
      }
    });
    
    return NextResponse.json({
      message: "Receipt updated successfully",
      data: updatedReceipt
    });
    
  } catch (error) {
    console.error("Error updating receipt:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Receipt ID is required" },
        { status: 400 }
      );
    }
    
    // Check if receipt exists
    const existingReceipt = await prisma.receipt.findUnique({
      where: { id }
    });
    
    if (!existingReceipt) {
      return NextResponse.json(
        { message: "Receipt not found" },
        { status: 404 }
      );
    }
    
    // Delete receipt
    await prisma.receipt.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: "Receipt deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 