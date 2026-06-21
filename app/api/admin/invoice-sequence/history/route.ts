import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const history = await prisma.invoiceSequenceHistory.findMany({
    orderBy: { changedAt: 'desc' },
    take: 100
  })

  return NextResponse.json({ success: true, data: history })
}
