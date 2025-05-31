'use client';

import { ReactNode, useEffect } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { getItemById } from '@/lib/constants/dashboardData';
import { NotAuthorized } from '@/components/auth/not-authorized';
import { useSession } from 'next-auth/react';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  // Get roles from dashboard data
  const item = getItemById('employee');
  const allowedRoles = item?.roles || [];
  const { data: session } = useSession();
  
  useEffect(() => {
    console.log('Employee page - Session:', session);
    console.log('Employee page - Allowed roles:', allowedRoles);
    console.log('Employee page - User roles:', [session?.user?.type, ...(session?.user?.department || [])]);
  }, [session, allowedRoles]);

  // If no role restrictions, display children directly (bypass RoleGuard)
  return (
    <>
      {children}
    </>
  );
} 