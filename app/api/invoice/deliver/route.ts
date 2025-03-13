import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { DeliveryStatus, PackageStatus } from '@prisma/client';
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
    const dateParam = searchParams.get('date');
    
    // Pagination parameters
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    
    // Create date filters based on the provided date parameter
    let dateFilter = {};
    if (dateParam) {
        const selectedDate = moment(dateParam);
        
        // For delivered packages, filter by delivery date
        const deliveredDateFilter = {
            deliveredTimestamp: {
                gte: selectedDate.startOf('day').toDate(),
                lte: selectedDate.endOf('day').toDate(),
            }
        };
        
        // For packages to be delivered or in transit, filter by package date
        const packageDateFilter = {
            packageTimestamp: {
                gte: selectedDate.startOf('day').toDate(),
                lte: selectedDate.endOf('day').toDate(),
            }
        };
        
        dateFilter = {
            OR: [
                {
                    AND: [
                        { deliveryStatus: DeliveryStatus.DELIVERED },
                        deliveredDateFilter
                    ]
                },
                {
                    AND: [
                        { deliveryStatus: { not: DeliveryStatus.DELIVERED } },
                        packageDateFilter
                    ]
                }
            ]
        };
    }

    // Fetch data from all three endpoints and combine
    const [toDeliverResponse, inTransitResponse, deliveredResponse] = await Promise.all([
        fetch(new URL(`/api/invoice/deliver/to-deliver?page=${page}&limit=${limit}${dateParam ? `&date=${dateParam}` : ''}`, request.url).toString(), {
            headers: {
                cookie: request.headers.get('cookie') || ''
            }
        }),
        fetch(new URL(`/api/invoice/deliver/in-transit?page=${page}&limit=${limit}${dateParam ? `&date=${dateParam}` : ''}`, request.url).toString(), {
            headers: {
                cookie: request.headers.get('cookie') || ''
            }
        }),
        fetch(new URL(`/api/invoice/deliver/delivered?page=${page}&limit=${limit}${dateParam ? `&date=${dateParam}` : ''}`, request.url).toString(), {
            headers: {
                cookie: request.headers.get('cookie') || ''
            }
        })
    ]);

    const [toDeliverData, inTransitData, deliveredData] = await Promise.all([
        toDeliverResponse.json(),
        inTransitResponse.json(),
        deliveredResponse.json()
    ]);

    // Combine all data
    const combinedData = [
        ...(toDeliverData.data || []),
        ...(inTransitData.data || []),
        ...(deliveredData.data || [])
    ];

    // Calculate total pages as the maximum of all three endpoints
    const totalPages = Math.max(
        toDeliverData.totalPages || 1,
        inTransitData.totalPages || 1,
        deliveredData.totalPages || 1
    );

    // Calculate total count as the sum of all three endpoints
    const totalCount = (toDeliverData.totalCount || 0) + 
                       (inTransitData.totalCount || 0) + 
                       (deliveredData.totalCount || 0);

    return Response.json({
        data: combinedData,
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages
    });
}

const packInvoiceSchema = z.object({
    deliveredLocationLink: z.string().nonempty('Delivered location link is required'),
    image: z.array(z.string())
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
                deliveredLocationLink: validatedData.deliveredLocationLink,
                image: validatedData.image,
                deliveredTimestamp: moment().toDate(),
                deliveryStatus:  DeliveryStatus.DELIVERED,
                deliveredUsername: session.user.username,
            },
        });

        return Response.json({
            success: true,
            message: 'Invoice delivered successfully',
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
