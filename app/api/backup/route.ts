import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { createWriteStream, existsSync, mkdirSync } from "fs"
import { UserType } from "@prisma/client"
import { execSync } from "child_process"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import ExcelJS from 'exceljs'

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

// Create backup directory in the OS temp folder
const BACKUP_DIR = path.join(os.tmpdir(), "smt-backups")

// Create a directory for backup content
const BACKUP_CONTENT_DIR = path.join(os.tmpdir(), "smt-backup-content")

// Define BackupStatus enum to match Prisma schema
enum BackupStatus {
  PENDING = "PENDING",
  INPROGRESS = "INPROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELED = "CANCELED"
}

// Progress tracking interface
interface ProgressStats {
  startTime: number;
  processedItems: number;
  totalItems: number;
  processedBytes: number;
  currentSpeed: number;  // bytes per second
  estimatedTimeRemaining: number;  // seconds
}

// Add type definitions at the top of the file
interface Receipt {
  id: string;
  receiptNumber?: string;
  generatedDate: Date;
  amount?: number;
  paymentMode: 'CASH' | 'CHEQUE';
  chequeNumber?: string;
  bankName?: string;
  branch?: string;
  notes?: string;
  party?: {
    name?: string;
    code?: string;
    city?: string;
    regionalCode?: string;
  };
  user?: {
    username?: string;
  };
}

interface FormattedReceipt extends Receipt {
  formattedDate: string;
  receiptType: 'CASH' | 'CHEQUE';
  displayName: string;
  serialNumber: number;
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper function to format time
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

// Helper function to get original filename from S3 key or URL
function getOriginalFilename(imageUrl: string): string {
  // If it's a full URL, get the pathname
  if (imageUrl.startsWith('http')) {
    const url = new URL(imageUrl);
    imageUrl = url.pathname.substring(1); // Remove leading slash
  }
  
  // Return the full path structure
  return imageUrl;
}

// Helper function to sanitize filename while preserving path
function sanitizeFilename(filename: string): string {
  // Split the path into parts
  const parts = filename.split('/');
  
  // Sanitize each part individually, but keep the slashes
  const sanitizedParts = parts.map(part => 
    // Replace any unsafe characters but keep the hash (#) and dots
    part.replace(/[^a-zA-Z0-9-_#.]/g, '_')
  );
  
  // Rejoin with slashes
  return sanitizedParts.join('/');
}

// Helper function to download image from S3
async function downloadS3Image(imageUrl: string, destinationPath: string): Promise<number> {
  try {
    console.log(`Downloading image from S3: ${imageUrl}`);
    
    // Get S3 bucket name from environment
    const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'smt-images-bucket';
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
    }

    // Parse the key from the URL or path
    let key = imageUrl;
    
    // If it's a full URL, extract just the path portion
    if (imageUrl.startsWith('http')) {
      const url = new URL(imageUrl);
      key = url.pathname.substring(1); // Remove the leading slash
    }
    
    console.log(`Using bucket: ${bucketName}, key: ${key}`);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    try {
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No image data received from S3');
      }

      // Make sure the destination directory exists
      const destinationDir = path.dirname(destinationPath);
      if (!existsSync(destinationDir)) {
        mkdirSync(destinationDir, { recursive: true });
      }

      const writeStream = createWriteStream(destinationPath);
      await pipeline(
        response.Body as Readable,
        writeStream
      );

      // Return the size of the downloaded file
      const stats = await fs.stat(destinationPath);
      return stats.size;
    } catch (s3Error: unknown) {
      console.error(`S3 error downloading ${key} from bucket ${bucketName}:`, s3Error);
      throw new Error(`S3 error: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}`);
    }
  } catch (error) {
    console.error(`Error downloading image from S3: ${error}`);
    
    // Create a directory if it doesn't exist
    const destinationDir = path.dirname(destinationPath);
    if (!existsSync(destinationDir)) {
      mkdirSync(destinationDir, { recursive: true });
    }
    
    // Write a placeholder file with error info
    const errorFilename = path.basename(destinationPath, path.extname(destinationPath)) + '_error.txt';
    await fs.writeFile(
      path.join(path.dirname(destinationPath), errorFilename),
      `Failed to download image: ${imageUrl}\nError: ${error instanceof Error ? error.message : String(error)}`
    );
    
    return 0; // Return 0 bytes processed
  }
}

// Helper function to update progress
async function updateProgress(backupId: string, progress: number, stats?: ProgressStats) {
  let statusUpdate: any = {
    progress,
  }

  // Don't include progressDetails directly as it's not recognized by Prisma client yet

  await prisma.backup.update({
    where: { id: backupId },
    data: statusUpdate
  })

  // If we have stats, log them to console
  if (stats) {
    const speed = formatBytes(stats.currentSpeed) + '/s'
    const timeRemaining = formatTime(stats.estimatedTimeRemaining)
    const processed = `${stats.processedItems}/${stats.totalItems}`
    const processedBytes = formatBytes(stats.processedBytes)
    
    console.log(`Backup ${backupId} progress: ${progress}% | Speed: ${speed} | Time remaining: ${timeRemaining} | Processed: ${processed} | Data: ${processedBytes}`)
  }
}

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
    await fs.mkdir(BACKUP_CONTENT_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creating backup directory:", error)
  }
}

