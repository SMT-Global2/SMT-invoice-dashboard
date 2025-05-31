import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Duplicate a board
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { boardId, newName } = data;
    
    if (!boardId || !newName) {
      return NextResponse.json({ error: 'Board ID and new name are required' }, { status: 400 });
    }
    
    // Get the source board with all its sections and cities
    const sourceBoard = await prisma.trackBoard.findUnique({
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
    
    if (!sourceBoard) {
      return NextResponse.json({ error: 'Source board not found' }, { status: 404 });
    }
    
    // Create the duplicate board with all sections and cities in a transaction
    const newBoard = await prisma.$transaction(async (tx) => {
      // Create the new board
      const createdBoard = await tx.trackBoard.create({
        data: {
          name: newName,
          description: `Copy of ${sourceBoard.name}`
        }
      });
      
      // Create sections and cities for the new board
      for (const sourceSection of sourceBoard.sections) {
        const createdSection = await tx.trackSection.create({
          data: {
            name: sourceSection.name,
            boardId: createdBoard.id,
            position: sourceSection.position,
            isFixedDay: sourceSection.isFixedDay
          }
        });
        
        // Create cities for this section
        if (sourceSection.cities.length > 0) {
          const citiesData = sourceSection.cities.map(city => ({
            name: city.name,
            sectionId: createdSection.id,
            partyCode: city.partyCode,
            position: city.position
          }));
          
          await tx.trackCity.createMany({
            data: citiesData
          });
        }
      }
      
      // Return the complete new board with sections and cities
      return await tx.trackBoard.findUnique({
        where: { id: createdBoard.id },
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
    console.error('Error duplicating board:', error);
    return NextResponse.json({ error: 'Failed to duplicate board' }, { status: 500 });
  }
} 