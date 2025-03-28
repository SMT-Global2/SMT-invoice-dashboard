import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from '@/lib/helper';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Handle PATCH request to update a report
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const username = session.user?.username || null;
    const body = await req.json();
    const { reportId, saved } = body;
    
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }
    
    // Update report
    const report = await prisma.report.update({
      where: {
        id: reportId
      },
      data: {
        saved: saved,
        ...(saved && {
          savedTimestamp: new Date(),
          savedUsername: username
        })
      }
    });
    
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

// Handle POST request to upload an image to a report
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await req.formData();
    const reportId = formData.get('reportId') as string;
    const file = formData.get('file') as File;
    
    if (!reportId || !file) {
      return NextResponse.json({ 
        error: "Report ID and file are required" 
      }, { status: 400 });
    }
    
    // In a real app, you would upload the file to a storage service like S3
    // For this example, we'll simulate the upload and return a mock URL
    
    // Mock image upload - in reality you would upload to S3 or similar
    const mockImageUrl = `https://your-storage-service.com/${reportId}/${file.name}`;
    
    // Update the report with the new image URL
    const report = await prisma.report.update({
      where: {
        id: reportId
      },
      data: {
        images: {
          push: mockImageUrl
        }
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      report,
      imageUrl: mockImageUrl 
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
} 