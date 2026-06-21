'use client'

import { ReactNode } from 'react'
import { RoleGuard } from '@/components/auth/role-guard'
import { getItemById } from '@/lib/constants/dashboardData'
import { NotAuthorized } from '@/components/auth/not-authorized'

export default function InvoiceSequenceLayout({ children }: { children: ReactNode }) {
  const item = getItemById('invoice-sequence')
  const allowedRoles = item?.roles || []

  return (
    <RoleGuard allowedRoles={allowedRoles} fallback={<NotAuthorized />}>
      {children}
    </RoleGuard>
  )
}
