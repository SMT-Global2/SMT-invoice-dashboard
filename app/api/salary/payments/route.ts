import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schema for creating a new salary payment
const salaryPaymentSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
  }),
  baseSalary: z.number({
    required_error: 'Base salary is required',
  }),
  totalDeductions: z.number().default(0),
  lateDeduction: z.number().default(0),
  halfDayDeduction: z.number().default(0),
  absentDeduction: z.number().default(0),
  loanDeduction: z.number().default(0),
  bonusPenalty: z.number().default(0),
  totalPaid: z.number({
    required_error: 'Total paid amount is required',
  }),
  period: z.string({
    required_error: 'Payment period is required',
  }),
  note: z.string().optional(),
  lateCount: z.number().default(0),
  halfDayCount: z.number().default(0),
  absentCount: z.number().default(0)
});

// GET handler to fetch salary payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin for access to all payments
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    const isAdmin = currentUser.type === 'ADMIN';
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // Build the query
    const query: any = {};
    
    // Filter by user ID if provided, otherwise check permission
    if (userId) {
      query.userId = userId;
    } else if (!isAdmin) {
      // Regular users can only see their own payments
      query.userId = currentUser.id;
    }
    
    // Extract month and year if provided
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    // Fetch payments with user details
    const payments = await prisma.salaryPayment.findMany({
      where: query,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
    
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching salary payments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch salary payments' },
      { status: 500 }
    );
  }
}

// POST handler to create a new salary payment
export async function POST(request: NextRequest) {
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
        { message: 'Only admins can record salary payments' },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = salaryPaymentSchema.parse(body);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Extract month and year from period string (e.g., "January 2023")
    const periodParts = validatedData.period.split(' ');
    const monthName = periodParts[0];
    const year = parseInt(periodParts[1]);
    
    // Map month name to number
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const month = monthMap[monthName] !== undefined ? monthMap[monthName] + 1 : 1; // Add 1 to convert from 0-based to 1-based
    
    // Check if a payment already exists for this user in this month/year
    const existingPayment = await prisma.salaryPayment.findUnique({
      where: {
        userMonthlySalary: {
          userId: validatedData.userId,
          month: month,
          year: year
        }
      }
    });
    
    if (existingPayment) {
      if (existingPayment.isPaid) {
        return NextResponse.json(
          { message: `Salary for ${monthName} ${year} has already been paid to this employee` },
          { status: 409 }
        );
      }
      
      // If payment exists but isn't marked as paid, update it
      const updateData = {
        baseSalary: validatedData.baseSalary,
        deductions: validatedData.totalDeductions,
        loanDeduction: validatedData.loanDeduction,
        netSalary: validatedData.totalPaid,
        lateCount: validatedData.lateCount || 0,
        halfDayCount: validatedData.halfDayCount || 0,
        absentCount: validatedData.absentCount || 0,
        paymentDate: new Date(),
        isPaid: true,
        notes: validatedData.note || '',
      };
      
      // Update standard fields through Prisma
      const updatedPayment = await prisma.salaryPayment.update({
        where: { id: existingPayment.id },
        data: updateData,
      });
      
      // Store the deduction values directly in the database using raw MongoDB update
      // This bypasses TypeScript type checking issues
      await prisma.$runCommandRaw({
        update: "SalaryPayment",
        updates: [
          {
            q: { _id: { $oid: updatedPayment.id } },
            u: { 
              $set: { 
                lateDeduction: validatedData.lateDeduction,
                halfDayDeduction: validatedData.halfDayDeduction,
                absentDeduction: validatedData.absentDeduction,
                bonusPenalty: validatedData.bonusPenalty
              } 
            }
          }
        ]
      });
      
      return NextResponse.json(updatedPayment, { status: 200 });
    }
    
    // Create new payment record if no existing one
    const paymentData = {
      userId: validatedData.userId,
      month: month,
      year: year,
      baseSalary: validatedData.baseSalary,
      deductions: validatedData.totalDeductions,
      loanDeduction: validatedData.loanDeduction,
      netSalary: validatedData.totalPaid,
      lateCount: validatedData.lateCount || 0,
      halfDayCount: validatedData.halfDayCount || 0,
      absentCount: validatedData.absentCount || 0,
      paymentDate: new Date(),
      isPaid: true,
      notes: validatedData.note || '',
    };
    
    // Create the payment with standard fields
    const payment = await prisma.salaryPayment.create({
      data: paymentData,
    });
    
    // Store the deduction values directly in the database using raw MongoDB update
    // This bypasses TypeScript type checking issues
    await prisma.$runCommandRaw({
      update: "SalaryPayment",
      updates: [
        {
          q: { _id: { $oid: payment.id } },
          u: { 
            $set: { 
              lateDeduction: validatedData.lateDeduction,
              halfDayDeduction: validatedData.halfDayDeduction,
              absentDeduction: validatedData.absentDeduction,
              bonusPenalty: validatedData.bonusPenalty
            } 
          }
        }
      ]
    });
    
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating salary payment:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to create salary payment' },
      { status: 500 }
    );
  }
} 