import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Get all statements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const date = searchParams.get('date');
    
    let statements;
    
    if (date) {
      // Parse the date string (assuming format is YYYY-MM-DD)
      const searchDate = new Date(date);
      const startDate = new Date(searchDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);
      
      statements = await prisma.statement.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          reports: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      statements = await prisma.statement.findMany({
        include: {
          reports: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    return NextResponse.json({ statements });
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json({ error: "Failed to fetch statements" }, { status: 500 });
  }
}

// Handle POST request to create a new statement
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const username = session?.user?.username || null;
    
    // Get the request body
    const body = await req.json();
    const { fileUrl, reports, date } = body;
    
    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }
    
    // Create statement
    const statement = await prisma.statement.create({
      data: {
        fileUrl,
        uploadedUsername: username,
        uploadedTimestamp: new Date(),
        reports: {
          create: reports.map((report: any) => ({
            title: report.title,
            tableData: report.tableData,
            images: report.images || [],
            saved: false
          }))
        }
      },
      include: {
        reports: true
      }
    });
    
    return NextResponse.json({ success: true, statement }, { status: 201 });
  } catch (error) {
    console.error('Error creating statement:', error);
    return NextResponse.json({ error: 'Failed to create statement' }, { status: 500 });
  }
} 