import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  //Get all invoices checked today or created today

  const data = await prisma.invoice.findMany({
    where : {
      OR: [
        {
          AND : [
            { checkTimestamp: { not: null } },
            { checkTimestamp: {
              gte: moment().startOf('day').toDate(),
              lte: moment().endOf('day').toDate(),
            }}
          ]
        },
        { generatedDate: {
          gte: moment().startOf('day').toDate(),
          lte: moment().endOf('day').toDate(),
        }}
      ]
    },
    orderBy: {
      generatedDate: 'desc'
    }
  });

  return Response.json({
    data: data || []
  });
}
