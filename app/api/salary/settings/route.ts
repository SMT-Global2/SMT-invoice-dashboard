import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Validation schema for salary settings
const salarySettingsSchema = z.object({
  userId: z.string({
    required_error: "User ID is required",
  }),
  baseSalary: z.number({
    required_error: "Base salary is required",
  }),
  allowances: z.number().default(0),
  taxes: z.number().default(0),
  lateDeductionRate: z.number().default(0),
  halfDayDeductionRate: z.number().default(0),
  absentDeductionRate: z.number().default(0),
  salaryDate: z.number().int().min(1).max(31).default(1),
  active: z.boolean().default(true),
});

// GET all salary settings or for a specific user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', session ? 'Authenticated' : 'Not authenticated');
    
    if (!session) {
      console.log('Authentication failed, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if userId is in query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('GET /api/salary/settings - userId:', userId);
    
    try {
      let settings;
      
      if (userId) {
        // Get specific user's salary setting
        const setting = await prisma.salarySetting.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                email: true,
              },
            },
          },
        });
        settings = setting ? [setting] : [];
      } else {
        // Get all salary settings
        settings = await prisma.salarySetting.findMany({
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                email: true,
              },
            },
          },
        });
      }
      
      console.log('Retrieved settings:', settings.length > 0 ? 'Found data' : 'No data');
      return NextResponse.json(settings);
    } catch (error) {
      console.error('Error with Prisma query:', error);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching salary settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST to create or update salary settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('POST /api/salary/settings - request body:', body);
    
    // Validate the data
    const validatedData = salarySettingsSchema.parse(body);
    
    console.log('Validated data:', validatedData);
    
    try {
      // Check if settings exist for this user
      const existingSettings = await prisma.salarySetting.findUnique({
        where: { userId: validatedData.userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              email: true,
            },
          },
        },
      });
      
      console.log('Existing settings:', existingSettings);
      
      let result;
      
      if (existingSettings) {
        // Update existing settings
        result = await prisma.salarySetting.update({
          where: { userId: validatedData.userId },
          data: {
            baseSalary: validatedData.baseSalary,
            allowances: validatedData.allowances,
            taxes: validatedData.taxes,
            lateDeductionRate: validatedData.lateDeductionRate,
            halfDayDeductionRate: validatedData.halfDayDeductionRate,
            absentDeductionRate: validatedData.absentDeductionRate,
            salaryDate: validatedData.salaryDate,
            active: validatedData.active,
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                email: true,
              },
            },
          },
        });
        
        console.log('Updated settings:', result);
        return NextResponse.json(result);
      } else {
        // Create new settings
        result = await prisma.salarySetting.create({
          data: {
            userId: validatedData.userId,
            baseSalary: validatedData.baseSalary,
            allowances: validatedData.allowances,
            taxes: validatedData.taxes,
            lateDeductionRate: validatedData.lateDeductionRate,
            halfDayDeductionRate: validatedData.halfDayDeductionRate,
            absentDeductionRate: validatedData.absentDeductionRate,
            salaryDate: validatedData.salaryDate,
            active: validatedData.active,
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                email: true,
              },
            },
          },
        });
        
        console.log('Created settings:', result);
        return NextResponse.json(result);
      }
    } catch (dbError) {
      console.error('Prisma error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error saving salary settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to save salary settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    
    if (!currentUser || currentUser.type !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Only admins can update salary settings' },
        { status: 403 }
      );
    }
    
    // Get setting ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const settingId = searchParams.get('id');
    
    if (!settingId) {
      return NextResponse.json(
        { message: 'Setting ID is required' },
        { status: 400 }
      );
    }
    
    // Check if setting exists
    const existingSetting = await prisma.salarySetting.findUnique({
      where: { id: settingId },
    });
    
    if (!existingSetting) {
      return NextResponse.json(
        { message: 'Salary setting not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Update salary setting
    const updatedSetting = await prisma.salarySetting.update({
      where: { id: settingId },
      data: {
        baseSalary: body.baseSalary !== undefined ? body.baseSalary : existingSetting.baseSalary,
        allowances: body.allowances !== undefined ? body.allowances : existingSetting.allowances,
        taxes: body.taxes !== undefined ? body.taxes : existingSetting.taxes,
        active: body.active !== undefined ? body.active : existingSetting.active,
        lateDeductionRate: body.lateDeductionRate !== undefined ? body.lateDeductionRate : existingSetting.lateDeductionRate,
        halfDayDeductionRate: body.halfDayDeductionRate !== undefined ? body.halfDayDeductionRate : existingSetting.halfDayDeductionRate,
        absentDeductionRate: body.absentDeductionRate !== undefined ? body.absentDeductionRate : existingSetting.absentDeductionRate,
        salaryDate: body.salaryDate !== undefined ? body.salaryDate : existingSetting.salaryDate,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedSetting);
  } catch (error) {
    console.error('Error in salary settings PUT:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid data', errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to update salary setting' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Salary setting ID is required' }, { status: 400 });
    }

    // Check if salary setting exists
    const salarySetting = await prisma.salarySetting.findUnique({
      where: { id },
    });

    if (!salarySetting) {
      return NextResponse.json({ error: 'Salary setting not found' }, { status: 404 });
    }

    // Delete the salary setting
    await prisma.salarySetting.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Salary setting deleted successfully' });
  } catch (error) {
    console.error('Error in salary setting DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete salary setting' }, { status: 500 });
  }
} 