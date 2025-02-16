import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  //find maximum invoice number
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date') ?? new Date();


  const data = await prisma.invoice.findFirst({
    where : {
      invoiceTimestamp : {
          not: null,
          gte: moment(dateFilter).subtract(1 , 'day').startOf('day').toDate(),
          lte: moment(dateFilter).subtract(1 , 'day').endOf('day').toDate()
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  });

  return Response.json({
    data: (data?.invoiceNumber ?? 0) + 1
  });
}
