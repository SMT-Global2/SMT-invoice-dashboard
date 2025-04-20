import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Validate status
    const { status } = body;
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find and update the contact form
    const contactForms = await prisma.contactForm.findMany({
      where: { id }
    });
    
    if (contactForms.length === 0) {
      return NextResponse.json(
        { error: 'Contact form not found' },
        { status: 404 }
      );
    }
    
    // MongoDB update
    await prisma.contactForm.updateMany({
      where: { id },
      data: { status }
    });
    
    // Get the updated form
    const updatedForms = await prisma.contactForm.findMany({
      where: { id }
    });

    return NextResponse.json(updatedForms[0]);
  } catch (error) {
    console.error('Error updating contact form:', error);
    return NextResponse.json(
      { error: 'Failed to update contact form' },
      { status: 500 }
    );
  }
} 