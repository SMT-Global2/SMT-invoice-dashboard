import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Add a new section to a board
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { boardId, name } = data;
    
    if (!boardId || !name) {
      return NextResponse.json({ error: 'Board ID and section name are required' }, { status: 400 });
    }
    
    // Get the highest position in the current board to determine the new position
    const highestSection = await prisma.trackSection.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' }
    });
    
    const newPosition = highestSection ? highestSection.position + 1 : 0;
    
    // Create a new section
    const newSection = await prisma.trackSection.create({
      data: {
        name,
        boardId,
        position: newPosition,
        isFixedDay: false
      },
      include: {
        cities: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    return NextResponse.json(newSection);
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
} 