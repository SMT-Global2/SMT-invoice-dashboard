import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Department } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and attendance management can view attendance
    const isAdmin = session.user.type === 'ADMIN';
    const hasAttendanceRights = session.user.department.includes('ATTENDANCE_MANAGEMENT' as Department);
    
    if (!isAdmin && !hasAttendanceRights) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    if (!yearParam || !monthParam) {
      return NextResponse.json({ error: 'Year and month parameters are required' }, { status: 400 });
    }

    const year = parseInt(yearParam);
    const month = parseInt(monthParam);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month format' }, { status: 400 });
    }

    // Set start and end date for the month
    const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
    const endDate = new Date(year, month, 0); // Last day of the month
    endDate.setHours(23, 59, 59, 999);

    // Get attendance records for the specified month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
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
      orderBy: [
        {
          date: 'asc',
        },
        {
          user: {
            firstName: 'asc',
          },
        },
      ],
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Error in monthly attendance GET:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly attendance records' }, { status: 500 });
  }
} 