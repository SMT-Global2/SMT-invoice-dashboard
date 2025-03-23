import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validation schemas
const idParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" })
});

const creditNoteSchema = z.object({
  creditNoteNumber: z.string().min(1, "Credit note number is required"),
});

interface Params {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Validate ID parameter
    const validatedParams = idParamSchema.safeParse(params);
    if (!validatedParams.success) {
      return NextResponse.json(
        { message: "Invalid ID format", errors: validatedParams.error.flatten() },
        { status: 400 }
      );
    }
    
    const { id } = validatedParams.data;
    
    // Validate request body
    const body = await req.json();
    const validatedBody = creditNoteSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedBody.error.flatten() },
        { status: 400 }
      );
    }
    
    const { creditNoteNumber } = validatedBody.data;
    
    // Check if expiry item exists
    const existingItem = await prisma.expiry.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Expiry item not found" },
        { status: 404 }
      );
    }
    
    // Update expiry item with credit note information
    const updatedItem = await prisma.expiry.update({
      where: { id },
      data: {
        creditNoteNumber,
        creditNoteUsername: session.user.username,
        creditNoteTimestamp: new Date()
      },
      include: { party: true }
    });
    
    return NextResponse.json({
      message: "Credit note added successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error adding credit note:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Validate ID parameter
    const validatedParams = idParamSchema.safeParse(params);
    if (!validatedParams.success) {
      return NextResponse.json(
        { message: "Invalid ID format", errors: validatedParams.error.flatten() },
        { status: 400 }
      );
    }
    
    const { id } = validatedParams.data;
    
    // Check if expiry item exists
    const existingItem = await prisma.expiry.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Expiry item not found" },
        { status: 404 }
      );
    }
    
    // Reset credit note information
    const updatedItem = await prisma.expiry.update({
      where: { id },
      data: {
        creditNoteNumber: null,
        creditNoteUsername: null,
        creditNoteTimestamp: null
      },
      include: { party: true }
    });
    
    return NextResponse.json({
      message: "Credit note reset successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error resetting credit note:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 