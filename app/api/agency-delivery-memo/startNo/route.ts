import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateDayStart } from './helper';
import moment from 'moment';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get('date');
  const dateFilter = dateParam ? moment(dateParam).toDate() : moment().toDate();

  const { startNo, endNo } = await findOrCreateDayStart(dateFilter);

  return NextResponse.json({ success: true, adStartNo: startNo, adEndNo: endNo });
}
