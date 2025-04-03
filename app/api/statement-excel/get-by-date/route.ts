import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
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

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    console.log("Received date parameter:", dateParam);

    // Parse the date
    const date = new Date(dateParam);
    
    // Ensure date is valid
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Format the date to match the format stored in the database (start and end of day)
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    console.log("Querying statements between:", startDate, "and", endDate);

    // Find statements using a date range query
    try {
      const prismaResults = await prisma.statement.findMany({
        where: {
          // @ts-ignore - field exists in db but not in types
          statementDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          // @ts-ignore - field exists in db but not in types
          reportSections: {
            select: {
              id: true,
              partyCode: true,
              partyName: true,
              location: true,
              contact: true,
              creditDays: true,
              isSaved: true,
              savedTimestamp: true,
              images: true,
              latitude: true,
              longitude: true,
              address: true
            }
          }
        }
      });

      // Cast to extended type
      const statements = prismaResults as unknown as ExtendedStatement[];
      console.log(`Found ${statements.length} statements for the date`);

      // Format response
      const formattedStatements = statements.map(statement => {
        console.log("Processing statement ID:", statement.id);
        
        // Create savedParties object from saved report sections
        const savedParties = statement.reportSections
          .filter(section => section.isSaved)
          .reduce((acc: Record<string, any>, section) => {
            acc[section.partyCode] = {
              imageUrl: section.images,
              location: section.latitude && section.longitude 
                ? { lat: section.latitude, lng: section.longitude } 
                : null,
              timestamp: section.savedTimestamp,
              address: section.address
            };
            return acc;
          }, {});
        
        return {
          id: statement.id,
          name: statement.name,
          originalName: statement.originalName,
          uploadDate: statement.uploadDate,
          statementDate: statement.statementDate,
          savedCount: statement.reportSections.filter(section => section.isSaved).length,
          totalParties: statement.reportSections.length,
          partySections: statement.reportSections,
          savedParties: savedParties
        };
      });

      return NextResponse.json(formattedStatements);
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching statements by date:', error);
    return NextResponse.json({ 
      error: 'Error fetching statements',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 