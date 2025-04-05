import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Define a more complete type that includes our custom fields
interface ExtendedStatement {
  id: string;
  name: string;
  originalName: string;
  uploadDate: Date;
  statementDate: Date;
  reportSections: any[];
  createdAt: Date;
  updatedAt: Date;
  fileUrl: string | null;
  uploadedUsername: string | null;
  uploadedTimestamp: Date | null;
}

export async function GET(
  req: NextRequest
) {
  try {
    console.log("req", req);

    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Statement ID is required' }, { status: 400 });
    }

    console.log("Looking up statement with ID:", id);

    try {
      // Get statement with all report sections
      const prismaResult = await prisma.statement.findUnique({
        where: { id },
        include: {
          // @ts-ignore - field exists in db but not in types
          reportSections: true
        }
      });

      if (!prismaResult) {
        console.log("Statement not found with ID:", id);
        return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
      }

      // Cast to our extended type
      const statement = prismaResult as unknown as ExtendedStatement;
      console.log(`Statement found with ${statement.reportSections.length} report sections`);

      // Format the response
      return NextResponse.json({
        id: statement.id,
        name: statement.name,
        originalName: statement.originalName,
        uploadDate: statement.uploadDate,
        statementDate: statement.statementDate,
        partySections: statement.reportSections.map(section => ({
          partyCode: section.partyCode,
          partyName: section.partyName,
          location: section.location,
          contact: section.contact,
          creditDays: section.creditDays,
          data: section.data,
          isSaved: section.isSaved,
          savedTimestamp: section.savedTimestamp,
          images: section.images,
          latitude: section.latitude,
          longitude: section.longitude,
          address: section.address
        })),
        savedParties: statement.reportSections
          .filter(section => section.isSaved)
          .reduce((acc: Record<string, any>, section) => {
            acc[section.partyCode] = {
              images: section.images,
              location: section.latitude && section.longitude 
                ? { lat: section.latitude, lng: section.longitude } 
                : null,
              timestamp: section.savedTimestamp,
              address: section.address
            };
            return acc;
          }, {}),
        headers: [] // Headers would need to be extracted from data, but might be easier to keep this logic in the frontend
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching statement by ID:', error);
    return NextResponse.json({ 
      error: 'Error fetching statement details',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Statement ID is required' }, { status: 400 });
    }

    const { name } = await req.json();

    console.log("Renaming statement with ID:", id, "to:", name);

    try {
      await prisma.statement.update({
        where: { id },
        data: { name },
      });

      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error renaming statement:', error);
    return NextResponse.json({ 
      error: 'Error renaming statement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


export async function DELETE(
  req: NextRequest,
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');


    if (!id) {
      return NextResponse.json({ error: 'Statement ID is required' }, { status: 400 });
    }

    console.log("Deleting statement with ID:", id);

    try {
      // Delete statement and all associated report sections
      await prisma.statement.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json({ 
      error: 'Error deleting statement',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 