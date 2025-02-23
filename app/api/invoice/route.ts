import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from './startNo/helper';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }

  
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');

  const where = dateFilter
    ? {
      generatedDate: {
        gte: moment(dateFilter).startOf('day').toDate(),
        lte: moment(dateFilter).endOf('day').toDate(),
      }
    }
    : {
      generatedDate: {
        gte: moment().startOf('day').toDate(),
        lte: moment().endOf('day').toDate(),
      }
    };

  const data = await prisma.invoice.findMany({
    where: {
      ...where,
    },
    include: {
      party: true,
    },
    orderBy: {
      generatedDate: 'desc'
    },
  });

  return Response.json({
    data: data || []
  });
}

export async function DELETE(request: NextRequest) {
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

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceNumber: parseInt(invoiceNumber)
      }
    })

    if(!invoice) {
      return Response.json({
        success: false,
        message: 'Invoice not found'
      }, { status: 404 });
    }

    console.log(Math.abs(moment(invoice.invoiceTimestamp).diff(moment(), 'hours')))

    if(Math.abs(moment(invoice.invoiceTimestamp).diff(moment(), 'hours')) > 72) {
      return Response.json({
        success: false,
        message: 'Cannot reset invoice that is generated before 72 hours'
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (prismaTxn) => {
      //Delete invoice
      const result = await prisma.invoice.delete({
        where: {
          invoiceNumber: parseInt(invoiceNumber)
        },
      });

      //get todays number
      if (moment(invoice.generatedDate).isSame(moment() , 'day')) {
        const maxInvoiceNumber = await findOrCreateDayStart(moment().toDate());
        if(maxInvoiceNumber.invoiceEndNo && maxInvoiceNumber.invoiceEndNo === parseInt(invoiceNumber)) {
          //Find 2nd best or set to null
          const secondBest = await prismaTxn.invoice.findFirst({
            where: {
              generatedDate: {
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
              }
            },
            orderBy: {
              invoiceNumber: 'desc'
            }
          })

          await prismaTxn.dayStart.update({
            where: {
                date: moment().format('YYYY-MM-DD')
            },
            data: {
                invoiceEndNo: secondBest?.invoiceNumber || null
            }
          })
        }
      }

      return result;
    })

    return Response.json({
      success: true,
      message: 'Invoice reseted successfully',
      data: result
    });


  } catch (error) {
    
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}