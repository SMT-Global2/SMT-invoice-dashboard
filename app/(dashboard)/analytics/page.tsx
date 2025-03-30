"use client"

import AdminInvoiceTable from "./admin-table"

export default function AnalyticsPage() {
  return (
    <div className="flex-1 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>

      <AdminInvoiceTable />
    </div>
  )
}
