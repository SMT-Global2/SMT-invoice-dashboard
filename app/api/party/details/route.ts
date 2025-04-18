import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    
    if (!code) {
      return NextResponse.json(
        { message: "Party code is required" },
        { status: 400 }
      );
    }
    
    const partyCode = await prisma.partyCode.findFirst({
      where: {
        code: code
      }
    });
    
    if (!partyCode) {
      return NextResponse.json(
        { message: "Party not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      code: partyCode.code,
      customerName: partyCode.customerName,
      city: partyCode.city,
      regionalCode: partyCode.regionalCode
    });
    
  } catch (error) {
    console.error("Error fetching party details:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 