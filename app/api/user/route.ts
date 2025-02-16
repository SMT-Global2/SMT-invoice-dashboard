import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
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
    where: {
      ...where,
    },
    include: {
      party: true,
      invoicedBy: true
    },
    orderBy: {
      generatedDate: 'desc'
    },
  });

  return Response.json({
    data: data || []
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return Response.json({
        success: false,
        message: 'Invoice number is required'
      }, { status: 400 });
    }

    // Create invoice with validated data
    const result = await prisma.invoice.delete({
      where: {
        invoiceNumber: parseInt(invoiceNumber)
      }
    });

    return Response.json({
      success: true,
      message: 'Invoice deleted successfully',
      data: result
    });


  } catch (error) {
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}