"use client"

import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AdminInvoiceTable from "./admin-table"
import { UserType } from "@prisma/client"

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-6 py-5 text-lg max-w-[100vw] w-[90vw] overflow-y-auto px-2 md:px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>

      <RoleGuard allowedRoles={['ADMIN'] as UserType[]}>
        <AdminInvoiceTable />
      </RoleGuard>
    </div>
  )
}
