import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const transportationDeliverSchema = z.object({
  invoiceNumbers: z.array(z.number()),
  transportationId: z.string()
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
    const validatedData = transportationDeliverSchema.parse(body);

    if (validatedData.invoiceNumbers.length === 0) {
      return Response.json({
        success: false,
        message: 'No invoice numbers provided'
      }, { status: 400 });
    }

    // Verify that the transportation company exists
    const transportation = await prisma.transportation.findUnique({
      where: { id: validatedData.transportationId }
    });

    if (!transportation) {
      return Response.json({
        success: false,
        message: 'Transportation company not found'
      }, { status: 404 });
    }

    // Update all selected invoices
    const now = moment().toDate();
    const updatedInvoices = await prisma.$transaction(
      validatedData.invoiceNumbers.map(invoiceNumber => 
        prisma.invoice.update({
          where: { invoiceNumber },
          data: {
            // Set both pickup and delivery to the same user and time
            // since this is direct transportation delivery
            pickupUsername: session.user.username,
            pickupTimestamp: now,
            deliveredUsername: session.user.username,
            deliveredTimestamp: now,
            deliveryStatus: DeliveryStatus.DELIVERED,
            transportationId: validatedData.transportationId
          }
        })
      )
    );

    return Response.json({
      success: true,
      message: `${updatedInvoices.length} invoices delivered successfully via transportation`,
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

    console.error('Error in transportation delivery:', error);

    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 