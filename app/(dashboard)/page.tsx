import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Package, Truck, User, Building, Table } from "lucide-react"
import Link from "next/link"
import AdminInvoiceTable from "./admin-table"

export default async function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 py-5 text-lg max-w-[100vw] w-[90vw] overflow-y-hidden">
      
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full max-w-[100vw]">

        <Link href="/invoice">
          <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-medium">Invoice</CardTitle>
              <FileText className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Create and Generate Invoices
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/checking">
          <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-medium">Checking</CardTitle>
              <CheckCircle className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
              Review and Verify Generated Invoices
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/packing">
          <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-medium">Packing</CardTitle>
              <Package className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
              Prepare and Pack Verified Invoices
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/delivery">
          <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-medium">Delivery</CardTitle>
              <Truck className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
              Pick Up, Ship, and Deliver Orders
              </p>
            </CardContent>
          </Card>
        </Link>

        <RoleGuard allowedRoles={['ADMIN']}>
          <Link href="/employee">
            <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-medium">Employee</CardTitle>
                <User className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                Manage Employee Profiles
                </p>
              </CardContent>
            </Card>
          </Link>
        </RoleGuard>

        <RoleGuard allowedRoles={['ADMIN']}>
          <Link href="/party">
            <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-medium">Parties / Clients</CardTitle>
                <Building className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                Maintain and organize client data
                </p>
              </CardContent>
            </Card>
          </Link>
        </RoleGuard>

      </div>
 
      <RoleGuard allowedRoles={['ADMIN']}>
        <AdminInvoiceTable/>
      </RoleGuard> 

    </div>
  )
}
