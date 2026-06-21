import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import moment from 'moment';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateDayStart } from './startNo/helper';
import { UserType } from '@prisma/client';
import { z } from 'zod';

const saveSchema = z.object({
  agencyCode: z.string().nonempty('Agency code is required'),
  voucherNumber: z.string().optional(),
  lrNumber: z.string().optional(),
  lrDate: z.string().datetime(),
  image: z.array(z.string()).nonempty('At least one image is required'),
  generatedDate: z.string().datetime(),
});

const updateSchema = z.object({
  adNumber: z.number().int().positive(),
  agencyCode: z.string().nonempty('Agency code is required'),
  voucherNumber: z.string().optional().nullable(),
  lrNumber: z.string().optional().nullable(),
  lrDate: z.string().datetime(),
  image: z.array(z.string()).nonempty('At least one image is required'),
  generatedDate: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');
  const agencyFilter = searchParams.get('agencyCode');

  const where: any = {};

  if (dateFilter) {
    where.generatedDate = {
      gte: moment(dateFilter).startOf('day').toDate(),
      lte: moment(dateFilter).endOf('day').toDate(),
    };
  }

  if (agencyFilter) {
    where.agencyCode = agencyFilter;
  }

  const data = await prisma.agencyDeliveryMemo.findMany({
    where,
    include: { agency: true },
    orderBy: { adNumber: 'desc' }
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = saveSchema.parse(body);

    const generatedDate = new Date(validated.generatedDate);
    const dateStr = moment(generatedDate).format('YYYY-MM-DD');

    const result = await prisma.$transaction(async (tx) => {
      const dayStart = await findOrCreateDayStart(generatedDate, tx);
      const adNumber = dayStart.endNo !== null ? dayStart.endNo + 1 : dayStart.startNo;

      const memo = await tx.agencyDeliveryMemo.create({
        data: {
          adNumber,
          generatedDate,
          agencyCode: validated.agencyCode,
          voucherNumber: validated.voucherNumber || null,
          lrNumber: validated.lrNumber || null,
          lrDate: new Date(validated.lrDate),
          image: validated.image,
          createdBy: session.user.username,
        },
        include: { agency: true }
      });

      await tx.dayStartAgencyDeliveryMemo.update({
        where: { date: dateStr },
        data: { endNo: adNumber }
      });

      return memo;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed: ' + error.errors.map((e: any) => e.message).join(', ')
      }, { status: 400 });
    }
    console.error('Error saving agency delivery memo:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.agencyDeliveryMemo.findUnique({
      where: { adNumber: validated.adNumber }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Agency delivery memo not found' }, { status: 404 });
    }

    const updated = await prisma.agencyDeliveryMemo.update({
      where: { adNumber: validated.adNumber },
      data: {
        agencyCode: validated.agencyCode,
        voucherNumber: validated.voucherNumber || null,
        lrNumber: validated.lrNumber || null,
        lrDate: new Date(validated.lrDate),
        image: validated.image,
        generatedDate: new Date(validated.generatedDate),
      },
      include: { agency: true }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed: ' + error.errors.map((e: any) => e.message).join(', ')
      }, { status: 400 });
    }
    console.error('Error updating agency delivery memo:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.type !== UserType.ADMIN) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const adNumber = request.nextUrl.searchParams.get('adNumber');
    if (!adNumber) {
      return NextResponse.json({ success: false, message: 'adNumber is required' }, { status: 400 });
    }

    const memo = await prisma.agencyDeliveryMemo.findUnique({
      where: { adNumber: parseInt(adNumber) }
    });

    if (!memo) {
      return NextResponse.json({ success: false, message: 'Agency delivery memo not found' }, { status: 404 });
    }

    if (Math.abs(moment(memo.createdAt).diff(moment(), 'hours')) > 72) {
      return NextResponse.json({
        success: false,
        message: 'Cannot reset a memo created more than 72 hours ago'
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.agencyDeliveryMemo.delete({ where: { adNumber: parseInt(adNumber) } });

      if (moment(memo.generatedDate).isSame(moment(), 'day')) {
        const dayStart = await findOrCreateDayStart(moment().toDate(), tx);
        if (dayStart.endNo && dayStart.endNo === parseInt(adNumber)) {
          const secondBest = await tx.agencyDeliveryMemo.findFirst({
            where: {
              generatedDate: {
                gte: moment().startOf('day').toDate(),
                lte: moment().endOf('day').toDate(),
              }
            },
            orderBy: { adNumber: 'desc' }
          });
          await tx.dayStartAgencyDeliveryMemo.update({
            where: { date: moment().format('YYYY-MM-DD') },
            data: { endNo: secondBest?.adNumber ?? null }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting agency delivery memo:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
