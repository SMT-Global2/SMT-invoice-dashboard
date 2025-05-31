import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Add a new city to a section
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { sectionId, name, partyCode } = data;
    
    if (!sectionId || !name) {
      return NextResponse.json({ error: 'Section ID and city name are required' }, { status: 400 });
    }
    
    // Get the highest position in the current section to determine the new position
    const highestCity = await prisma.trackCity.findFirst({
      where: { sectionId },
      orderBy: { position: 'desc' }
    });
    
    const newPosition = highestCity ? highestCity.position + 1 : 0;
    
    // Create a new city
    const newCity = await prisma.trackCity.create({
      data: {
        name,
        sectionId,
        partyCode,
        position: newPosition
      }
    });
    
    return NextResponse.json(newCity);
  } catch (error) {
    console.error('Error creating city:', error);
    return NextResponse.json({ error: 'Failed to create city' }, { status: 500 });
  }
} 