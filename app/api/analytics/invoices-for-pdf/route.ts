'use server';

import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import moment from 'moment-timezone';
import { z } from 'zod';

const querySchema = z.object({
  date: z.string().refine((date) => moment(date, 'YYYY-MM-DD', true).isValid(), {
    message: "Invalid date format, expected YYYY-MM-DD",
  }),
  regionalCodes: z.string().optional().transform((val) => {
    try {
      return val ? JSON.parse(val) : undefined;
    } catch (e) {
      return undefined; // Return undefined if parsing fails
    }
  }).pipe(z.array(z.string()).optional()),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username || session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Invalid query parameters', errors: validation.error.errors }, { status: 400 });
    }

    const { date, regionalCodes } = validation.data;

    // Build date filter for the specific day
    const selectedDate = moment(date).startOf('day').toDate();
    const nextDay = moment(date).add(1, 'day').startOf('day').toDate();

    const where: any = {
      AND: [
        {
          generatedDate: { // Assuming you want to filter by generatedDate
            gte: selectedDate,
            lt: nextDay,
          },
        },
      ],
    };

    // Add regional codes filter if provided and not empty
    if (regionalCodes && regionalCodes.length > 0) {
      where.AND.push({
        party: {
          regionalCode: {
            in: regionalCodes,
          },
        },
      });
    }

    // Fetch invoices with necessary relations
    const invoices = await prisma.invoice.findMany({
      where,
      // Revert back to using include for relations
      include: { 
        party: true, 
        transportation: true, 
      },
      orderBy: {
        invoiceNumber: 'asc',
      },
    });

    // Map data, ensuring timestamps are accessed correctly
    const formattedInvoices = invoices.map(invoice => ({
      // Spread the original invoice to include all its direct fields
      ...invoice, 
      // Explicitly add derived/formatted fields
      transportationName: invoice.transportation?.companyName || null,
      partyName: invoice.party?.customerName,
      cityName: invoice.party?.city,
      regionalCode: invoice.party?.regionalCode,
      // goodsCollectedTimestamp and goodsCheckedTimestamp are included via '...invoice'
    }));


    return NextResponse.json({ success: true, invoices: formattedInvoices });

  } catch (error) {
    console.error('Error fetching invoices for PDF:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
} 