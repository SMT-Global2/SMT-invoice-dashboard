import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is an admin
    if (session.user.type !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Only administrators can delete most Recent Payments'
      }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Last Two Payment ID is required' }, { status: 400 });
    }

    console.log("Deleting last two payment with ID:", id);

    try {
      // Use type assertion to bypass TypeScript errors
      const prismaAny = prisma as any;
      
      // Delete payment record and all associated entries
      await prismaAny.lastTwoPayment.delete({
        where: { id },
      });

      return NextResponse.json({ 
        success: true,
        message: 'Last two payment record deleted successfully'
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting last two payment:', error);
    return NextResponse.json({ 
      error: 'Error deleting last two payment',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 