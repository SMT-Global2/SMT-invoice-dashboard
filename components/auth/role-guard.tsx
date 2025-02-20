"use client"

import { useSession } from 'next-auth/react'
import { UserType } from '@prisma/client'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserType[]
  fallback?: ReactNode
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { data: session } = useSession()
  console.log({ session })
  // If there's no session or user's role is not allowed, show fallback
  if (!session?.user || !allowedRoles.includes(session.user.type)) {
    return <>{fallback}</>
  }

  // If user's role is allowed, show the children
  return <>{children}</>
}