// Schema for backup creation
const createBackupSchema = z.object({
  departments: z.array(z.string()),
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }),
  compressionType: z.enum(["zip", "targz"])
})

// Schema for downloading a backup
const downloadBackupSchema = z.object({
  id: z.string(),
})

// Schema for deleting a backup
const deleteBackupSchema = z.object({
  id: z.string(),
})

// Utility function to check if user is admin
async function isUserAllowed(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return false
  }

  // Check if user is admin
  return session.user.type === UserType.ADMIN
}

// GET handler - Fetch backup history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // Check user's type directly from the session
    if (session.user.type !== UserType.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Using any to bypass type checking for this API
    const prismaAny = prisma as any
    const backups = await prismaAny.backup.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(backups);
  } catch (error) {
    console.error("Error fetching backups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler - Create a new backup
export async function POST(req: NextRequest) {
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

    await ensureBackupDir()
    
    const body = await req.json()
    
    // Ensure the departments and other fields exist before validation
    const validationBody = {
      departments: body.departments || [],
      dateRange: body.dateRange || { from: '', to: '' },
      compressionType: body.compressionType || 'zip'
    }
    
    try {
      const validatedData = createBackupSchema.parse(validationBody)
      
      // Format dates for filename
      const fromDateObj = validatedData.dateRange.from ? new Date(validatedData.dateRange.from) : new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dd = pad(fromDateObj.getDate());
      const mm = pad(fromDateObj.getMonth() + 1);
      const yyyy = fromDateObj.getFullYear();
      const formattedDate = `${dd}-${mm}-${yyyy}`;

      // Create a clean section string
      let sectionNames = validatedData.departments.join('-');
      if (sectionNames.length > 40) {
        sectionNames = 'Multiple-Sections';
      }

      // Create user-friendly filename
      const userFilename = `BCKP_${formattedDate}_${sectionNames}.${validatedData.compressionType}`;
      
      // Create a timestamp-based unique filename for storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const storageFilename = `backup-${timestamp}.${validatedData.compressionType}`;
      const filePath = path.join(BACKUP_DIR, storageFilename);
  
      // Create backup entry in database
      // Using any to bypass type checking for this API
      const prismaAny = prisma as any
      const backup = await prismaAny.backup.create({
        data: {
          filename: userFilename, // Use user-friendly filename
          storageFilename: storageFilename, // Store the system filename as well
          createdBy: session.user.id,
          status: BackupStatus.PENDING,
          progress: 0,
          departments: validatedData.departments,
          dateRange: validatedData.dateRange,
          fileSize: 0, // Will be updated during processing
          filePath: filePath,
        },
      })
  
      // Process the backup in the background
      setTimeout(() => processBackup(backup.id), 100)
  
      return NextResponse.json({ 
        id: backup.id,
        status: BackupStatus.PENDING,
        message: "Backup job started" 
      })
    } catch (validationError) {
      console.error("Validation error:", validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request data", details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error) {
    console.error("Error creating backup:", error)
    
    return NextResponse.json(
      { error: "Failed to create backup", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Helper function to process a backup
async function processBackup(backupId: string) {
  const stats: ProgressStats = {
    startTime: Date.now(),
    processedItems: 0,
    totalItems: 0,
    processedBytes: 0,
    currentSpeed: 0,
    estimatedTimeRemaining: 0
  }

  // Using any to bypass type checking for this API
  const prismaAny = prisma as any

  try {
    // Update status to INPROGRESS
    await prismaAny.backup.update({
      where: { id: backupId },
      data: { 
        status: BackupStatus.INPROGRESS, 
        progress: 5 
      },
    })

    const backup = await prismaAny.backup.findUnique({
      where: { id: backupId }
    })
    
    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`)
    }
    
    // Create a directory for this specific backup's content
    const backupContentDir = path.join(BACKUP_CONTENT_DIR, backupId)
    if (existsSync(backupContentDir)) {
      await fs.rm(backupContentDir, { recursive: true, force: true })
    }
    await fs.mkdir(backupContentDir, { recursive: true })
    
    // Parse date range for filtering
    let fromDate, toDate;
    if (backup.dateRange) {
      const dateRange = backup.dateRange as any;
      fromDate = dateRange.from ? new Date(dateRange.from) : undefined;
      toDate = dateRange.to ? new Date(dateRange.to) : undefined;
    }
    
    const totalDepartments = backup.departments.length
    let totalSize = 0
    
    // Set a timer to continuously update progress every 1 second
    let currentProgress = 5;
    const progressInterval = setInterval(async () => {
      // Calculate progress between 5-95% based on elapsed time and estimated total time
      // We're estimating 30 seconds per department as a baseline
      const estimatedTotalTime = totalDepartments * 30; // 30 seconds per department
      const elapsedTime = (Date.now() - stats.startTime) / 1000;
      const progressRatio = Math.min(elapsedTime / estimatedTotalTime, 0.95);
      currentProgress = 5 + Math.floor(progressRatio * 90);
      currentProgress = Math.min(currentProgress, 100); // Clamp to 100
      // Update progress with current stats
      await updateProgress(backupId, currentProgress, stats);
    }, 1000);
    
    for (let i = 0; i < totalDepartments; i++) {
      const currentBackup = await prismaAny.backup.findUnique({
        where: { id: backupId },
      })
      
      if (currentBackup?.status === BackupStatus.CANCELED) {
        console.log(`Backup ${backupId} was cancelled`)
        clearInterval(progressInterval);
        return
      }

      const department = backup.departments[i]
      const departmentBackupDir = path.join(backupContentDir, `${department}_Backup`)
      await fs.mkdir(departmentBackupDir, { recursive: true })
      
      let departmentData;
      
      // Fetch real data from the database based on department
      switch(department) {
        case 'invoice':
          const invoiceFilter: any = {};
          if (fromDate && toDate) {
            invoiceFilter.generatedDate = {
              gte: fromDate,
              lte: toDate
            };
          }
          
          const invoices = await prismaAny.invoice.findMany({
            where: invoiceFilter,
            include: {
              party: true
            }
          });

          stats.totalItems += invoices.length;
          
          // Create all_invoices.json
          departmentData = {
            department,
            timestamp: new Date().toISOString(),
            count: invoices.length,
            data: invoices,
          };
          
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_invoices.json'),
            JSON.stringify(departmentData, null, 2)
          );

          // Create readme file with correct invoice count
          await fs.writeFile(
            path.join(departmentBackupDir, 'README.txt'),
            `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Invoices: ${invoices.length}`
          );
          
          // Process each invoice
          for (const invoice of invoices) {
            const invoiceDir = path.join(departmentBackupDir, `Invoice_${invoice.invoiceNumber}`)
            await fs.mkdir(invoiceDir, { recursive: true })
            
            await fs.writeFile(
              path.join(invoiceDir, 'invoice_data.json'),
              JSON.stringify(invoice, null, 2)
            )
            
            const imagesDir = path.join(invoiceDir, 'images')
            await fs.mkdir(imagesDir, { recursive: true })
            
            if (invoice.image && invoice.image.length > 0) {
              for (let idx = 0; idx < invoice.image.length; idx++) {
                const imageUrl = invoice.image[idx];
                try {
                  // Get original filename with full path and sanitize it
                  const originalFilename = getOriginalFilename(imageUrl);
                  const sanitizedFilename = sanitizeFilename(originalFilename);
                  
                  // Create the full path for the image
                  const imagePath = path.join(imagesDir, sanitizedFilename);
                  
                  // Ensure the directory structure exists
                  const imageDir = path.dirname(imagePath);
                  await fs.mkdir(imageDir, { recursive: true });
                  
                  const downloadedSize = await downloadS3Image(imageUrl, imagePath);
                  
                  stats.processedBytes += downloadedSize;
                  stats.processedItems++;
                  
                  // Update progress stats
                  const elapsedTime = (Date.now() - stats.startTime) / 1000;
                  stats.currentSpeed = stats.processedBytes / elapsedTime;
                  stats.estimatedTimeRemaining = 
                    ((stats.totalItems - stats.processedItems) * (elapsedTime / stats.processedItems));
                  
                  // Update progress every few items
                  if (stats.processedItems % 5 === 0) {
                    const safeTotalItems = Math.max(stats.totalItems, 1); // avoid division by zero
                    let progress = 5 + Math.floor((i / totalDepartments) * 80) +
                      Math.floor((stats.processedItems / safeTotalItems) * (80 / totalDepartments));
                    progress = Math.min(progress, 100); // Clamp to 100
                    await updateProgress(backupId, progress, stats);
                  }
                } catch (error) {
                  console.error(`Error downloading image for invoice ${invoice.invoiceNumber}:`, error);
                  // Create error file in the same directory structure as the original
                  const errorPath = path.join(
                    imagesDir, 
                    path.dirname(sanitizeFilename(getOriginalFilename(imageUrl))),
                    `invoice_${invoice.invoiceNumber}_image_${idx + 1}_error.txt`
                  );
                  await fs.mkdir(path.dirname(errorPath), { recursive: true });
                  await fs.writeFile(
                    errorPath,
                    `Failed to download image from URL: ${imageUrl}\nError: ${error instanceof Error ? error.message : String(error)}`
                  );
                }
              }
            }
          }
          break;
          
        case 'receipt':
          const receiptFilter: any = {};
          if (fromDate && toDate) {
            receiptFilter.generatedDate = {
              gte: fromDate,
              lte: toDate
            };
          }
          
          const receipts = await prismaAny.receipt.findMany({
            where: receiptFilter,
            include: {
              party: true
            },
            orderBy: {
              generatedDate: 'asc'
            }
          });
          
          // Debug: Print first 5 receipts to inspect paymentMode and cheque fields
          console.log('Sample receipts:', receipts.slice(0, 5));
          
          // Create the receipt data structure with formatted dates
          const formattedReceipts = receipts.map((receipt: Receipt, index: number): FormattedReceipt => {
            const formattedDate = new Date(receipt.generatedDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            // Explicitly construct the formatted receipt to ensure all fields are present
            return {
              id: receipt.id,
              receiptNumber: receipt.receiptNumber,
              generatedDate: receipt.generatedDate,
              amount: receipt.amount,
              paymentMode: receipt.paymentMode || 'CASH', // Default to CASH if empty
              chequeNumber: receipt.chequeNumber,
              bankName: receipt.bankName,
              branch: receipt.branch,
              notes: receipt.notes,
              party: receipt.party ? {
                name: receipt.party.name,
                code: receipt.party.code,
                city: receipt.party.city,
                regionalCode: receipt.party.regionalCode
              } : undefined,
              formattedDate,
              receiptType: receipt.paymentMode || 'CASH', // Default to CASH if empty
              displayName: receipt.paymentMode === 'CHEQUE' 
                ? `Cheque_${formattedDate}`
                : `Cash_Receipt.${receipt.receiptNumber || 'unknown'}_${formattedDate}`,
              serialNumber: index + 1
            };
          });
          
          // Create JSON file with all receipt data
          const receiptData = {
            department: department,
            timestamp: formatIndianTime(new Date()),
            count: receipts.length,
            data: formattedReceipts
          };
          
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_receipts.json'),
            JSON.stringify(receiptData, null, 2)
          );

          // Create Excel file
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Receipts');

          // Define Excel columns in the specified order
          worksheet.columns = [
            { header: 'Sr. No.', key: 'serialNumber', width: 8 },
            { header: 'Date', key: 'formattedDate', width: 12 },
            { header: 'Receipt No.', key: 'receiptNumber', width: 15 },
            { header: 'Receipt Type', key: 'paymentMode', width: 15 },
            { header: 'Party Code', key: 'partyCode', width: 12 },
            { header: 'Party Name', key: 'partyName', width: 30 },
            { header: 'City', key: 'city', width: 40 },
            { header: 'Regional Code', key: 'regionalCode', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Cheque No.', key: 'chequeNumber', width: 15 },
            { header: 'Bank Name', key: 'bankName', width: 25 },
            { header: 'Branch', key: 'branch', width: 20 },
            { header: 'Notes', key: 'notes', width: 40 }
          ];

          // Add data to Excel
          formattedReceipts.forEach((receipt: FormattedReceipt) => {
            // Debug log to see what values we're getting from the database
            console.log('Receipt data for Excel:', {
              id: receipt.id,
              receiptNumber: receipt.receiptNumber,
              paymentMode: receipt.paymentMode,
              partyName: receipt.party?.name,
              chequeNumber: receipt.chequeNumber,
              bankName: receipt.bankName,
              branch: receipt.branch,
              notes: receipt.notes
            });
            
            const rowData = {
              serialNumber: receipt.serialNumber,
              formattedDate: receipt.formattedDate,
              receiptNumber: receipt.receiptNumber || '-',
              paymentMode: receipt.paymentMode || 'CASH',
              partyCode: receipt.party?.code || '-',
              partyName: receipt.party?.name || '-',
              city: receipt.party?.city || '-',
              regionalCode: receipt.party?.regionalCode || '-',
              amount: receipt.amount || 0,
              chequeNumber: receipt.paymentMode === 'CHEQUE' ? (receipt.chequeNumber || '-') : '-',
              bankName: receipt.paymentMode === 'CHEQUE' ? (receipt.bankName || '-') : '-',
              branch: receipt.paymentMode === 'CHEQUE' ? (receipt.branch || '-') : '-',
              notes: receipt.notes || '-'
            };
            
            console.log('Adding row to Excel:', rowData);
            worksheet.addRow(rowData);
          });

          // Style the header row
          worksheet.getRow(1).font = { bold: true };
          worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
          worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
          worksheet.columns.forEach(col => { col.alignment = { vertical: 'middle', horizontal: 'center' }; });

          // Align only the data (not headers) for specific columns to the right
          const rightAlignKeys = ['receiptNumber', 'city', 'amount', 'chequeNumber'];
          rightAlignKeys.forEach(key => {
            const col = worksheet.getColumn(key);
            // Set alignment for all data rows (starting from row 2)
            col.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
              if (rowNumber > 1) {
                cell.alignment = { ...cell.alignment, horizontal: 'right' };
              }
            });
          });

          // Format amount column to show numbers with 2 decimal places
          worksheet.getColumn('amount').numFmt = '#,##0.00';

          // Log column headers to verify they match
          console.log('Excel column headers:', worksheet.columns.map((col: any) => ({ header: col.header, key: col.key })));

          // Save Excel file
          await workbook.xlsx.writeFile(path.join(departmentBackupDir, 'all_receipts.xlsx'));

          // Create README.txt
          await fs.writeFile(
            path.join(departmentBackupDir, 'README.txt'),
            `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Receipts: ${receipts.length}\n\nFiles:\n1. all_receipts.json - Complete receipt data in JSON format\n2. all_receipts.xlsx - Formatted receipt data in Excel format`
          );
          break;
          
        case 'inventory':
          const inventoryFilter: any = {};
          if (fromDate && toDate) {
            inventoryFilter.generatedDate = {
              gte: fromDate,
              lte: toDate
            };
          }
          
          const inventory = await prismaAny.inventory.findMany({
            where: inventoryFilter,
            include: {
              agency: true
            }
          });
          
          // First create a JSON file with all inventory data
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: inventory.length,
            data: inventory,
          };
          
          // Create all_inventory.json file
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_inventory.json'),
            JSON.stringify(departmentData, null, 2)
          );
          
          // Process each inventory item individually
          for (const item of inventory) {
            // Create directory for this specific inventory item
            const inventoryDir = path.join(departmentBackupDir, `Inventory_${item.id}`)
            await fs.mkdir(inventoryDir, { recursive: true })
            
            // Create inventory_data.json with just this item's data
            await fs.writeFile(
              path.join(inventoryDir, 'inventory_data.json'),
              JSON.stringify(item, null, 2)
            )
          }
          break;
          
        case 'deliveryMemo':
          const deliveryMemoFilter: any = {};
          if (fromDate && toDate) {
            deliveryMemoFilter.generatedDate = {
              gte: fromDate,
              lte: toDate
            };
          }
          
          const deliveryMemos = await prismaAny.deliveryMemo.findMany({
            where: deliveryMemoFilter,
            include: {
              party: true
            }
          });
          
          // First create a JSON file with all delivery memo data
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: deliveryMemos.length,
            data: deliveryMemos,
          };
          
          // Create all_delivery_memos.json file
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_delivery_memos.json'),
            JSON.stringify(departmentData, null, 2)
          );
          
          // Process each delivery memo individually
          for (const memo of deliveryMemos) {
            // Create directory for this specific delivery memo
            const memoDir = path.join(departmentBackupDir, `DeliveryMemo_${memo.dmNumber}`)
            await fs.mkdir(memoDir, { recursive: true })
            
            // Create delivery_memo_data.json with just this memo's data
            await fs.writeFile(
              path.join(memoDir, 'delivery_memo_data.json'),
              JSON.stringify(memo, null, 2)
            )
          }
          break;
          
        case 'expiry':
          const expiryFilter: any = {};
          if (fromDate && toDate) {
            expiryFilter.generatedDate = {
              gte: fromDate,
              lte: toDate
            };
          }
          
          const expiryRecords = await prismaAny.expiry.findMany({
            where: expiryFilter,
            include: {
              party: true
            }
          });
          
          // First create a JSON file with all expiry data
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: expiryRecords.length,
            data: expiryRecords,
          };
          
          // Create all_expiry.json file
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_expiry.json'),
            JSON.stringify(departmentData, null, 2)
          );
          
          // Process each expiry record individually
          for (const expiry of expiryRecords) {
            // Improved folder naming: use party code and expiry date if available
            const partyCode = expiry.party?.code || 'UnknownParty';
            const expiryDate = expiry.expiryDate
              ? new Date(expiry.expiryDate).toLocaleDateString('en-GB').replace(/\//g, '-')
              : 'UnknownDate';
            const expiryDir = path.join(
              departmentBackupDir,
              `Expiry_${partyCode}_${expiryDate}`
            );
            await fs.mkdir(expiryDir, { recursive: true })
            // Create expiry_data.json with just this record's data
            await fs.writeFile(
              path.join(expiryDir, 'expiry_data.json'),
              JSON.stringify(expiry, null, 2)
            )

            // Download images if present
            if (expiry.image && Array.isArray(expiry.image) && expiry.image.length > 0) {
              const imagesDir = path.join(expiryDir, 'images');
              await fs.mkdir(imagesDir, { recursive: true });
              for (let idx = 0; idx < expiry.image.length; idx++) {
                const imageUrl = expiry.image[idx];
                try {
                  const originalFilename = getOriginalFilename(imageUrl);
                  const sanitizedFilename = sanitizeFilename(originalFilename);
                  const imagePath = path.join(imagesDir, sanitizedFilename);
                  await downloadS3Image(imageUrl, imagePath);
                } catch (error) {
                  console.error(`Error downloading image for expiry ${expiry.id}:`, error);
                  const errorPath = path.join(
                    imagesDir,
                    `expiry_${expiry.id}_image_${idx + 1}_error.txt`
                  );
                  await fs.writeFile(
                    errorPath,
                    `Failed to download image from URL: ${imageUrl}\nError: ${error instanceof Error ? error.message : String(error)}`
                  );
                }
              }
            }
          }
          break;
          
        case 'agency':
          const agencies = await prismaAny.agencyCode.findMany({});
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: agencies.length,
            data: agencies,
          };
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_agencies.json'),
            JSON.stringify(departmentData, null, 2)
          );
          break;
        case 'party':
          const parties = await prismaAny.partyCode.findMany({});
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: parties.length,
            data: parties,
          };
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_parties.json'),
            JSON.stringify(departmentData, null, 2)
          );
          break;
        case 'transportation':
          const transportations = await prismaAny.transportation.findMany({});
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            count: transportations.length,
            data: transportations,
          };
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_transportation.json'),
            JSON.stringify(departmentData, null, 2)
          );
          break;
          
        case 'all':
          // For 'all', create a summary file
          departmentData = {
            department: 'all',
            timestamp: new Date().toISOString(),
            message: 'All departments data is included in individual department folders'
          };
          
          // Create all_summary.json file
          await fs.writeFile(
            path.join(departmentBackupDir, 'all_summary.json'),
            JSON.stringify(departmentData, null, 2)
          );
          break;
          
        default:
          departmentData = {
            department: department,
            timestamp: new Date().toISOString(),
            message: `No specific handler for ${department}`
          };
          
          // Create department_info.json file
          await fs.writeFile(
            path.join(departmentBackupDir, 'department_info.json'),
            JSON.stringify(departmentData, null, 2)
          );
      }
      
      // Create a readme file for the department
      if (department !== 'invoice') { // Skip for invoice as it's already handled
        let recordCount = 0;
        switch(department) {
          case 'receipt':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Receipts: ${recordCount}`
            );
            break;
          case 'inventory':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Inventory Items: ${recordCount}`
            );
            break;
          case 'deliveryMemo':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Delivery Memos: ${recordCount}`
            );
            break;
          case 'expiry':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Expiry Records: ${recordCount}`
            );
            break;
          case 'agency':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Agencies: ${recordCount}`
            );
            break;
          case 'party':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Parties: ${recordCount}`
            );
            break;
          case 'transportation':
            recordCount = departmentData?.count || 0;
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Transportation Records: ${recordCount}`
            );
            break;
          default:
            await fs.writeFile(
              path.join(departmentBackupDir, 'README.txt'),
              `Backup of the ${department} department.\nCreated: ${formatIndianTime(new Date())}\nTotal Records: ${departmentData?.count || 0}`
            );
        }
      }
    }

    // Clear the progress interval
    clearInterval(progressInterval);

    // Create the metadata file in the root of the backup
    await fs.writeFile(
      path.join(backupContentDir, 'metadata.json'),
      JSON.stringify({
        backupId: backupId,
        timestamp: new Date().toISOString(),
        departments: backup.departments,
        dateRange: backup.dateRange,
        totalRecords: stats.processedItems
      }, null, 2)
    )

    // Update progress directly to 95% before creating the ZIP file
    await updateProgress(backupId, 95, stats);

    // Create the final ZIP file
    const outputPath = backup.filePath
    const compressionType = path.extname(outputPath).slice(1)
    
    if (compressionType === 'zip') {
      execSync(`cd "${BACKUP_CONTENT_DIR}" && zip -r "${outputPath}" "${backupId}"`)
    } else {
      execSync(`cd "${BACKUP_CONTENT_DIR}" && tar -czf "${outputPath}" "${backupId}"`)
    }
    
    // Get final file size
    const finalStats = await fs.stat(outputPath)
    totalSize = finalStats.size
    
    // Final update to 100%
    await updateProgress(backupId, 100);
    
    // Update backup status to completed
    await prismaAny.backup.update({
      where: { id: backupId },
      data: {
        status: BackupStatus.COMPLETED,
        progress: 100,
        fileSize: totalSize
      },
    })
    
    // Add a console log with final stats
    console.log(`Backup ${backupId} completed | Total size: ${formatBytes(totalSize)} | Items: ${stats.processedItems} | Time: ${formatTime((Date.now() - stats.startTime) / 1000)}`);
    
    // Cleanup temporary content
    await fs.rm(path.join(BACKUP_CONTENT_DIR, backupId), { recursive: true, force: true })
    
  } catch (error) {
    console.error("Error processing backup:", error)
    
    // Update backup status to failed
    await prismaAny.backup.update({
      where: { id: backupId },
      data: {
        status: BackupStatus.FAILED,
        failureReason: error instanceof Error ? error.message : String(error)
      },
    })
  }
}

