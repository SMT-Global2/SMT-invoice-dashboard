import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from './helper';

export async function GET(request: NextRequest) {
  //find maximum delivery memo number
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date') ?? new Date();

  const dayStart = await prisma.dayStartDeliveryMemo.findUnique({
    where: {
      date: moment(dateFilter).startOf('day').format('YYYY-MM-DD')
    }
  })

  if(dayStart){
    return Response.json({
      dmStartNo: dayStart.invoiceStartNo,
      dmEndNo: dayStart.invoiceEndNo
    });
  }
  
  const {
    invoiceStartNo,
    invoiceEndNo
  } = await findOrCreateDayStart(moment(dateFilter).toDate());

  return Response.json({
    dmStartNo: invoiceStartNo,
    dmEndNo: invoiceEndNo
  });
} 