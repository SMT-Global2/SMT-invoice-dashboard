import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import moment from 'moment';

// Schema for attendance creation/update
const AttendanceSchema = z.object({
  userId: z.string(),
  date: z.date(),
  type: z.enum(['FULL_DAY', 'HALF_DAY', 'LATE', 'ABSENT']),
  notes: z.string().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and attendance management can mark attendance
    const isAdmin = session.user.type === 'ADMIN';
    const hasAttendanceRights = session.user.department.includes('ATTENDANCE_MANAGEMENT');
    
    if (!isAdmin && !hasAttendanceRights) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json();
    console.log('Received attendance request body:', JSON.stringify(body));
    
    // Convert ISO date to proper UTC day using moment
    // This handles timezone offsets properly instead of just adding 1 day
    const normalizedDate = moment.utc(body.date).startOf('day').toDate();
    console.log('Original date:', body.date);
    console.log('Normalized UTC date:', normalizedDate.toISOString());
    
    // Update the body with the normalized date
    body.date = normalizedDate;
    
    try {
      const validatedData = AttendanceSchema.parse(body);
      console.log('Validated data:', JSON.stringify(validatedData));
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Create a date range for the full day in UTC to find existing records
      const startDate = moment.utc(normalizedDate).startOf('day').toDate();
      const endDate = moment.utc(normalizedDate).endOf('day').toDate();
      
      console.log('Looking for attendance record between:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        userId: validatedData.userId
      });

      // Check if attendance record already exists for this user and date
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          userId: validatedData.userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      
      console.log('Existing attendance found:', existingAttendance ? existingAttendance.id : 'none');

      let attendance;

      if (existingAttendance) {
        // Update existing attendance record
        attendance = await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            type: validatedData.type,
            notes: validatedData.notes,
            markedById: session.user.id,
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        });
      } else {
        // Create new attendance record
        attendance = await prisma.attendance.create({
          data: {
            userId: validatedData.userId,
            date: normalizedDate,
            type: validatedData.type,
            notes: validatedData.notes,
            markedById: session.user.id,
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        });
      }

      return NextResponse.json(attendance);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ error: validationError.errors }, { status: 400 });
      }
      throw validationError; // Re-throw if it's not a Zod error
    }
  } catch (error) {
    console.error('Error in attendance POST:', error);
    return NextResponse.json({ error: 'Failed to create attendance record', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const isAdmin = session.user.type === 'ADMIN';
    const hasAttendanceRights = session.user.department.includes('ATTENDANCE_MANAGEMENT');
    
    if (!isAdmin && !hasAttendanceRights) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific attendance record
      const attendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      });

      if (!attendance) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }

      return NextResponse.json(attendance);
    }

    // Get all attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Error in attendance GET:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and attendance management can delete attendance
    const isAdmin = session.user.type === 'ADMIN';
    const hasAttendanceRights = session.user.department.includes('ATTENDANCE_MANAGEMENT');
    
    if (!isAdmin && !hasAttendanceRights) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 });
    }

    // Check if attendance record exists
    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Delete the attendance record
    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error in attendance DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete attendance record' }, { status: 500 });
  }
} 