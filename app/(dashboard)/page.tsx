"use client"

import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import React, { ReactNode } from "react"
import { Department, UserType } from "@prisma/client"
import { 
  dashboardCategories, 
  homeItems,
  DashboardItem
} from "@/lib/constants/dashboardData"
// import { getServerSession } from "next-auth"
// import { authOptions } from "@/lib/auth"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

// Reusable tile component
interface DashboardTileProps {
  item: DashboardItem;
  userRoles: (UserType | Department)[];
}

const DashboardTile = ({ item, userRoles }: DashboardTileProps) => {
  const { title, href, icon: Icon, description, roles } = item;
  
  // Check if user has permission to see this item
  const canViewItem = !roles || roles.length === 0 || 
    roles.some(role => userRoles.includes(role));
  
  if (!canViewItem) return null;
  
  const tileContent = (
    <Card className="relative h-[10rem] dashboard-tile group">
      {/* Simplified hover effect, removed transform-gpu for better performance */}
      <div className="tile-content h-full bg-card rounded-lg p-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
          <CardTitle className="text-2xl font-medium group-hover:text-primary transition-colors">{title}</CardTitle>
          <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <p className="text-xs text-muted-foreground group-hover:text-foreground/90 transition-colors">
            {description}
          </p>
        </CardContent>
      </div>
    </Card>
  );

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
  // Don't render empty groups
  if (!React.Children.count(children)) return null;
  
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  // const session = await getServerSession(authOptions);
  const session = useSession()
  
  if (session.status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  const userRoles = [session?.data?.user?.type, ...(session?.data?.user?.department ?? [])]
    .filter((role): role is UserType | Department => role !== undefined);
    
  return (
    <div className="w-full overflow-hidden">
      <div className="space-y-8">
        {dashboardCategories.map((category) => {
          // Skip home category
          if (category.id === 'home') return null;
          
          // Filter items based on user roles
          const visibleItems = category.items.filter(item => {
            if (!item.roles || item.roles.length === 0) return true;
            return userRoles.some(role => item.roles?.includes(role));
          });
          
          // Skip rendering the category if no items are visible
          if (visibleItems.length === 0) return null;
          
          return (
            <TileGroup key={category.id} title={category.label}>
              {visibleItems.map((item) => (
                <DashboardTile key={item.id} item={item} userRoles={userRoles} />
              ))}
            </TileGroup>
          );
        })}
      </div>
    </div>
  )
}
