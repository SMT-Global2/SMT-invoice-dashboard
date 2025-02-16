import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { CheckStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;
  //Get all invoices checked today or created today

  const data = await prisma.invoice.findMany({
    where : {
      OR: [
        {
          AND : [
            { checkTimestamp: { not: null } },
            { checkStatus : CheckStatus.NOT_CHECKED }
          ]
        },
        {
          AND : [
            { packageTimestamp: { not: null } },
            { packageTimestamp: {
              gte: moment().startOf('day').toDate(),
              lte: moment().endOf('day').toDate(),
            }}
          ]
        }
      ]
    },
    include : {
      party : true,
      invoicedBy: true,
      checkedBy : true,
      packedBy: true,
    },
    orderBy: {
      generatedDate: 'desc'
    }
  });

  return Response.json({
    data: data || []
  });
}
