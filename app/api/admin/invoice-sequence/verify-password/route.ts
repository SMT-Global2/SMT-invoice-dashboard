import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const VerifySchema = z.object({
  password: z.string().min(1)
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof VerifySchema>
  try {
    const raw = await request.json()
    body = VerifySchema.parse(raw)
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
  }

  const adminUser = await prisma.user.findUnique({
    where: { username: session.user.username },
    select: { password: true }
  })

  if (!adminUser?.password) {
    return NextResponse.json({ valid: false })
  }

  const valid = await bcrypt.compare(body.password, adminUser.password)
  return NextResponse.json({ valid })
}
