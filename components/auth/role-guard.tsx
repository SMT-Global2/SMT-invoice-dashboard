"use client"

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { data: session , status } = useSession()
  
  if(status === "loading" || !session) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no roles are required, show the children
  if(allowedRoles.length === 0) {
    return <>{children}</>
  }

  // Get user roles, filtering out undefined values
  const userRoles: string[] = [session?.user?.type, ...(session?.user?.department ?? [])]
    .filter(role => role !== undefined);
  
  // If there's no session or user doesn't have any of the allowed roles, show fallback
  if (!allowedRoles.some(role => userRoles.includes(role))) {
    console.log("RoleGuard - Access denied");
    return <>{fallback}</>
  }

  // If user's role is allowed, show the children
  console.log("RoleGuard - Access granted");
  return <>{children}</>
}
