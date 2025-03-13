import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
        return Response.json({
            success: false,
            message: 'Unauthorized'
        }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const searchTerm = searchParams.get('search') || '';
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Create date filter based on the provided date parameter
    let dateFilter = {};
    if (dateParam) {
        const selectedDate = moment(dateParam);
        dateFilter = {
            deliveredTimestamp: {
                gte: selectedDate.startOf('day').toDate(),
                lte: selectedDate.endOf('day').toDate(),
            }
        };
    } else {
        // Default to today if no date is provided
        dateFilter = {
            deliveredTimestamp: {
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
            }
        };
    }

    // Create search filter
    let searchFilter = {};
    if (searchTerm) {
        searchFilter = {
            OR: [
                ...(isNaN(parseInt(searchTerm)) ? [] : [{ invoiceNumber: parseInt(searchTerm) }]),
                { partyCode: { contains: searchTerm, mode: 'insensitive' } },
                { party: { customerName: { contains: searchTerm, mode: 'insensitive' } } }
            ]
        };
    }

    const [totalCount, data] = await Promise.all([
        prisma.invoice.count({
            where: {
                isOtc: false,
                deliveredTimestamp: { not: null },
                ...dateFilter,
                ...(searchTerm ? searchFilter : {}),
                deliveryStatus: DeliveryStatus.DELIVERED
            }
        }),
        prisma.invoice.findMany({
            where: {
                isOtc: false,
                deliveredTimestamp: { not: null },
                ...dateFilter,
                ...(searchTerm ? searchFilter : {}),
                deliveryStatus: DeliveryStatus.DELIVERED
            },
            include: {
                party: true,
            },
            orderBy: {
                deliveredTimestamp: 'desc'
            },
            skip,
            take: limit
        })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return Response.json({
        data: data || [],
        page,
        limit,
        totalCount,
        totalPages
    });
} 