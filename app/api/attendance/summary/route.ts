import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { Attendance, User } from "@prisma/client";

// Define types for summary data
type AttendanceSummaryItem = {
  userId: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  total: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
};

type AttendanceRecord = {
  id: string;
  userId: string;
  date: Date;
  type: 'FULL_DAY' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
};

// Validation schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
});

// GET handler to fetch attendance summary for a date range
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const userIdParam = searchParams.get('userId');
    
    const validatedParams = querySchema.parse({
      startDate: startDateParam || undefined,
      endDate: endDateParam || undefined,
      userId: userIdParam || undefined,
    });
    
    // Parse dates
    const startDate = validatedParams.startDate 
      ? new Date(validatedParams.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First day of current month
    
    const endDate = validatedParams.endDate
      ? new Date(validatedParams.endDate)
      : new Date(); // Today
    
    // Set time to start of day for startDate and end of day for endDate
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Prepare filter conditions
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    // Add user filter if specified
    if (validatedParams.userId) {
      where.userId = validatedParams.userId;
    }
    
    // Fetch all attendance records for the specified period and user(s)
    const attendanceRecords = await prisma.user.findMany({
      where: {
        attendance: {
          some: where
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        attendance: {
          where,
          select: {
            id: true,
            userId: true,
            date: true,
            type: true,
          }
        }
      }
    });
    
    // Transform the data into the expected format
    const result = attendanceRecords.map(user => {
      // Count attendance types
      const summary = {
        userId: user.id,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        total: user.attendance.length,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username
        }
      };
      
      // Count each type
      user.attendance.forEach(record => {
        switch (record.type) {
          case 'FULL_DAY':
            summary.present += 1;
            break;
          case 'LATE':
            summary.late += 1;
            break;
          case 'HALF_DAY':
            summary.halfDay += 1;
            break;
          case 'ABSENT':
            summary.absent += 1;
            break;
        }
      });
      
      return summary;
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance summary' },
      { status: 500 }
    );
  }
} 