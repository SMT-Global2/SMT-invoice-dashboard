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

    const data = await prisma.invoice.findMany({
        where: {
            isOtc : false,
            OR: [
                {
                    AND: [
                        { packageTimestamp: { not: null } },
                        { packageStatus: PackageStatus.PACKED },
                        { deliveryStatus: DeliveryStatus.NOT_DELIVERED }
                    ]
                },
                {
                    AND: [
                        { packageTimestamp: { not: null } },
                        { deliveryStatus: DeliveryStatus.PICKED_UP }
                    ]
                },
                {
                    AND: [
                        {
                            deliveredTimestamp: {
                                not: null,
                                gte: moment().startOf('day').toDate(),
                                lte: moment().endOf('day').toDate(),
                            }
                        },
                        { deliveryStatus: DeliveryStatus.DELIVERED }
                    ]
                },
            ]
        },
        include: {
            party: true,
            // invoicedBy: true,
            // checkedBy: true,
            // packedBy: true,
            // deliveredBy: true,
            // pickedUpBy: true
        },
        orderBy: {
            packageTimestamp : 'asc'
        }
    });

    return Response.json({
        data: data || []
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
