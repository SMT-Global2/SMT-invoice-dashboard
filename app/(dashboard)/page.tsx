import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Package, Truck, User, Building, Newspaper, LucideIcon, BarChart } from "lucide-react"
import Link from "next/link"
import { ReactNode } from "react"
import { UserType } from "@prisma/client"

// Reusable tile component
interface DashboardTileProps {
  title: string
  href: string
  icon: LucideIcon
  description: string
  roles?: UserType[]
}

const DashboardTile = ({ title, href, icon: Icon, description, roles }: DashboardTileProps) => {
  const tileContent = (
    <Card className="h-[10rem] transition-all hover:scale-105 hover:shadow-lg cursor-pointer dashboard-tile">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-medium">{title}</CardTitle>
        <Icon className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  if (roles) {
    return (
      <RoleGuard allowedRoles={roles}>
        <Link href={href} className="w-full">
          {tileContent}
        </Link>
      </RoleGuard>
    );
  }

  return (
    <Link href={href} className="w-full">
      {tileContent}
    </Link>
  );
};

// Group component for organizing tiles
interface TileGroupProps {
  title: string
  children: ReactNode
}

const TileGroup = ({ title, children }: TileGroupProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-muted-foreground">{title}</h3>
      <div className="dashboard-tiles">
        {children}
      </div>
    </div>
  );
};

export default async function DashboardPage() {
  return (
    <div className="flex-1 w-full">
      <div className="space-y-8 p-4">
        
        {/* Administration Group - Only for Admins */}
        <TileGroup title="Administration">
          <DashboardTile 
            title="Analytics" 
            href="/analytics" 
            icon={BarChart} 
            description="View detailed invoice analytics and reports" 
            roles={['ADMIN'] as UserType[]}
          />
        </TileGroup>
        
        {/* Invoice Management Group */}
        <TileGroup title="Invoice Management">
          <DashboardTile 
            title="Invoice" 
            href="/invoice" 
            icon={FileText} 
            description="Create and Generate Invoices" 
          />
          <DashboardTile 
            title="Checking" 
            href="/checking" 
            icon={CheckCircle} 
            description="Review and Verify Generated Invoices" 
          />
          <DashboardTile 
            title="Packing" 
            href="/packing" 
            icon={Package} 
            description="Prepare and Pack Verified Invoices" 
          />
          <DashboardTile 
            title="Delivery" 
            href="/delivery" 
            icon={Truck} 
            description="Pick Up, Ship, and Deliver Orders" 
          />
          <DashboardTile 
            title="Billing" 
            href="/billing" 
            icon={Newspaper} 
            description="Billing Management" 
          />
        </TileGroup>

        {/* Logistics Group */}
        <TileGroup title="Management">
          <DashboardTile 
            title="Employee" 
            href="/employee" 
            icon={User} 
            description="Manage Employee Profiles" 
            roles={['ADMIN'] as UserType[]}
          />
          <DashboardTile 
            title="Parties / Clients" 
            href="/party" 
            icon={Building} 
            description="Maintain and organize client data" 
            roles={['ADMIN'] as UserType[]}
          />
        </TileGroup>

      </div>
    </div>
  )
}
