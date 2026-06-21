import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import moment from 'moment';
import { z } from 'zod';

const billsSchema = z.object({
  500: z.coerce.number().int().nonnegative().default(0),
  200: z.coerce.number().int().nonnegative().default(0),
  100: z.coerce.number().int().nonnegative().default(0),
  50: z.coerce.number().int().nonnegative().default(0),
  20: z.coerce.number().int().nonnegative().default(0),
  10: z.coerce.number().int().nonnegative().default(0),
});

const putSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  username: z.string().optional(),
  bills: billsSchema,
});

const emptyBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const usernameParam = url.searchParams.get('username');
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : moment().format('YYYY-MM-DD');
    const username = usernameParam || session.user.username;

    const record = await prisma.userDailyDenomination.findUnique({
      where: { date_username: { date, username } },
    });

    return NextResponse.json({
      data: {
        date,
        username,
        bills: record?.bills ?? emptyBills,
        updatedAt: record?.updatedAt ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching daily denomination:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = putSchema.parse(body);
    const date = parsed.date ?? moment().format('YYYY-MM-DD');
    const username = parsed.username ?? session.user.username;

    if (username !== session.user.username && session.user.type !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const record = await prisma.userDailyDenomination.upsert({
      where: { date_username: { date, username } },
      create: { date, username, bills: parsed.bills },
      update: { bills: parsed.bills },
    });

    return NextResponse.json({
      data: {
        date: record.date,
        username: record.username,
        bills: record.bills ?? emptyBills,
        updatedAt: record.updatedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation failed: ' + error.errors.map((e: any) => e.message).join(', ') },
        { status: 400 }
      );
    }
    console.error('Error saving daily denomination:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
