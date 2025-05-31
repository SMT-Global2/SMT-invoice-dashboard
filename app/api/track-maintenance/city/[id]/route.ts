import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Update a city
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
    
    const data = await req.json();
    const { name, partyCode, sectionId, position } = data;
    
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (partyCode !== undefined) {
      updateData.partyCode = partyCode;
    }
    
    if (sectionId !== undefined) {
      updateData.sectionId = sectionId;
    }
    
    if (position !== undefined) {
      updateData.position = position;
    }
    
    // Update the city
    const updatedCity = await prisma.trackCity.update({
      where: { id: params.id },
      data: updateData
    });
    
    return NextResponse.json(updatedCity);
  } catch (error) {
    console.error('Error updating city:', error);
    return NextResponse.json({ error: 'Failed to update city' }, { status: 500 });
  }
}

// Delete a city
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

    // Delete the city
    await prisma.trackCity.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json({ error: 'Failed to delete city' }, { status: 500 });
  }
} 