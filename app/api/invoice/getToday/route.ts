import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');

  const where = dateFilter 
    ? {
        generatedDate: {
          gte: moment(dateFilter).startOf('day').toDate(),
          lte: moment(dateFilter).endOf('day').toDate(),
        }
      }
    : {
        generatedDate: {
          gte: moment().startOf('day').toDate(),
          lte: moment().endOf('day').toDate(),
        }
      };

  const data = await prisma.invoice.findMany({
    where : {
      ...where,
    },
    include : {
      party : true,
    },
    orderBy: {
      generatedDate: 'desc'
    },
  });

  return Response.json({
    data: data || []
  });
}
