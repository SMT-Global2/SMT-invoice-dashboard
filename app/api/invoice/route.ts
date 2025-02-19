import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { findOrCreateDayStart } from './startNo/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');

  //Find day start
  // const dayStart = await prisma.dayStart.findUnique({
  //   where: {
  //     date: moment(dateFilter).startOf('day').format('YYYY-MM-DD')
  //   }
  // })

  // if(!dayStart){
  //   //Create Start Date
  //   let invoiceStartNo = 1;
  //   const maxInvoiceNumber = await prisma.invoice.findFirst({
  //     where : {
  //       generatedDate : {
  //         lt: moment(dateFilter).startOf('day').toDate()
  //       }
  //     },
  //     orderBy: {
  //       invoiceNumber: 'desc',
  //     }
  //   });
  //   if(maxInvoiceNumber){
  //     invoiceStartNo = maxInvoiceNumber.invoiceNumber + 1;
  //   }
  //   await prisma.dayStart.create({
  //     data: {
  //       date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
  //       invoiceStartNo
  //     }
  //   })
  // }

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


    // if(moment(invoice.invoiceTimestamp).diff(moment().startOf('day'), 'hours') < 24) {
    //   return Response.json({
    //     success: false,
    //     message: 'Cannot reset invoice that is invoiceTimestamp is less than 24 hours'
    //   }, { status: 400 });
    // }

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