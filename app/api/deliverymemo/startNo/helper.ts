import { prisma } from '@/lib/prisma'
import moment from 'moment';

export async function findOrCreateDayStart(dateFilter: Date) {
  const result = await prisma.$transaction(async (prismaTxn) => {
    const defaultDmStartNo = 1

    const alreadyExist = await prisma.dayStartDeliveryMemo.findUnique({
      where: {
        date: moment(dateFilter).format('YYYY-MM-DD')
      }
    }) 

    if(alreadyExist) return {
      invoiceStartNo: alreadyExist.invoiceStartNo,
      invoiceEndNo: alreadyExist.invoiceEndNo
    };

    //Create
    let invoiceStartNo = null;
    let invoiceEndNo = null;

    if(moment(dateFilter).isSame(moment(), 'day')) {
      //Create Start Date
      const maxDmNumber = await prisma.deliveryMemo.findFirst({
        where: {
          generatedDate: {
            lt: moment(dateFilter).startOf('day').toDate()
          }
        },
        orderBy: {
          dmNumber: 'desc',
        }
      });
      
      if(maxDmNumber){
        invoiceStartNo = maxDmNumber.dmNumber + 1;
      } else {
        invoiceStartNo = defaultDmStartNo;
      }
      
      await prisma.dayStartDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
        }
      })
    } else {
      //Create Start Date for past dates
      const lowestDmNumber = await prisma.deliveryMemo.findFirst({
        where: {
          generatedDate: {
            lte: moment(dateFilter).startOf('day').toDate()
          }
        },
        orderBy: {
          dmNumber: 'desc',
        }
      }) 
      
      const maxDmNumber = await prisma.deliveryMemo.findFirst({
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

      await prisma.dayStartDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          invoiceStartNo,
          invoiceEndNo
        }
      })
    }
    
    return {
      invoiceStartNo,
      invoiceEndNo
    }
  })

  return result;
} 