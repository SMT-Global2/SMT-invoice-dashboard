'use client';

import { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { getItemById } from '@/lib/constants/dashboardData';
import { NotAuthorized } from '@/components/auth/not-authorized';
import { AnalyticsNav } from './analytics-nav';

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  const analyticsItem = getItemById('analytics');
  const allowedRoles = analyticsItem?.roles || [];

  return (
    <RoleGuard
      allowedRoles={allowedRoles}
      fallback={<NotAuthorized />}
    >
      <div className="flex-1 w-full max-w-full space-y-6 px-1 sm:px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        </div>
        <AnalyticsNav />
        {children}
      </div>
    </RoleGuard>
  );
}
