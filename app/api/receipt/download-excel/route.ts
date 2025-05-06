import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import moment from 'moment';
import { PaymentMethod } from "@/store/useReceiptStore";
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse parameters from query
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const usersParam = url.searchParams.get("users");
    const paymentMethodFilter = url.searchParams.get("paymentMethod");
    
    if (!dateParam) {
      return NextResponse.json(
        { message: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Parse users if provided
    const users = usersParam ? usersParam.split(',') : [];
    
    // Construct the where clause for the database query
    const whereClause: any = {
      generatedDate: {
        gte: moment(dateParam).startOf('day').toDate(),
        lt: moment(dateParam).endOf('day').toDate()
      }
    };
    
    // Add payment method filter if specified
    if (paymentMethodFilter && paymentMethodFilter !== 'ALL') {
      whereClause.paymentMethod = paymentMethodFilter as PaymentMethod;
    }
    
    // Add user filter if specified
    if (users.length > 0) {
      whereClause.receiptUsername = { in: users };
    }
    
    // Find all receipts matching criteria
    const receipts = await prisma.receipt.findMany({
      where: whereClause,
      include: {
        party: true
      },
      orderBy: [
        // If multiple users are selected, first order by username
        ...(users.length > 1 
          ? [{ receiptUsername: 'asc' as const }] 
          : []
        ),
        // Then by receipt timestamp within each user's receipts
        { receiptTimestamp: 'asc' as const },
        { receiptNumber: 'asc' as const }
      ]
    });
    
    if (receipts.length === 0) {
      return NextResponse.json(
        { message: "No receipts found for the specified criteria" },
        { status: 404 }
      );
    }
    
    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Receipts');
    
    // Define columns with auto-width to ensure all text is visible
    worksheet.columns = [
      { header: 'Sr. No.', key: 'srNo', width: 10 },
      { header: 'Date and Time', key: 'dateTime', width: 20 },
      { header: 'Party Code', key: 'partyCode', width: 15 },
      { header: 'Medical Name', key: 'medicalName', width: 30 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Regional Code', key: 'regionalCode', width: 15 },
      { header: 'Receipt No.', key: 'receiptNo', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Employee Name', key: 'employeeName', width: 20 }
    ];
    
    // Add data to the worksheet
    receipts.forEach((receipt, index) => {
      worksheet.addRow({
        srNo: index + 1,
        dateTime: moment(receipt.generatedDate).format('DD/MM/YYYY HH:mm:ss'),
        partyCode: receipt.partyCode,
        medicalName: receipt.party?.customerName || '',
        city: receipt.party?.city || '',
        regionalCode: receipt.party?.regionalCode || '',
        receiptNo: receipt.receiptNumber,
        paymentMethod: receipt.paymentMethod === 'CASH' ? 'Cash' : receipt.paymentMethod === 'CHEQUE' ? 'Cheque' : '',
        amount: receipt.amount,
        employeeName: receipt.receiptUsername || ''
      });
    });
    
    // Auto-fit columns to ensure all content is visible
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, (cell: any) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.max(maxLength + 2, 10);
    });
    
    // Generate Buffer from workbook
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Determine file name
    const paymentMethodText = paymentMethodFilter 
      ? paymentMethodFilter === 'ALL' ? 'all' : paymentMethodFilter.toLowerCase() 
      : 'all';
      
    const userText = users.length > 0 
      ? users.join('-') 
      : 'all';
      
    const fileName = `${moment(dateParam).format('YYYY-MM-DD')}_${paymentMethodText}_${userText}.xlsx`;
    
    // Create and return the response with the Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
  } catch (error) {
    console.error("Error generating receipt Excel:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 