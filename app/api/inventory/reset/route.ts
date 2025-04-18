import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  try {
    // Ensure only authenticated admin users can access this endpoint
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Delete all inventory records
    await prisma.inventory.deleteMany({});
    
    return NextResponse.json({
      message: "All inventory records have been deleted successfully",
      success: true
    });
    
  } catch (error) {
    console.error("Error deleting inventory records:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: String(error) },
      { status: 500 }
    );
  }
} 