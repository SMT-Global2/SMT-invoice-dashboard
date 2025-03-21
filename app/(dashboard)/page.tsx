import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ReactNode } from "react"
import { UserType } from "@prisma/client"
import { 
  dashboardItems, 
  getCategories, 
  getItemsByCategory, 
  DashboardItem, 
  DashboardCategory 
} from "@/lib/constants/dashboardData"

// Reusable tile component
interface DashboardTileProps {
  item: DashboardItem;
}

const DashboardTile = ({ item }: DashboardTileProps) => {
  const { title, href, icon: Icon, description, roles } = item;
  
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
};

export default async function DashboardPage() {
  // Get all categories from our data
  const categories = getCategories();
  console.log(categories);
  return (
    <div className="w-full overflow-hidden">
      <div className="space-y-8">
        {categories.map((category) => {
          const items = getItemsByCategory(category.id);
          if (items.length === 0 || category.id === 'home') return <></>;
          
          return (
            <TileGroup key={category.id} title={category.label}>
              {items.filter((item) => item.id !== 'dashboard').map((item) => (
                <DashboardTile key={item.id} item={item} />
              ))}
            </TileGroup>
          );
        })}
      </div>
    </div>
  )
}
