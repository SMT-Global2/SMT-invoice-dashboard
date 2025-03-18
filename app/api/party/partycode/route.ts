import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  //Timeout for 1 second
  // await new Promise(resolve => setTimeout(resolve, 1000));

  const data = await prisma.partyCode.findMany({
    where: {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
      ]
    },
    take: 100
  });

  return Response.json({
    data: data || []
  });
}
