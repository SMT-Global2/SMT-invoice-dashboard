import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserType } from "@prisma/client"

// GET handler - Get backup status
export async function GET(req: NextRequest, { params } : any) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    if (session.user.type !== UserType.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const id = params.id
    if (!id) {
      return NextResponse.json(
        { error: "Backup ID is required" },
        { status: 400 }
      )
    }

    // Using any to bypass type checking for this API
    const prismaAny = prisma as any
    
    const backup = await prismaAny.backup.findUnique({
      where: { id }
    })

    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: backup.id,
      status: backup.status,
      progress: backup.progress,
      message: backup.status === "COMPLETED" ? "Backup completed successfully. Ready for download." : backup.message || "",
      error: backup.failureReason || undefined,
      fileSize: backup.fileSize || 0,
      createdAt: backup.createdAt,
      completedAt: backup.completedAt || undefined,
      downloadUrl: backup.status === "COMPLETED" ? `/api/backup/download/${backup.id}` : undefined
    })
  } catch (error) {
    console.error("Error fetching backup status:", error)
    return NextResponse.json(
      { error: "Failed to fetch backup status", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 