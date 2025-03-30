import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { CheckStatus, PackageStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const regionalCodes = searchParams.get('regionalCodes')?.split(',') || [];
    const date = searchParams.get('date') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      packageStatus: PackageStatus.NOT_PACKED,
      packageTimestamp: date ? {
        not: null,
        gte: moment(date).startOf('day').toDate(),
        lte: moment(date).endOf('day').toDate(),
      } : {
        not: null,
      },
    };

    // Add regional code filter if provided
    if (regionalCodes.length > 0) {
      where.party = {
        ...where.party,
        regionalCode: {
          in: regionalCodes
        }
      };
    }

    if (search) {
      where.invoiceNumber = {
        equals: isNaN(parseInt(search)) ? undefined : parseInt(search),
      };
    }

    // Get total count and data in parallel using Promise.all
    const [totalCount, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          party: true,
        },
        orderBy: {
          generatedDate: 'desc'
        },
        skip,
        take: limit
      })
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: invoices,
      currentPage: page,
      totalPages,
      totalCount
    });

  } catch (error) {
    console.error('Error fetching unpacked invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unpacked invoices' },
      { status: 500 }
    );
  }
} 