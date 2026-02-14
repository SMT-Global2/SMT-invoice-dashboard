import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    if (session.user.type !== 'ADMIN') {
      return Response.json({
        success: false,
        message: 'Forbidden'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Generate a new session token
    const newSessionToken = uuidv4();

    // Update the user with the new session token
    const user = await prisma.user.update({
      where: { id },
      data: {
        sessionToken: newSessionToken
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'User logged out from all devices successfully' 
    });
  } catch (error) {
    console.error('Error in logout-all-devices:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to logout user from all devices',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 