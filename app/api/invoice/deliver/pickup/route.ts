import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function POST(request: NextRequest) {
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
                pickupTimestamp: moment().toDate(),
                deliveryStatus: DeliveryStatus.PICKED_UP,
                pickupUsername: session.user.username,
            },
        });

        return Response.json({
            success: true,
            message: 'Invoice picked up successfully',
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
