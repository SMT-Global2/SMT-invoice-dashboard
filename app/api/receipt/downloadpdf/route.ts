import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import moment from 'moment';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse the date from query parameter
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    
    if (!dateParam) {
      return NextResponse.json(
        { message: "Date parameter is required" },
        { status: 400 }
      );
    }
    
    // Find all receipts for the given date
    const receipts = await prisma.receipt.findMany({
      where: {
        generatedDate: {
          gte: moment(dateParam).startOf('day').toDate(),
          lt: moment(dateParam).endOf('day').toDate()
        }
      },
      include: {
        party: true
      },
      orderBy: {
        receiptNumber: 'asc'
      }
    });
    
    if (receipts.length === 0) {
      return NextResponse.json(
        { message: "No receipts found for the specified date" },
        { status: 404 }
      );
    }
    
    // Return receipt data
    return NextResponse.json({
      success: true,
      data: receipts,
      date: dateParam
    });
    
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 