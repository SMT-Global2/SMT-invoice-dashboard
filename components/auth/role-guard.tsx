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
  
  // If no roles are required, show the children
  if(allowedRoles.length === 0) {
    return <>{children}</>
  }
  
  // Get user roles, filtering out undefined values
  const userRoles = [session?.user?.type, session?.user?.department]
    .filter((role): role is UserType | Department => role !== undefined);
  
  console.log("RoleGuard - User roles:", userRoles);
  console.log("RoleGuard - Allowed roles:", allowedRoles);
  
  // If there's no session or user doesn't have any of the allowed roles, show fallback
  if (!session?.user || !allowedRoles.some(role => userRoles.includes(role))) {
    console.log("RoleGuard - Access denied");
    return <>{fallback}</>
  }

  // If user's role is allowed, show the children
  console.log("RoleGuard - Access granted");
  return <>{children}</>
}
