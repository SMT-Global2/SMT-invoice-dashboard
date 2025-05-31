import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for loan payment creation
const LoanPaymentSchema = z.object({
  loanId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  salaryPaymentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const loanId = searchParams.get('loanId');
    const userId = searchParams.get('userId');
    
    // Build the query
    let whereClause: any = {};
    
    // Filter by loan ID if provided
    if (loanId) {
      whereClause.loanId = loanId;
    }
    
    // Filter by user ID if provided
    if (userId) {
      whereClause.userId = userId;
    }
    
    // Get all loan payments
    const loanPayments = await prisma.loanPayment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        loan: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    return NextResponse.json(loanPayments);
  } catch (error) {
    console.error('Error in loan payments GET:', error);
    return NextResponse.json({ message: 'Failed to fetch loan payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    
    if (!currentUser || currentUser.type !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can record loan payments' },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const validatedData = LoanPaymentSchema.parse(body);

    // Check if loan exists
    const loan = await prisma.loan.findUnique({
      where: { id: validatedData.loanId },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create new loan payment record
    const loanPayment = await prisma.loanPayment.create({
      data: {
        loanId: validatedData.loanId,
        userId: validatedData.userId,
        amount: validatedData.amount,
        salaryPaymentId: validatedData.salaryPaymentId,
        notes: validatedData.notes || '',
        paymentDate: new Date(),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        loan: true,
      },
    });

    return NextResponse.json(loanPayment);
  } catch (error) {
    console.error('Error in loan payment POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create loan payment record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.type !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Check if payment exists
    const payment = await prisma.loanPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Delete the payment record
    await prisma.loanPayment.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error in loan payment DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete payment record' }, { status: 500 });
  }
} 