import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { CheckStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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
    
    // Search parameter
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';

    console.log(date);
    
    // Build where clause
    const where: any = {
      isOtc: false,
      checkStatus: CheckStatus.CHECKED,
      checkTimestamp: date ? { 
        not: null, 
        gte: moment(date).startOf('day').toDate(),
        lte: moment(date).endOf('day').toDate(),
      } : { 
        not: null, 
      }
    };
    
    // Add search filter if provided
    if (search) {
      where.invoiceNumber = {
        equals: isNaN(parseInt(search)) ? undefined : parseInt(search),
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
        checkTimestamp: 'asc'
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
    
  } catch (error) {
    return Response.json({
      error: 'Error fetching data'
    }, { status: 500 })
  }
} 