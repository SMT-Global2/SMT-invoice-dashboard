import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { BilledStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  
  // Pagination parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;
  
  // Search and filter parameters
  const search = searchParams.get('search') || '';
  const dateStr = searchParams.get('date') || '';
  
  // Build where clause for unbilled invoices
  const where: any = {
    isOtc: false,
    billedStatus: BilledStatus.NOT_BILLED
  };
  
  // Add search filter if provided
  if (search) {
    where.invoiceNumber = {
      equals: isNaN(parseInt(search)) ? undefined : parseInt(search),
    };
  }
  
  // Add date filter if provided
  if (dateStr) {
    const date = moment(dateStr).startOf('day');
    where.generatedDate = {
      gte: date.toDate(),
      lt: date.clone().add(1, 'day').toDate(),
    };
  }
  
  // Get total count for pagination
  const totalCount = await prisma.invoice.count({ where });
  const totalPages = Math.ceil(totalCount / limit);
  
  // Get paginated data
  const data = await prisma.invoice.findMany({
    where,
    include: {
      party: true,
    },
    orderBy: {
      generatedDate: 'asc'
    },
    skip,
    take: limit,
  });

  return Response.json({
    data: data || [],
    currentPage: page,
    totalPages,
    totalCount
  });
}

const billInvoiceSchema = z.object({
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
    const validatedData = billInvoiceSchema.parse(body);

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
        billedTimestamp: moment().toDate(),
        billedStatus: BilledStatus.BILLED,
        billedUsername: session.user.username,
      },
    });

    return Response.json({
      success: true,
      message: 'Invoice billed successfully',
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
