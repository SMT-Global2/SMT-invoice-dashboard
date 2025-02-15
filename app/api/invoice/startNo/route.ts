import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  //find maximum invoice number
  const data = await prisma.invoice.findFirst({
    orderBy: {
      invoiceNumber: 'desc'
    }
  });

  return Response.json({
    data: data?.invoiceNumber || 1
  });
}
