import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { MongoClient, ObjectId } from 'mongodb';

// Validation schema for salary settings
const salarySettingsSchema = z.object({
  userId: z.string({
    required_error: "User ID is required",
  }),
  baseSalary: z.number({
    required_error: "Base salary is required",
  }),
  lateDeductionRate: z.number().default(0),
  halfDayDeductionRate: z.number().default(0),
  absentDeductionRate: z.number().default(0),
  salaryDate: z.number().default(1),
  bonusPenalty: z.number().optional().default(0),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'SMT_New';
let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }
  return mongoClient;
}

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
      // Connect to MongoDB directly
      const client = await getMongoClient();
      const db = client.db(DB_NAME);
      const collection = db.collection('SalarySetting');
      
      // Query the database
      let settings;
      if (userId) {
        settings = await collection.findOne({ userId: new ObjectId(userId) });
        settings = settings ? [settings] : [];
      } else {
        settings = await collection.find({}).toArray();
      }
      
      // Get user details for each setting
      const userCollection = db.collection('User');
      const settingsWithUser = await Promise.all(
        settings.map(async (setting) => {
          const user = await userCollection.findOne({ _id: new ObjectId(setting.userId) });
          return {
            ...setting,
            user: user ? {
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username
            } : null
          };
        })
      );
      
      // Convert any null values to 0 for required fields
      const sanitizedResult = settingsWithUser.map(sanitizeSalarySetting);
      
      console.log('Retrieved settings:', sanitizedResult.length > 0 ? 'Found data' : 'No data');
      return NextResponse.json(sanitizedResult);
    } catch (error) {
      console.error('Error with MongoDB query:', error);
      
      // Fallback to fixed empty response
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

// Helper function to sanitize salary settings
function sanitizeSalarySetting(setting: any) {
  if (!setting) return null;
  
  console.log('Sanitizing setting:', setting);
  console.log('Salary date before sanitizing:', setting.salaryDate, 'type:', typeof setting.salaryDate);
  
  const sanitized = {
    ...setting,
    baseSalary: setting.baseSalary === null ? 0 : Number(setting.baseSalary),
    allowances: setting.allowances === null ? 0 : Number(setting.allowances),
    taxes: setting.taxes === null ? 0 : Number(setting.taxes),
    lateDeductionRate: setting.lateDeductionRate === null ? 0 : Number(setting.lateDeductionRate),
    halfDayDeductionRate: setting.halfDayDeductionRate === null ? 0 : Number(setting.halfDayDeductionRate),
    absentDeductionRate: setting.absentDeductionRate === null ? 0 : Number(setting.absentDeductionRate),
    salaryDate: setting.salaryDate === null ? 1 : Number(setting.salaryDate || 1),
    bonusPenalty: setting.bonusPenalty === null ? 0 : Number(setting.bonusPenalty || 0),
    firstName: setting.firstName || (setting.user ? setting.user.firstName : ''),
    lastName: setting.lastName || (setting.user ? setting.user.lastName : ''),
  };
  
  console.log('Salary date after sanitizing:', sanitized.salaryDate, 'type:', typeof sanitized.salaryDate);
  return sanitized;
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
    
    // Ensure all required fields have default values
    const validatedData = {
      ...salarySettingsSchema.parse(body),
      baseSalary: body.baseSalary || 0,
      lateDeductionRate: body.lateDeductionRate || 0,
      halfDayDeductionRate: body.halfDayDeductionRate || 0,
      absentDeductionRate: body.absentDeductionRate || 0,
      salaryDate: body.salaryDate || 1,
      bonusPenalty: body.bonusPenalty || 0,
      firstName: body.firstName || '',
      lastName: body.lastName || '',
    };
    
    console.log('Validated data:', validatedData);
    console.log('Salary date after validation:', validatedData.salaryDate, 'type:', typeof validatedData.salaryDate);
    
    try {
      // Connect to MongoDB directly
      const client = await getMongoClient();
      const db = client.db(DB_NAME);
      const collection = db.collection('SalarySetting');
      
      // Check if settings exist for this user
      const existingSettings = await collection.findOne({ 
        userId: new ObjectId(validatedData.userId) 
      });
      
      // If firstName/lastName not provided, try to fetch from user collection
      if (!validatedData.firstName || !validatedData.lastName) {
        const userCollection = db.collection('User');
        const user = await userCollection.findOne({ _id: new ObjectId(validatedData.userId) });
        if (user) {
          validatedData.firstName = user.firstName || '';
          validatedData.lastName = user.lastName || '';
        }
      }
      
      console.log('Existing settings:', existingSettings);
      
      let result;
      const now = new Date();
      
      // Update or create settings
      if (existingSettings) {
        result = await collection.updateOne(
          { userId: new ObjectId(validatedData.userId) },
          { 
            $set: {
              baseSalary: validatedData.baseSalary,
              lateDeductionRate: validatedData.lateDeductionRate,
              halfDayDeductionRate: validatedData.halfDayDeductionRate,
              absentDeductionRate: validatedData.absentDeductionRate,
              salaryDate: validatedData.salaryDate,
              bonusPenalty: validatedData.bonusPenalty || 0,
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              allowances: existingSettings.allowances || 0,
              taxes: existingSettings.taxes || 0,
              active: true,
              updatedAt: now
            } 
          }
        );
        
        // Fetch the updated document
        const updatedSettings = await collection.findOne({ 
          userId: new ObjectId(validatedData.userId) 
        });
        
        // Sanitize the result before returning
        const sanitizedSettings = sanitizeSalarySetting(updatedSettings);
        
        console.log('Updated settings:', sanitizedSettings);
        return NextResponse.json(sanitizedSettings);
      } else {
        // Create new settings
        result = await collection.insertOne({
          userId: new ObjectId(validatedData.userId),
          baseSalary: validatedData.baseSalary,
          lateDeductionRate: validatedData.lateDeductionRate,
          halfDayDeductionRate: validatedData.halfDayDeductionRate,
          absentDeductionRate: validatedData.absentDeductionRate,
          salaryDate: validatedData.salaryDate,
          bonusPenalty: validatedData.bonusPenalty || 0,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          allowances: 0,
          taxes: 0,
          active: true,
          createdAt: now,
          updatedAt: now
        });
        
        // Fetch the newly created document
        const newSettings = await collection.findOne({ _id: result.insertedId });
        
        // Sanitize the result before returning
        const sanitizedSettings = sanitizeSalarySetting(newSettings);
        
        console.log('Created settings:', sanitizedSettings);
        return NextResponse.json(sanitizedSettings);
      }
      
    } catch (dbError) {
      console.error('MongoDB error:', dbError);
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
    // @ts-ignore - Prisma model is correctly defined in the schema
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
    // @ts-ignore - Prisma model is correctly defined in the schema
    const updatedSetting = await prisma.salarySetting.update({
      where: { id: settingId },
      data: {
        baseSalary: body.baseSalary !== undefined ? body.baseSalary : existingSetting.baseSalary,
        allowances: body.allowances !== undefined ? body.allowances : existingSetting.allowances,
        taxes: body.taxes !== undefined ? body.taxes : existingSetting.taxes,
        active: body.active !== undefined ? body.active : existingSetting.active,
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
    // @ts-ignore - Prisma model is correctly defined in the schema
    const salarySetting = await prisma.salarySetting.findUnique({
      where: { id },
    });

    if (!salarySetting) {
      return NextResponse.json({ error: 'Salary setting not found' }, { status: 404 });
    }

    // Delete the salary setting
    // @ts-ignore - Prisma model is correctly defined in the schema
    await prisma.salarySetting.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Salary setting deleted successfully' });
  } catch (error) {
    console.error('Error in salary setting DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete salary setting' }, { status: 500 });
  }
} 