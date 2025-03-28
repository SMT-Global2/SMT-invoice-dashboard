import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validation schemas
const idParamSchema = z.object({
  id: z.string()
});

const voucherSchema = z.object({
  voucherNumber: z.coerce.number().positive("Voucher number is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get ID from query params
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Missing ID parameter" },
        { status: 400 }
      );
    }
    
    // Validate request body
    const body = await req.json();
    const validatedBody = voucherSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedBody.error.flatten() },
        { status: 400 }
      );
    }
    
    const { voucherNumber } = validatedBody.data;
    
    // Check if inventory item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Update inventory item with voucher information
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        voucherNumber,
        inventoryVoucherUsername: session.user.username,
        inventoryVoucherTimestamp: new Date()
      },
      include: { agency: true }
    });
    
    return NextResponse.json({
      message: "Voucher added successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error adding voucher:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get ID from query params
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { message: "Missing ID parameter" },
        { status: 400 }
      );
    }
    
    // Check if inventory item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Reset voucher information
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        voucherNumber: null,
        inventoryVoucherUsername: null,
        inventoryVoucherTimestamp: null,
        image: []
      },
      include: { agency: true }
    });
    
    return NextResponse.json({
      message: "Voucher reset successfully",
      data: updatedItem
    });
    
  } catch (error) {
    console.error("Error resetting voucher:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 