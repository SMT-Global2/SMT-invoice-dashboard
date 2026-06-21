import { prisma as globalPrisma } from '@/lib/prisma'
import moment from 'moment';

export async function findOrCreateDayStart(dateFilter: Date, tx?: any) {
  const client = tx || globalPrisma;
  const defaultStartNo = 1;

  const alreadyExist = await client.dayStartAgencyDeliveryMemo.findUnique({
    where: { date: moment(dateFilter).format('YYYY-MM-DD') }
  });

  if (alreadyExist) return {
    startNo: alreadyExist.startNo,
    endNo: alreadyExist.endNo
  };

  let startNo: number;
  let endNo: number | null = null;

  if (moment(dateFilter).isSame(moment(), 'day')) {
    const maxRecord = await client.agencyDeliveryMemo.findFirst({
      orderBy: { adNumber: 'desc' }
    });
    startNo = maxRecord ? maxRecord.adNumber + 1 : defaultStartNo;

    try {
      await client.dayStartAgencyDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          startNo,
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await client.dayStartAgencyDeliveryMemo.findUnique({
          where: { date: moment(dateFilter).startOf('day').format('YYYY-MM-DD') }
        });
        return {
          startNo: existing?.startNo || startNo,
          endNo: existing?.endNo || null
        };
      }
      throw error;
    }
  } else {
    const prevMax = await client.agencyDeliveryMemo.findFirst({
      where: {
        generatedDate: { lte: moment(dateFilter).startOf('day').toDate() }
      },
      orderBy: { adNumber: 'desc' }
    });

    const dayMax = await client.agencyDeliveryMemo.findFirst({
      where: {
        generatedDate: {
          gte: moment(dateFilter).startOf('day').toDate(),
          lte: moment(dateFilter).endOf('day').toDate(),
        }
      },
      orderBy: { adNumber: 'desc' }
    });

    startNo = prevMax?.adNumber ? prevMax.adNumber + 1 : defaultStartNo;
    endNo = dayMax?.adNumber || null;

    try {
      await client.dayStartAgencyDeliveryMemo.create({
        data: {
          date: moment(dateFilter).startOf('day').format('YYYY-MM-DD'),
          startNo,
          endNo
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const existing = await client.dayStartAgencyDeliveryMemo.findUnique({
          where: { date: moment(dateFilter).startOf('day').format('YYYY-MM-DD') }
        });
        return {
          startNo: existing?.startNo || startNo,
          endNo: existing?.endNo || endNo
        };
      }
      throw error;
    }
  }

  return { startNo, endNo };
}
