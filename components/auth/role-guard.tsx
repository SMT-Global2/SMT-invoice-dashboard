"use client"

import { useSession } from 'next-auth/react'
import { Department, UserType } from '@prisma/client'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: (UserType | Department)[]
  fallback?: ReactNode
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { data: session } = useSession()
  if(allowedRoles.length === 0) {
    return <>{children}</>
  }
  // If there's no session or user's role is not allowed, show fallback
  console.log(session?.user , allowedRoles)
  // const userRoles = [session?.user?.type , session?.user?.department]
  const userRoles : (UserType | Department)[] = [Department.INVOICE_MANAGEMENT]
  if (!session?.user || !allowedRoles.some(role => userRoles.includes(role))) {
    return <>{fallback}</>
  }

  // If user's role is allowed, show the children
  return <>{children}</>
}
