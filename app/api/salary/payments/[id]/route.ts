import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE handler to remove a specific salary payment
export async function DELETE(
  request: NextRequest,
  query : { params : Promise<{ id : string }>}
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const params  =  await query.params;
    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    
    if (!currentUser || currentUser.type !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can delete salary payments' },
        { status: 403 }
      );
    }
    
    const paymentId = params.id;
    
    // Check if payment exists
    const payment = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
    });
    
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment record not found' },
        { status: 404 }
      );
    }
    
    // Delete the payment record
    await prisma.salaryPayment.delete({
      where: { id: paymentId },
    });
    
    return NextResponse.json(
      { message: 'Payment record deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting salary payment:', error);
    return NextResponse.json(
      { message: 'Failed to delete salary payment' },
      { status: 500 }
    );
  }
} 