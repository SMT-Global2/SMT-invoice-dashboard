import { prisma as globalPrisma } from '@/lib/prisma'
import moment from 'moment';

export async function findOrCreateDayStart(dateFilter: Date, tx?: any) {
  const client = tx || globalPrisma;
  
  const defaultDmStartNo = 1

  const alreadyExist = await client.dayStartDeliveryMemo.findUnique({
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
    const maxDmNumber = await client.deliveryMemo.findFirst({
      orderBy: {
        dmNumber: 'desc',
      }
    });
    
    if (maxDmNumber) {
      invoiceStartNo = maxDmNumber.dmNumber + 1;
    } else {
      invoiceStartNo = defaultDmStartNo;
    }
    
    try {
      await client.dayStartDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
        }
      })
    } catch (error: any) {
      // If record was created by another process, find it
      if (error.code === 'P2002') {
        const existing = await client.dayStartDeliveryMemo.findUnique({
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
    const lowestDmNumber = await client.deliveryMemo.findFirst({
      where: {
        generatedDate: {
          lte: moment(dateFilter).startOf('day').toDate()
        }
      },
      orderBy: {
        dmNumber: 'desc',
      }
    }) 
    
    const maxDmNumber = await client.deliveryMemo.findFirst({
      where: {
        generatedDate: {
          gte: moment(dateFilter).startOf('day').toDate(),
          lte: moment(dateFilter).endOf('day').toDate(),
        }
      },
      orderBy: {
        dmNumber: 'desc',
      }
    });

    invoiceStartNo = lowestDmNumber?.dmNumber ? lowestDmNumber.dmNumber + 1 : defaultDmStartNo;
    invoiceEndNo = maxDmNumber?.dmNumber ? maxDmNumber.dmNumber : null;

    try {
      await client.dayStartDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
          invoiceEndNo
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await client.dayStartDeliveryMemo.findUnique({
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