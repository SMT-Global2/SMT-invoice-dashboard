import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await prisma.invoice.findMany();
  
  return Response.json({
    data: data || []
  });
}
