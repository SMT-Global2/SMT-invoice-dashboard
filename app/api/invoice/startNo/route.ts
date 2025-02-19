import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from './helper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  //find maximum invoice number
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date') ?? new Date();

  const dayStart = await prisma.dayStart.findUnique({
    where: {
      date: moment(dateFilter).startOf('day').format('YYYY-MM-DD')
    }
  })

  if(dayStart){
    return Response.json({
      invoiceStartNo : dayStart.invoiceStartNo,
      invoiceEndNo : dayStart.invoiceEndNo
    });
  }
  
  const {
    invoiceStartNo,
    invoiceEndNo
  } = await findOrCreateDayStart(moment(dateFilter).toDate());

  return Response.json({
    invoiceStartNo,
    invoiceEndNo
  });
}


