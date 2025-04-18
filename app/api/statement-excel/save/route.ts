import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Type for the expected request body
interface SaveRequestBody {
  statementId: string;
  partyCode: string;
  images?: string[];
  location?: { lat: number; lng: number } | null;
  address?: string | null;
  visitedBy?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    console.log("Received save request with data:", data);

    // Validate required fields
    const { statementId, partyCode, location, address } = data;
    const visitedBy = data.visitedBy || 'Unknown User'; // Ensure we always have a value
    
    if (!statementId || !partyCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log("Saving with visitedBy:", visitedBy);

    try {
      // First find the report section
      const reportSection = await prisma.reportSection.findFirst({
        where: {
          statementId,
          partyCode,
        },
      });

      if (!reportSection) {
        return NextResponse.json({ error: 'Report section not found' }, { status: 404 });
      }

      console.log("Found report section:", reportSection.id);

      // Update the report section with saved data
      const updateResult = await prisma.reportSection.update({
        where: {
          id: reportSection.id 
        },
        data: {
          isSaved: true,
          savedTimestamp: new Date(),
          images: data.images || [],
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          address: address || null,
          savedUsername: visitedBy, // Use the actual user's name instead of hardcoding "admin"
          visitedBy: visitedBy // Ensure this is always included
        }
      });

      console.log("Update result:", updateResult);

      // Return success response
      return NextResponse.json({ 
        success: true,
        data: {
          isSaved: true,
          images: data.images || [],
          location: location || null,
          address: address || null,
          savedTimestamp: new Date(),
          visitedBy: visitedBy
        }
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving statement data:', error);
    return NextResponse.json({
      error: 'Error saving statement data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// API to reset saved data
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const statementId = searchParams.get('statementId');
    const partyCode = searchParams.get('partyCode');

    if (!statementId || !partyCode) {
      return NextResponse.json({ error: 'Statement ID and Party Code are required' }, { status: 400 });
    }

    console.log("Finding report section to reset for statement:", statementId, "party:", partyCode);
    
    try {
      // Find the report section to reset
      const reportSections = await prisma.reportSection.findMany({
        where: {
          // @ts-ignore - Fields exist in DB but not in TS types
          statementId,
          partyCode
        },
        take: 1
      });

      if (!reportSections || reportSections.length === 0) {
        return NextResponse.json({ error: 'Party statement not found' }, { status: 404 });
      }

      const reportSection = reportSections[0];
      console.log("Found report section to reset:", reportSection.id);

      // Reset the report section using updateMany
      const updateResult = await prisma.reportSection.updateMany({
        where: { 
          id: reportSection.id 
        },
        data: {
          // @ts-ignore - Fields exist in DB but not in TS types
          isSaved: false,
          savedTimestamp: null,
          images: [],
          latitude: null,
          longitude: null,
          address: null,
          savedUsername: null,
          visitedBy: null
        }
      });

      console.log("Reset result:", updateResult);

      // Get the updated data
      const updatedSections = await prisma.reportSection.findMany({
        where: { 
          id: reportSection.id 
        }
      });

      return NextResponse.json({
        success: true,
        data: updatedSections[0]
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error resetting statement data:', error);
    return NextResponse.json({ 
      error: 'Failed to reset statement data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 