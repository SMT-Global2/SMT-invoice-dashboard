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
  
  // Build where clause for billed invoices only
  const where: any = {
    billedStatus: BilledStatus.BILLED
  };
  
  // Add search filter if provided
  if (search) {
    if (search === 'type:regular') {
      where.isOtc = false;
    } else if (search === 'type:otc') {
      where.isOtc = true;
    } else {
      where.invoiceNumber = {
        equals: isNaN(parseInt(search)) ? undefined : parseInt(search),
      };
    }
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
      invoiceNumber: 'asc'
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

// Add reset functionality to change billed status back to NOT_BILLED
export async function PUT(request: NextRequest) {
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

    const result = await prisma.invoice.update({
      where: {
        invoiceNumber: parseInt(invoiceNumber)
      },
      data: {
        billedStatus: BilledStatus.NOT_BILLED,
        billedTimestamp: null,
        billedUsername: null,
      },
    });

    return Response.json({
      success: true,
      message: 'Invoice reset successfully',
      data: result
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
