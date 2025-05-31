import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Update a section
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
    const { name, position } = data;
    
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (position !== undefined) {
      updateData.position = position;
    }
    
    // Update the section
    const updatedSection = await prisma.trackSection.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cities: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

// Delete a section
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
    // Check if it's a fixed day section before deletion
    const section = await prisma.trackSection.findUnique({
      where: { id: params.id }
    });
    
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    
    // Don't allow deletion of fixed day sections
    if (section.isFixedDay) {
      return NextResponse.json({ error: 'Cannot delete fixed day sections' }, { status: 400 });
    }
    
    // Delete the section (cascade will handle cities)
    await prisma.trackSection.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
} 