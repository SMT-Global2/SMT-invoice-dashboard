import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import moment from 'moment';
import { PaymentMethod } from "@/store/useReceiptStore";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse the date from query parameter
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const userFilter = url.searchParams.get("user");
    const paymentMethodFilter = url.searchParams.get("paymentMethod");
    
    if (!dateParam) {
      return NextResponse.json(
        { message: "Date parameter is required" },
        { status: 400 }
      );
    }

    console.log({
      where: {
        generatedDate: {
          gte: moment(dateParam).startOf('day').toDate(),
          lt: moment(dateParam).endOf('day').toDate()
        },
        receiptUsername : userFilter ? userFilter : undefined,
        paymentMethod : paymentMethodFilter ? paymentMethodFilter as PaymentMethod : undefined
      },
      include: {
        party: true
      },
      orderBy: {
        receiptNumber: 'asc'
      }
    });
    
    // Find all receipts for the given date
    const receipts = await prisma.receipt.findMany({
      where: {
        generatedDate: {
          gte: moment(dateParam).startOf('day').toDate(),
          lt: moment(dateParam).endOf('day').toDate()
        },
        receiptUsername : userFilter ? userFilter : undefined,
        paymentMethod : paymentMethodFilter ? paymentMethodFilter as PaymentMethod : undefined
      },
      include: {
        party: true
      },
      orderBy: {
        receiptNumber: 'asc'
      }
    });
    // console.log(receipts);
    
    if (receipts.length === 0) {
      return NextResponse.json(
        { message: "No receipts found for the specified date" },
        { status: 404 }
      );
    }

    // Fetch statement images from the same date
    const statementImages = await prisma.reportSection.findMany({
      where: {
        statement: {
          statementDate: {
            gte: moment(dateParam).startOf('day').toDate(),
            lt: moment(dateParam).endOf('day').toDate()
          }
        },
        isSaved: true,
        images: {
          isEmpty: false
        }
      },
      include: {
        statement: true
      }
    });

    // Filter statement images based on user selection
    let filteredStatementImages = statementImages;
    
    if (userFilter) {
      // If specific user is selected, only show images from that user
      filteredStatementImages = statementImages.filter(section =>
        section.visitedBy === userFilter || (!section.visitedBy && section.savedUsername === userFilter)
      );
    }
    // If no user filter or all users selected, show all images (no filtering needed)

    // Format statement images for PDF
    const formattedStatementImages = filteredStatementImages.map(section => ({
      images: section.images.map(imageKey => {
        // Convert S3 key to full URL
        const bucketName = process.env.S3_BUCKET_NAME || 'smt-images-bucket';
        const region = process.env.S3_REGION || 'ap-south-1';
        return `https://${bucketName}.s3.${region}.amazonaws.com/${encodeURIComponent(imageKey)}`;
      }),
      medicalName: section.partyName,
      userName: section.visitedBy || section.savedUsername || 'Unknown User',
      partyCode: section.partyCode,
      location: section.location,
      contact: section.contact,
      statementFileName: section.statement?.name || 'Unknown Statement' // Add statement file name
    }));
    
    // Return receipt data with statement images
    return NextResponse.json({
      success: true,
      data: receipts,
      statementImages: formattedStatementImages,
      date: dateParam
    });
    
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 