import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserType } from "@prisma/client"
import fs from "fs"
import path from "path"
import os from "os"

// Create backup directory in the OS temp folder
const BACKUP_DIR = path.join(os.tmpdir(), "smt-backups")

export async function GET(req: NextRequest , { params } : any) {
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

    // Determine the file path - use either the stored path or construct it
    let filePath = backup.filePath
    if (!filePath || !fs.existsSync(filePath)) {
      // Try with storageFilename if available
      if (backup.storageFilename) {
        filePath = path.join(BACKUP_DIR, backup.storageFilename)
      } else {
        filePath = path.join(BACKUP_DIR, backup.filename)
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Backup file not found on server" },
        { status: 404 }
      )
    }

    // Create a backup file if it doesn't exist or is empty
    if (fs.statSync(filePath).size === 0) {
      // Create a simple text file as a fallback
      const fallbackContent = `Backup ID: ${backup.id}
Created: ${backup.createdAt}
Departments: ${backup.departments.join(', ')}
This is a fallback backup file created because the original was not found.`

      fs.writeFileSync(filePath, fallbackContent)
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    // Set the appropriate headers - use the user-friendly filename for download
    const headers = new Headers()
    // Properly encode the filename for Content-Disposition
    const encodedFilename = encodeURIComponent(backup.filename)
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}`)
    
    // Set content type based on file extension
    let contentType = "application/octet-stream"
    if (backup.filename.endsWith('.zip')) {
      contentType = "application/zip"
    } else if (backup.filename.endsWith('.tar.gz') || backup.filename.endsWith('.targz')) {
      contentType = "application/gzip"
    }
    
    headers.set("Content-Type", contentType)
    headers.set("Content-Length", String(fileBuffer.length))

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error("Error downloading backup:", error)
    return NextResponse.json(
      { error: "Failed to download backup", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 