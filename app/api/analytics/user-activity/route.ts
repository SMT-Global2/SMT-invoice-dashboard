import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCached, setCache } from '@/lib/api-cache'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return Response.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 });
  }

  const cacheKey = request.url;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    // Build date filter
    const dateFilter: any = {}
    if (fromDate) {
      dateFilter.gte = fromDate
    }
    if (toDate) {
      dateFilter.lte = toDate
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 5 parallel groupBy queries instead of fetching ALL invoices
    const [
      createdByUser,
      checkedByUser,
      packedByUser,
      deliveredByUser,
      billedByUser
    ] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['invoiceUsername'],
        where: {
          invoiceUsername: { not: null },
          ...(hasDateFilter ? { invoiceTimestamp: dateFilter } : {})
        },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['checkUsername'],
        where: {
          checkUsername: { not: null },
          ...(hasDateFilter ? { checkTimestamp: dateFilter } : {})
        },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['packageUsername'],
        where: {
          packageUsername: { not: null },
          ...(hasDateFilter ? { packageTimestamp: dateFilter } : {})
        },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['deliveredUsername'],
        where: {
          deliveredUsername: { not: null },
          ...(hasDateFilter ? { deliveredTimestamp: dateFilter } : {})
        },
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['billedUsername'],
        where: {
          billedUsername: { not: null },
          ...(hasDateFilter ? { billedTimestamp: dateFilter } : {})
        },
        _count: true
      })
    ]);

    // Merge into per-user activity map
    const userActivities = new Map<string, {
      username: string;
      name: string;
      invoiceCount: number;
      created: number;
      checked: number;
      packed: number;
      delivered: number;
      billed: number;
      total: number;
    }>();

    const getOrCreate = (username: string) => {
      let entry = userActivities.get(username);
      if (!entry) {
        entry = {
          username,
          name: '',
          invoiceCount: 0,
          created: 0,
          checked: 0,
          packed: 0,
          delivered: 0,
          billed: 0,
          total: 0
        };
        userActivities.set(username, entry);
      }
      return entry;
    };

    for (const row of createdByUser) {
      if (row.invoiceUsername) {
        const entry = getOrCreate(row.invoiceUsername);
        entry.created = row._count;
        entry.invoiceCount = row._count;
        entry.total += row._count;
      }
    }
    for (const row of checkedByUser) {
      if (row.checkUsername) {
        const entry = getOrCreate(row.checkUsername);
        entry.checked = row._count;
        entry.total += row._count;
      }
    }
    for (const row of packedByUser) {
      if (row.packageUsername) {
        const entry = getOrCreate(row.packageUsername);
        entry.packed = row._count;
        entry.total += row._count;
      }
    }
    for (const row of deliveredByUser) {
      if (row.deliveredUsername) {
        const entry = getOrCreate(row.deliveredUsername);
        entry.delivered = row._count;
        entry.total += row._count;
      }
    }
    for (const row of billedByUser) {
      if (row.billedUsername) {
        const entry = getOrCreate(row.billedUsername);
        entry.billed = row._count;
        entry.total += row._count;
      }
    }

    // Lookup user names
    const uniqueUsernames = Array.from(userActivities.keys());
    if (uniqueUsernames.length > 0) {
      const userDetails = await prisma.user.findMany({
        where: { username: { in: uniqueUsernames } },
        select: { username: true, firstName: true, lastName: true }
      });

      for (const user of userDetails) {
        const entry = userActivities.get(user.username);
        if (entry) {
          entry.name = `${user.firstName} ${user.lastName}`.trim();
        }
      }
    }

    const userActivityArray = Array.from(userActivities.values())
      .sort((a, b) => b.total - a.total);

    const result = { userActivities: userActivityArray };
    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('User Activity API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
