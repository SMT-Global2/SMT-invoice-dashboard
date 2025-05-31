import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for loan creation
const LoanSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
  remainingAmount: z.number().optional(),
  reason: z.string().nullable(),
  issueDate: z.date(),
  monthlyDeduction: z.number().positive(),
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
    const loanId = searchParams.get('id');
    const userId = searchParams.get('userId');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // Build the query
    let whereClause: any = {};
    
    // Filter by ID if provided
    if (loanId) {
      whereClause.id = loanId;
    }
    
    // Filter by user ID if provided
    if (userId) {
      whereClause.userId = userId;
    }
    
    // Filter by active status if requested
    if (activeOnly) {
      whereClause.active = true;
    }
    
    // Get all loans
    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: [
        {
          active: 'desc',
        },
        {
          issueDate: 'desc',
        },
      ],
    });
    
    // If ID was specified, return just one loan or 404
    if (loanId && loans.length === 0) {
      return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
    }
    
    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error in loans GET:', error);
    return NextResponse.json({ message: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.type !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    
    // Convert date string to Date object if needed
    if (typeof body.issueDate === 'string') {
      body.issueDate = new Date(body.issueDate);
    }
    
    const validatedData = LoanSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default remaining amount to the full amount if not provided
    const remainingAmount = validatedData.remainingAmount ?? validatedData.amount;

    // Create new loan
    const loan = await prisma.loan.create({
      data: {
        userId: validatedData.userId,
        amount: validatedData.amount,
        remainingAmount,
        reason: validatedData.reason,
        issueDate: validatedData.issueDate,
        monthlyDeduction: validatedData.monthlyDeduction,
        active: true,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error in loan POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    
    if (!currentUser || currentUser.type !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can update loans' },
        { status: 403 }
      );
    }
    
    // Get the loan ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const loanId = searchParams.get('id');
    
    if (!loanId) {
      return NextResponse.json(
        { message: 'Loan ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the loan exists
    const existingLoan = await prisma.loan.findUnique({
      where: { id: loanId },
    });
    
    if (!existingLoan) {
      return NextResponse.json(
        { message: 'Loan not found' },
        { status: 404 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Update the loan
    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: {
        amount: body.amount !== undefined ? body.amount : existingLoan.amount,
        remainingAmount: body.remainingAmount !== undefined ? body.remainingAmount : existingLoan.remainingAmount,
        monthlyDeduction: body.monthlyDeduction !== undefined ? body.monthlyDeduction : existingLoan.monthlyDeduction,
        reason: body.reason !== undefined ? body.reason : existingLoan.reason,
        issueDate: body.issueDate !== undefined ? new Date(body.issueDate) : existingLoan.issueDate,
        active: body.active !== undefined ? body.active : (body.remainingAmount > 0), // Use active, not isActive
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedLoan);
  } catch (error) {
    console.error('Error in loan PUT:', error);
    return NextResponse.json({ message: 'Failed to update loan' }, { status: 500 });
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
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Check if loan exists
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Delete the loan
    await prisma.loan.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error in loan DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
  }
} 