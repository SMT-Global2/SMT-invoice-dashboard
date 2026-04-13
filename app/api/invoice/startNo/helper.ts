import { prisma as globalPrisma } from '@/lib/prisma'
import moment from 'moment';

export async function findOrCreateDayStart(dateFilter: Date, tx?: any) {
  const client = tx || globalPrisma;
  
  const defaultInvoiceStartNo = 1

  const alreadyExist = await client.dayStartInvoice.findUnique({
    where: {
      date: moment(dateFilter).format('YYYY-MM-DD')
    }
  }) 

  if (alreadyExist) return {
    invoiceStartNo: alreadyExist.invoiceStartNo,
    invoiceEndNo: alreadyExist.invoiceEndNo
  };

  // Create
  let invoiceStartNo = null;
  let invoiceEndNo = null;

  if (moment(dateFilter).isSame(moment(), 'day')) {
    // Create Start Date
    // Create Start Date - always look for the absolute maximum to prevent collisions
    const maxInvoiceNumber = await client.invoice.findFirst({
      orderBy: {
        invoiceNumber: 'desc',
      }
    });

    if (maxInvoiceNumber) {
      invoiceStartNo = maxInvoiceNumber.invoiceNumber + 1;
    } else {
      invoiceStartNo = defaultInvoiceStartNo;
    }

    try {
      await client.dayStartInvoice.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
        }
      })
    } catch (error: any) {
      // If record was created by another process, find it
      if (error.code === 'P2002') {
        const existing = await client.dayStartInvoice.findUnique({
          where: {
            date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          }
        });
        return {
          invoiceStartNo: existing?.invoiceStartNo || invoiceStartNo,
          invoiceEndNo: existing?.invoiceEndNo || null
        };
      }
      throw error;
    }
  } else {
    // Create Start Date for past dates
    const lowestInvoiceNumber = await client.invoice.findFirst({
      where: {
        generatedDate: {
          lte: moment(dateFilter).startOf('day').toDate()
        }
      },
      orderBy: {
        invoiceNumber: 'desc',
      }
    })

    const maxInvoiceNumber = await client.invoice.findFirst({
      where: {
        generatedDate: {
          gte: moment(dateFilter).startOf('day').toDate(),
          lte: moment(dateFilter).endOf('day').toDate(),
        }
      },
      orderBy: {
        invoiceNumber: 'desc',
      }
    });

    invoiceStartNo = lowestInvoiceNumber?.invoiceNumber ? lowestInvoiceNumber.invoiceNumber + 1 : defaultInvoiceStartNo;
    invoiceEndNo = maxInvoiceNumber?.invoiceNumber ? maxInvoiceNumber.invoiceNumber : null;

    try {
      await client.dayStartInvoice.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
          invoiceEndNo
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await client.dayStartInvoice.findUnique({
          where: {
            date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          }
        });
        return {
          invoiceStartNo: existing?.invoiceStartNo || invoiceStartNo,
          invoiceEndNo: existing?.invoiceEndNo || invoiceEndNo
        };
      }
      throw error;
    }
  }

  return {
    invoiceStartNo,
    invoiceEndNo
  }
}