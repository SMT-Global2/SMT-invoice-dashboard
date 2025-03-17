"use client"

import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AdminInvoiceTable from "./admin-table"
import { UserType } from "@prisma/client"

export default function AnalyticsPage() {
  return (
      // <RoleGuard allowedRoles={['ADMIN'] as UserType[]}>
        <div className="flex-1 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          </div>

          <AdminInvoiceTable />
        </div>
      // </RoleGuard>
  )
}
