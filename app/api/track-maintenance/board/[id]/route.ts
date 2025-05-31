import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function to extract the board ID from the URL parameter
function extractBoardId(paramId: string): string {
  // The URL format might be: Board_Name_123456
  // We need to extract the ID part (after the last underscore)
  const lastUnderscoreIndex = paramId.lastIndexOf('_');
  
  // If there's no underscore, assume the entire string is the ID
  return lastUnderscoreIndex !== -1 
    ? paramId.substring(lastUnderscoreIndex + 1) 
    : paramId;
}

// Get a specific board
export async function GET(
  req: NextRequest,
  query : { params : Promise<{ id : string }>}
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const params  =  await query.params;
    const boardId = extractBoardId(params.id);
    
    // Validate the board ID format before attempting to fetch
    if (!boardId || boardId.trim() === '') {
      return NextResponse.json({ error: 'Invalid board ID format' }, { status: 400 });
    }
    
    const board = await prisma.trackBoard.findUnique({
      where: { id: boardId },
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
    
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return NextResponse.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// Update a board
export async function PUT(
  req: NextRequest,
  query : { params : Promise<{ id : string }>}
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params  =  await query.params;
    const boardId = extractBoardId(params.id);
    const data = await req.json();
    const { name, description } = data;
    
    // Update the board
    const updatedBoard = await prisma.trackBoard.update({
      where: { id: boardId },
      data: { 
        name,
        description
      },
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
    
    return NextResponse.json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// Delete a board
export async function DELETE(
  req: NextRequest,
  query : { params : Promise<{ id : string }>}
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params  =  await query.params;
    const boardId = extractBoardId(params.id);
    
    // Delete the board (cascade will handle sections and cities)
    await prisma.trackBoard.delete({
      where: { id: boardId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
} 