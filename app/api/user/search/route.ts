import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserType, Department } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentFilter = searchParams.get('department') || null;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
        department: departmentFilter && departmentFilter !== '' ? { has: departmentFilter as Department } : undefined
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        type: true,
        department: true
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Failed to search users:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to search users'
    }, { status: 500 });
  }
} 