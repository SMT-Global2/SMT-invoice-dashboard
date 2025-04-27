import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const moveToTransitSchema = z.object({
  invoiceNumbers: z.array(z.number())
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
    const validatedData = moveToTransitSchema.parse(body);

    if (validatedData.invoiceNumbers.length === 0) {
      return Response.json({
        success: false,
        message: 'No invoice numbers provided'
      }, { status: 400 });
    }

    // Update all selected invoices
    const now = moment().toDate();
    const updatedInvoices = await prisma.$transaction(
      validatedData.invoiceNumbers.map(invoiceNumber => 
        prisma.invoice.update({
          where: { invoiceNumber },
          data: {
            pickupUsername: session.user.username,
            pickupTimestamp: now,
            deliveryStatus: DeliveryStatus.PICKED_UP
          }
        })
      )
    );

    return Response.json({
      success: true,
      message: `${updatedInvoices.length} invoices moved to transit successfully`,
      data: updatedInvoices
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        message: 'Validation failed: ' + error.errors.map(err => err.message).join(', '),
        errors: error.errors
      }, { status: 400 });
    }

    console.error('Error in move to transit:', error);

    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 