import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: any) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date param if present
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    let users;
    if (dateParam) {
      const date = new Date(dateParam);
      users = await prisma.user.findMany({
        where: {
          NOT: [
            {
              employmentStatus: 'EX_EMPLOYEE',
              OR: [
                { employmentEnd: null },
                { employmentEnd: { lte: date } }
              ]
            }
          ]
        },
        orderBy: {
          firstName: 'asc',
        },
      });
    } else {
      users = await prisma.user.findMany({
        orderBy: {
          firstName: 'asc',
        },
      });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching user list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 