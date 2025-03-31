'use client';

import { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { getItemById } from '@/lib/constants/dashboardData';
import { NotAuthorized } from '@/components/auth/not-authorized';

export default function CheckingLayout({ children }: { children: ReactNode }) {
  // Get roles from dashboard data
  const item = getItemById('checking');
  const allowedRoles = item?.roles || [];

  return (
    <RoleGuard 
      allowedRoles={allowedRoles}
      fallback={<NotAuthorized />}
    >
      {children}
    </RoleGuard>
  );
} 