// Function to handle downloading a backup
export async function PATCH(req: NextRequest) {
  if (!(await isUserAllowed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json();
    const { id } = z.object({ id: z.string() }).parse(body);
    
    // Using any to bypass type checking for this API
    const prismaAny = prisma as any
    
    // Get backup information
    const backup = await prismaAny.backup.findUnique({
      where: { id },
    })
    
    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      )
    }
    
    if (backup.status !== BackupStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Backup is not ready for download" },
        { status: 400 }
      )
    }
    
    if (!backup.filePath) {
      return NextResponse.json(
        { error: "Backup file path not found" },
        { status: 404 }
      )
    }
    
    // Check if file exists
    try {
      await fs.access(backup.filePath)
    } catch (error) {
      return NextResponse.json(
        { error: "Backup file not found on server" },
        { status: 404 }
      )
    }
    
    // Generate a download URL
    const downloadUrl = `/api/backup/download/${id}?token=${Date.now()}`
    
    await prismaAny.backup.update({
      where: { id },
      data: { downloadUrl }
    })
    
    return NextResponse.json({ url: downloadUrl })
  } catch (error) {
    console.error("Error preparing download:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to prepare download" },
      { status: 500 }
    )
  }
}

// Function to handle deleting a backup
export async function DELETE(req: NextRequest) {
  if (!(await isUserAllowed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    await ensureBackupDir()
    
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    
    if (!id) {
      return NextResponse.json(
        { error: "Backup ID is required" },
        { status: 400 }
      )
    }
    
    // Using any to bypass type checking for this API
    const prismaAny = prisma as any
    
    // Get backup information
    const backup = await prismaAny.backup.findUnique({
      where: { id },
    })
    
    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      )
    }
    
    // Delete file if it exists
    if (backup.filePath) {
      try {
        await fs.access(backup.filePath)
        await fs.unlink(backup.filePath)
      } catch (error) {
        // File doesn't exist, continue with deletion from database
      }
    }
    
    // Delete backup from database
    await prismaAny.backup.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting backup:", error)
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    )
  }
}

// Cancel a running backup
export async function PUT(req: NextRequest) {
  if (!(await isUserAllowed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id } = z.object({ id: z.string() }).parse(body)
    
    // Using any to bypass type checking for this API
    const prismaAny = prisma as any
    
    // Get backup information
    const backup = await prismaAny.backup.findUnique({
      where: { id },
    })
    
    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      )
    }
    
    // Only allow cancelling backups that are in progress
    if (backup.status !== BackupStatus.PENDING && backup.status !== BackupStatus.INPROGRESS) {
      return NextResponse.json(
        { error: "Cannot cancel backup that is not in progress" },
        { status: 400 }
      )
    }
    
    // Update backup status to cancelled
    await prismaAny.backup.update({
      where: { id },
      data: {
        status: BackupStatus.CANCELED,
        progress: 0,
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling backup:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to cancel backup" },
      { status: 500 }
    )
  }
}

// Helper function to format date in Indian time
function formatIndianTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).replace(',', '_');
} 