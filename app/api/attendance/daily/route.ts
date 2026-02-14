import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Department } from '@prisma/client';
import moment from 'moment';

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
    const dateParam = searchParams.get('date');
    const endDateParam = searchParams.get('endDate');
    const includeUserDetails = searchParams.get('includeUserDetails') === 'true';

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Parse dates using moment
    const startDate = moment.utc(dateParam);
    
    if (!startDate.isValid()) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Parse the end date if provided, otherwise use the start date
    const endDate = endDateParam ? moment.utc(endDateParam) : moment.utc(dateParam);
    
    if (!endDate.isValid()) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }
    
    // Set the start and end of the day using moment
    const startOfStartDay = startDate.clone().startOf('day').toDate();
    const endOfEndDay = endDate.clone().endOf('day').toDate();
    
    console.log('Fetching attendance records between:', {
      start: startOfStartDay.toISOString(),
      end: endOfEndDay.toISOString()
    });

    // Get attendance records for the specified date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfStartDay,
          lte: endOfEndDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            ...(includeUserDetails ? {
              email: true,
              type: true,
            } : {})
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });
    
    console.log(`Found ${attendanceRecords.length} attendance records for date range ${startOfStartDay.toISOString()} to ${endOfEndDay.toISOString()}`);
    
    if (attendanceRecords.length > 0) {
      console.log('Sample record:', JSON.stringify(attendanceRecords[0]));
    }

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Error in daily attendance GET:', error);
    return NextResponse.json({ error: 'Failed to fetch daily attendance records', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 