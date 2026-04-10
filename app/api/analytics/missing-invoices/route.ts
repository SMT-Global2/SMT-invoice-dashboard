'use server';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import moment from 'moment-timezone';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username || session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // optional YYYY-MM-DD
    const regionalCodesParam = searchParams.get('regionalCodes');

    let regionalCodes: string[] | undefined;
    if (regionalCodesParam) {
      try {
        const parsed = JSON.parse(regionalCodesParam);
        if (Array.isArray(parsed) && parsed.length > 0) {
          regionalCodes = parsed;
        }
      } catch {}
    }

    // Build base where clause
    const where: any = {
      invoiceTimestamp: { not: null },
    };

    // Optional date scope — filter by invoiceTimestamp date
    if (date && moment(date, 'YYYY-MM-DD', true).isValid()) {
      where.invoiceTimestamp = {
        gte: moment(date).startOf('day').toDate(),
        lte: moment(date).endOf('day').toDate(),
      };
    }

    // Regional codes filter
    if (regionalCodes && regionalCodes.length > 0) {
      where.party = {
        regionalCode: { in: regionalCodes },
      };
    }

    // Get the max (latest) invoice number that has been generated
    const latestInvoice = await prisma.invoice.findFirst({
      where,
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    if (!latestInvoice) {
      return NextResponse.json({ success: true, invoices: [] });
    }

    const maxInvoiceNumber = latestInvoice.invoiceNumber;

    // Get the min (earliest) invoice number in same scope
    const earliestInvoice = await prisma.invoice.findFirst({
      where,
      orderBy: { invoiceNumber: 'asc' },
      select: { invoiceNumber: true },
    });

    const minInvoiceNumber = earliestInvoice!.invoiceNumber;

    // Get all EXISTING invoice numbers in this range (regardless of date)
    // We need to check if those invoice numbers exist at all in the DB
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: {
          gte: minInvoiceNumber,
          lte: maxInvoiceNumber,
        },
      },
      select: { invoiceNumber: true },
    });

    const existingSet = new Set(existingInvoices.map((inv) => inv.invoiceNumber));

    // Find gaps
    const missingInvoices = [];
    for (let i = minInvoiceNumber; i <= maxInvoiceNumber; i++) {
      if (!existingSet.has(i)) {
        missingInvoices.push({
          invoiceNumber: i,
          status: 'MISSING',
          rangeStart: minInvoiceNumber,
          rangeEnd: maxInvoiceNumber,
        });
      }
    }

    return NextResponse.json({ success: true, invoices: missingInvoices });
  } catch (error) {
    console.error('Error fetching missing invoices:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
