import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    console.log("Session in last-two-payment/upload:", JSON.stringify({
      authenticated: !!session,
      user: session?.user ? {
        type: session.user.type,
        username: session.user.username,
        id: session.user.id
      } : null
    }));
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin users to upload payments
    if (session.user.type !== "ADMIN") {
      return NextResponse.json({ 
        error: "Unauthorized. Only admins can upload last two payment data.",
        userType: session.user.type 
      }, { status: 403 });
    }

    // Get the FormData (file + S3 key + metadata)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileKey = formData.get("fileKey") as string;
    const fileName = formData.get("fileName") as string;
    const fileType = formData.get("fileType") as string;
    const paymentDate = formData.get("paymentDate") as string;

    console.log("Request data:", { fileKey, fileName, fileType, paymentDate });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fileKey) {
      return NextResponse.json({ error: "No file key provided" }, { status: 400 });
    }

    if (!paymentDate) {
      return NextResponse.json({ error: "Payment date is required" }, { status: 400 });
    }

    // Parse the Excel file directly from the uploaded file
    console.log(`Processing Excel file: ${fileName}`);
    const fileArrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileArrayBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return NextResponse.json({ error: "Invalid or empty Excel file" }, { status: 400 });
    }

    console.log(`Processing ${excelData.length} payment entries`);
    
    // Log a sample row to debug the structure
    if (excelData.length > 0) {
      console.log("Sample row format:", JSON.stringify(excelData[0]));
    }

    try {
      // Use type assertion for Prisma client to bypass TypeScript error
      const prismaAny = prisma as any;
      
      // Process in batches to avoid timeouts with large files
      const BATCH_SIZE = 100;
      let processedCount = 0;
      const totalBatches = Math.ceil(excelData.length / BATCH_SIZE);
      
      // Create the main payment record with S3 file reference
      const lastTwoPayment = await prismaAny.lastTwoPayment.create({
        data: {
          name: fileName,
          originalName: fileName,
          uploadDate: new Date(),
          paymentDate: new Date(paymentDate),
          fileType: fileType,
          fileUrl: fileKey, // Store S3 key
          uploadedUsername: session.user.name || session.user.username || "unknown",
          uploadedTimestamp: new Date()
        }
      });
      
      // Process entries in batches
      for (let i = 0; i < totalBatches; i++) {
        const batchData = excelData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        
        // Create entries array for batch insert
        const entries = batchData.map((row: any) => {
          // Extract party code from accode field (main identifier)
          const partyCode = row.accode || row.ACCODE || row.acode || row.ACODE || '';
          
          // Get amount from acrdtamt field
          const amount = parseFloat(row.acrdtamt || row.ACRDTAMT || row.amount || row.AMOUNT || 0);
          
          // Get date from avoudt field (Excel date)
          const excelDate = row.avoudt || row.AVOUDT || row.date || row.DATE;
          
          // Convert Excel serial date to JavaScript Date if needed
          let date = new Date();
          if (excelDate) {
            if (typeof excelDate === 'number') {
              // Excel dates are stored as days since 1900-01-01
              date = new Date((excelDate - 25569) * 86400 * 1000);
            } else if (excelDate instanceof Date) {
              date = excelDate;
            } else if (typeof excelDate === 'string') {
              // Attempt to parse string date
              const parsedDate = new Date(excelDate);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate;
              }
            }
          }
          
          // Get payment method from bank or doctp field
          const paymentMethod = row.adoctp || row.ADOCTP || row.bank || row.BANK || 'N/A';
          
          // Get narration from anar field
          const narration = row.anar || row.ANAR || '';
          
          // Create the entry object with correctly named fields that match the schema
          return {
            partyCode: partyCode,
            partyName: row.aname || row.ANAME || '',
            location: row.location || row.LOCATION || '',
            contact: row.contact || row.CONTACT || row.mobile || row.MOBILE || '',
            // Store remaining data as JSON
            data: {
              date: date,
              amount: amount,
              paymentMethod: paymentMethod,
              narration: narration,
              checkNumber: row.achqno || row.ACHQNO || '',
              rawExcelRow: row // Store the entire row data for flexibility
            },
            lastTwoPaymentId: lastTwoPayment.id
          };
        });
        
        // Create entries in bulk
        await prismaAny.lastTwoPaymentEntry.createMany({
          data: entries
        });
        
        processedCount += batchData.length;
        console.log(`Processed batch ${i+1}/${totalBatches}: ${processedCount}/${excelData.length} entries`);
      }

      return NextResponse.json({ 
        message: "Last two payment processed successfully", 
        lastTwoPayment: {
          id: lastTwoPayment.id,
          name: lastTwoPayment.name,
          paymentDate: lastTwoPayment.paymentDate,
          fileUrl: lastTwoPayment.fileUrl,
          entriesCount: excelData.length
        }
      });
    } catch (prismaError: any) {
      console.error("Prisma error in upload:", prismaError);
      
      // Return a more detailed error for prisma issues
      return NextResponse.json({ 
        error: "Database error while processing payment", 
        details: prismaError.message,
        code: prismaError.code 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error processing last two payment:", error);
    
    // Add more detailed error information for debugging
    let errorDetails = error.message || "Unknown error";
    let errorCode = error.code || "UNKNOWN";
    
    // Return a proper error response
    return NextResponse.json({ 
      error: "Failed to process last two payment", 
      details: errorDetails,
      code: errorCode
    }, { 
      status: 500 
    });
  }
} 