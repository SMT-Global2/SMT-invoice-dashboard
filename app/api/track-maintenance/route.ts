import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const boards = await prisma.trackBoard.findMany({
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            cities: {
              orderBy: { position: 'asc' }
            }
          }
        }
      }
    });
    
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching track boards:', error);
    return NextResponse.json({ error: 'Failed to fetch track boards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { name, description } = data;
    
    if (!name) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }
    
    // Create the board and default day sections in a transaction
    const newBoard = await prisma.$transaction(async (tx) => {
      // Create the board
      const board = await tx.trackBoard.create({
        data: {
          name,
          description
        }
      });
      
      // Create only one default section
      await tx.trackSection.create({
        data: {
          name: 'Week 1',
          boardId: board.id,
          position: 0,
          isFixedDay: false
        }
      });
      
      // Return the board with its sections
      return await tx.trackBoard.findUnique({
        where: { id: board.id },
        include: {
          sections: {
            orderBy: { position: 'asc' },
            include: {
              cities: {
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      });
    });
    
    return NextResponse.json(newBoard);
  } catch (error) {
    console.error('Error creating track board:', error);
    return NextResponse.json({ error: 'Failed to create track board' }, { status: 500 });
  }
} 