import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { PackageStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const date = searchParams.get('date') || '';
    const skip = (page - 1) * limit;
    
    // Search parameter
    const search = searchParams.get('search') || '';
    const regionalCodes = searchParams.get('regionalCodes')?.split(',') || [];
    
    // Build where clause
    const where: any = {
      isOtc: false,
      packageStatus: PackageStatus.PACKED,
      packageTimestamp: date ? {
        not: null,
        gte: moment(date).startOf('day').toDate(),
        lte: moment(date).endOf('day').toDate(),
      } : {
        not: null,
      },
    };
    
    // Add search filter if provided
    if (search) {
      where.invoiceNumber = {
        equals: isNaN(parseInt(search)) ? undefined : parseInt(search),
      };
    }
    
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
    const [totalCount, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          party: true,
        },
        orderBy: {
          packageTimestamp: 'desc'
        },
        skip,
        take: limit,
      })
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    return NextResponse.json({
      data: data || [],
      currentPage: page,
      totalPages,
      totalCount
    });
    
  } catch (error) {
    console.error('Error fetching packed invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packed invoices' },
      { status: 500 }
    );
  }
} 