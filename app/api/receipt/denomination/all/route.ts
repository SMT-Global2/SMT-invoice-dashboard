import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import moment from 'moment';

const emptyBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username || session.user.type !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : moment().format('YYYY-MM-DD');

    const records = await prisma.userDailyDenomination.findMany({
      where: { date },
    });

    const data = records.map((record) => ({
      username: record.username,
      bills: record.bills ?? emptyBills,
      updatedAt: record.updatedAt,
    }));

    return NextResponse.json({
      data,
    });
  } catch (error) {
    console.error('Error fetching all daily denominations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
