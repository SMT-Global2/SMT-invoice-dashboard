import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { CheckStatus, PackageStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';

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

  const data = await prisma.invoice.findMany({
    where: {
      OR: [
        {
          AND: [
            { checkStatus: CheckStatus.CHECKED },
            { packageStatus: PackageStatus.NOT_PACKED }
          ]
        },
        {
          AND: [
            {
              packageStatus : PackageStatus.PACKED,
              packageTimestamp: {
                not: null,
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
              }
            },
          ]
        }
      ]
    },
    include: {
      party: true,
      invoicedBy: true,
      checkedBy: true,
      packedBy: true,
    },
    orderBy: {
      checkTimestamp: 'asc'
    }
  });

  return Response.json({
    data: data || []
  });
}

const packInvoiceSchema = z.object({
  image: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = packInvoiceSchema.parse(body);

    const searchParams = request.nextUrl.searchParams;
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return Response.json({
        success: false,
        message: 'Invoice number is required'
      }, { status: 400 });
    }

    const result = await prisma.invoice.update({
      where: {
        invoiceNumber: parseInt(invoiceNumber)
      },
      data: {
        image: validatedData.image,
        packageTimestamp: moment().toDate(),
        packageStatus: PackageStatus.PACKED,
        packageUsername: session.user.username,
      },
    });

    return Response.json({
      success: true,
      message: 'Invoice packed successfully',
      data: result
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        message: 'Validation failed : ' + error.errors.map(err => err.message).join(', '),
        errors: error.errors.map(err => err.message)
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
