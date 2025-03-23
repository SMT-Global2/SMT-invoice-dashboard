import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validation schemas
const idParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid ID format" })
});

const updateExpirySchema = z.object({
  partyCode: z.string().min(1, "Party code is required").optional(),
  voucherNumber: z.string().min(1, "Voucher number is required").optional(),
  image: z.array(z.string()).min(1, "At least one image is required").optional(),
  expiryDate: z.coerce.date().optional(),
  generatedDate: z.coerce.date().optional(),
});

interface Params {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: Params) {
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
    
    const expiryItem = await prisma.expiry.findUnique({
      where: { id },
      include: { party: true }
    });
    
    if (!expiryItem) {
      return NextResponse.json(
        { message: "Expiry item not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: expiryItem });
    
  } catch (error) {
    console.error("Error fetching expiry item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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
    const validatedBody = updateExpirySchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedBody.error.flatten() },
        { status: 400 }
      );
    }
    
    const updateData = validatedBody.data;
    
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
    
    // Check if party code exists if it's being updated
    if (updateData.partyCode && updateData.partyCode !== existingItem.partyCode) {
      const party = await prisma.partyCode.findUnique({
        where: { code: updateData.partyCode }
      });
      
      if (!party) {
        return NextResponse.json(
          { message: "Party code not found" },
          { status: 404 }
        );
      }
    }
    
    // Update expiry item
    const updatedItem = await prisma.expiry.update({
      where: { id },
      data: updateData,
      include: { party: true }
    });
    
    return NextResponse.json({
      message: "Expiry item updated successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error updating expiry item:", error);
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
    
    // Delete expiry item
    await prisma.expiry.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: "Expiry item deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting expiry item:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 