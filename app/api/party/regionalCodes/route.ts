import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique regional codes
    const regionalCodes = await prisma.partyCode.findMany({
      select: {
        regionalCode: true,
      },
      distinct: ['regionalCode'],
      where: {
        regionalCode: {
          not: null,
        },
      },
      orderBy: {
        regionalCode: 'asc',
      },
    });

    // Extract and filter out any null values
    const filteredCodes = regionalCodes
      .map(item => item.regionalCode)
      .filter(code => code !== null && code !== "");

    return Response.json({ regionalCodes: filteredCodes });
  } catch (error) {
    console.error('Error fetching regional codes:', error);
    return Response.json({ error: 'Failed to fetch regional codes' }, { status: 500 });
  }
} 