import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const data = await prisma.partyCode.findMany({
    where: {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        // { customerName: { contains: search, mode: 'insensitive' } },
        // { city: { contains: search, mode: 'insensitive' } }
      ]
    },
    take: 100
  });

  return Response.json({
    data: data || []
  });
}
