import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCached, setCache } from '@/lib/api-cache'

interface FormattedPartyData {
  id: string;
  code: string;
  name: string;
  count: number;
  ranking: number;
  percentage: number;
}

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

    const whereClause: any = {}
    if (Object.keys(dateFilter).length > 0) {
      whereClause.invoiceTimestamp = dateFilter
    }

    // groupBy partyCode instead of fetching ALL invoices
    const partyGroups = await prisma.invoice.groupBy({
      by: ['partyCode'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          partyCode: 'desc'
        }
      },
      take: 20
    });

    // Lookup party details only for top 20 codes
    const topPartyCodes = partyGroups.map(g => g.partyCode);
    const parties = await prisma.partyCode.findMany({
      where: { code: { in: topPartyCodes } },
      select: {
        id: true,
        code: true,
        customerName: true
      }
    });

    const partyMap = new Map(parties.map(p => [p.code, p]));

    // Classify parties: codes starting with A, B, or C are agencies, others are clients
    const agencyCodes: { code: string; count: number; id: string; name: string }[] = [];
    const clientCodes: { code: string; count: number; id: string; name: string }[] = [];

    for (const group of partyGroups) {
      const party = partyMap.get(group.partyCode);
      const entry = {
        code: group.partyCode,
        count: group._count,
        id: party?.id || '',
        name: party?.customerName || 'Unknown'
      };

      const firstChar = group.partyCode.charAt(0).toUpperCase();
      if (['A', 'B', 'C'].includes(firstChar)) {
        agencyCodes.push(entry);
      } else {
        clientCodes.push(entry);
      }
    }

    // Already sorted by count desc from groupBy, take top 10
    const topAgencies = agencyCodes.slice(0, 10);
    const topClients = clientCodes.slice(0, 10);

    const totalAgencyInvoices = topAgencies.reduce((sum, a) => sum + a.count, 0);
    const totalClientInvoices = topClients.reduce((sum, c) => sum + c.count, 0);

    const formattedAgencies: FormattedPartyData[] = topAgencies.map((agency, index) => ({
      id: agency.id,
      code: agency.code,
      name: agency.name,
      count: agency.count,
      ranking: index + 1,
      percentage: totalAgencyInvoices > 0
        ? Math.round((agency.count / totalAgencyInvoices) * 1000) / 10
        : 0
    }));

    const formattedClients: FormattedPartyData[] = topClients.map((client, index) => ({
      id: client.id,
      code: client.code,
      name: client.name,
      count: client.count,
      ranking: index + 1,
      percentage: totalClientInvoices > 0
        ? Math.round((client.count / totalClientInvoices) * 1000) / 10
        : 0
    }));

    const result = {
      topClients: formattedClients,
      topAgencies: formattedAgencies
    };

    setCache(cacheKey, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Top Parties API Error:', (error as any).message)
    return Response.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
