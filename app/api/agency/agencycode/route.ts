import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    
    const agencies = await prisma.agencyCode.findMany({
      where: {
        OR: [
          { code : { contains: search, mode: 'insensitive' } },
          { companyName : { contains: search, mode: 'insensitive' } },
          { shortName : { contains: search, mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: {
        code: 'asc'
      }
    });

    return NextResponse.json({
      data: agencies
    });
    
  } catch (error) {
    console.error("Error fetching agency codes:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 