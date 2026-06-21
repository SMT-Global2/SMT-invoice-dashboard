import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import moment from 'moment'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const records = await prisma.dayStartInvoice.findMany({
    orderBy: { date: 'desc' }
  })

  return NextResponse.json({ success: true, data: records })
}

const PatchSchema = z.object({
  id: z.string().min(1),
  invoiceStartNo: z.number().int().positive(),
  invoiceEndNo: z.number().int().positive().nullable().optional(),
  password: z.string().min(1)
})

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.type !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  let body: z.infer<typeof PatchSchema>
  try {
    const raw = await request.json()
    body = PatchSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body', errors: err.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  if (
    body.invoiceEndNo !== null &&
    body.invoiceEndNo !== undefined &&
    body.invoiceEndNo < body.invoiceStartNo
  ) {
    return NextResponse.json(
      { success: false, message: 'End number must be greater than or equal to start number' },
      { status: 400 }
    )
  }

  const adminUser = await prisma.user.findUnique({
    where: { username: session.user.username },
    select: { password: true }
  })

  if (!adminUser?.password) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
  }

  const passwordValid = await bcrypt.compare(body.password, adminUser.password)
  if (!passwordValid) {
    return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 })
  }

  const { updated, deletedCount } = await prisma.$transaction(async (tx) => {
    const existing = await tx.dayStartInvoice.findUnique({ where: { id: body.id } })
    if (!existing) {
      throw new Error('Record not found')
    }

    const startOfDay = moment(existing.date).startOf('day').toDate()
    const endOfDay = moment(existing.date).endOf('day').toDate()

    let deleted = { count: 0 }

    // Delete invoices on this date that now exceed the new end number.
    // Only runs when endNo is being set to a concrete value (not null).
    if (body.invoiceEndNo !== null && body.invoiceEndNo !== undefined) {
      deleted = await tx.invoice.deleteMany({
        where: {
          generatedDate: { gte: startOfDay, lte: endOfDay },
          invoiceNumber: { gt: body.invoiceEndNo }
        }
      })
    }

    // Delete invoices on this date that are below the new start number.
    // Handles the case where startNo is being raised above existing invoices.
    const belowStart = await tx.invoice.deleteMany({
      where: {
        generatedDate: { gte: startOfDay, lte: endOfDay },
        invoiceNumber: { lt: body.invoiceStartNo }
      }
    })

    const updatedRecord = await tx.dayStartInvoice.update({
      where: { id: body.id },
      data: {
        invoiceStartNo: body.invoiceStartNo,
        invoiceEndNo: body.invoiceEndNo ?? null
      }
    })

    const totalDeleted = deleted.count + belowStart.count

    await tx.invoiceSequenceHistory.create({
      data: {
        date: existing.date,
        changedBy: session.user.username,
        prevStartNo: existing.invoiceStartNo,
        prevEndNo: existing.invoiceEndNo,
        newStartNo: body.invoiceStartNo,
        newEndNo: body.invoiceEndNo ?? null,
        deletedCount: totalDeleted
      }
    })

    return { updated: updatedRecord, deletedCount: totalDeleted }
  })

  return NextResponse.json({ success: true, data: updated, deletedCount })
}
