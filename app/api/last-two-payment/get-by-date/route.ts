import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date from query params
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const entriesPerPayment = parseInt(searchParams.get("entriesLimit") || "2000");

    if (!date) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Parse the date and create date range for the query
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log(`Fetching last two payments for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Using limit: ${limit}, page: ${page}, entriesPerPayment: ${entriesPerPayment}`);

    // Use a more efficient query with pagination
    // Use type assertion to bypass TypeScript errors
    const prismaAny = prisma as any;
    
    try {
      const lastTwoPayments = await prismaAny.lastTwoPayment.findMany({
        where: {
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          paymentEntries: {
            take: entriesPerPayment // Allow loading many more entries
          }
        },
        skip: (page - 1) * limit,
        take: limit
      });

      // Count total records
      const totalCount = await prismaAny.lastTwoPayment.count({
        where: {
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalEntries = lastTwoPayments.reduce((sum: number, p: any) => sum + (p.paymentEntries?.length || 0), 0);
      console.log(`Found ${lastTwoPayments.length} payment records with ${totalEntries} total entries`);

      if (!lastTwoPayments || lastTwoPayments.length === 0) {
        return NextResponse.json({ 
          message: "No last two payment data found for the selected date",
          lastTwoPayments: []
        });
      }

      return NextResponse.json({
        message: "Last two payment data retrieved successfully",
        lastTwoPayments,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalEntries
        }
      });
    } catch (prismaError: any) {
      console.error("Prisma error:", prismaError);
      
      // Check if this is a schema issue
      if (prismaError.message.includes("Unknown")) {
        return NextResponse.json({
          error: "Database schema error. Try running 'npx prisma generate'",
          details: prismaError.message
        }, { status: 500 });
      }
      
      throw prismaError; // Re-throw to be caught by outer try/catch
    }
  } catch (error: any) {
    console.error("Error fetching last two payment data:", error);
    return NextResponse.json({ 
      error: "Failed to fetch last two payment data", 
      details: error.message 
    }, { 
      status: 500 
    });
  }
} 