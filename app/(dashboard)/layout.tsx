'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Package,
  User as UserIcon,
  Building,
  LogOut,
  FileText, 
  CheckCircle, 
  Truck,
  Newspaper,
  BarChart,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Analytics } from '@vercel/analytics/react';
import { SMTLogo } from '@/components/icons';
import Providers from './providers';
import { ModeToggle, ThemeProvider } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { SearchInput } from './search';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { 
  dashboardItems, 
  getCategories, 
  getItemsByCategory, 
  DashboardItem, 
  DashboardCategory 
} from '@/lib/constants/dashboardData';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full max-w-[100vw] overflow-hidden">
          <div className="fixed left-0 top-0 bottom-0 z-50">
            <Sidebar variant="floating" collapsible="icon">
              <SidebarHeader className="flex items-center gap-2 p-3 border-b">
                <Link href="/" className="flex items-center gap-2">
                  <SMTLogo className="h-7 w-7" />
                  <span className="font-semibold text-lg">SMT Dashboard</span>
                </Link>
              </SidebarHeader>
              
              <SidebarContent className="space-y-[0.1rem] mt-0 gap-0 p-0">
                {/* Dashboard */}
                <SidebarGroup>
                  <SidebarMenu>
                    {/* Dashboard home item */}
                    {(() => {
                      const homeItem = dashboardItems.find(item => item.id === 'dashboard');
                      if (!homeItem) return null;
                      
                      const HomeIcon = homeItem.icon;
                      return (
                        <SidebarMenuItem>
                          <Link href={homeItem.href} passHref legacyBehavior>
                            <SidebarMenuButton tooltip={homeItem.title}>
                              <HomeIcon className="h-5 w-5" />
                              <span>{homeItem.title}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      );
                    })()}
                  </SidebarMenu>
                </SidebarGroup>

                {/* Render all categories and their items */}
                {getCategories().filter(cat => cat.id !== 'home').map(category => (
                  <SidebarGroup key={category.id}>
                    <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getItemsByCategory(category.id).map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <SidebarMenuItem key={item.id}>
                              {
                                <RoleGuard allowedRoles={item.roles || []}>
                                  <Link href={item.href} passHref legacyBehavior>
                                    <SidebarMenuButton tooltip={item.title}>
                                      <ItemIcon className="h-5 w-5" />
                                      <span>{item.title}</span>
                                    </SidebarMenuButton>
                                  </Link>
                                </RoleGuard>
                              }
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}

                
              </SidebarContent>
              <SidebarFooter className="border-t">
                <UserProfile />
              </SidebarFooter>
            </Sidebar>
          </div>
          
          <MainContent>{children}</MainContent>
          
          <Analytics />
        </div>
      </SidebarProvider>
    </Providers>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  
  return (
    <div className={cn(
      "flex flex-col transition-all duration-300 ease-in-out",
      state === "expanded" ? "ml-0 md:ml-[17rem]" : "ml-0 md:ml-[5rem]",
      "w-full max-w-[100vw] overflow-hidden"
    )}>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-4 bg-background/80 backdrop-blur-sm px-4 shadow-sm">
        
        <div className="flex-shrink-0">
          <SidebarTrigger className="h-7 w-7 p-1 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors" />
        </div>
        
        <div className="flex-1 flex justify-center">
          <div className="search-container">
            <SearchInput />
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <ModeToggle />
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 bg-muted/40 w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function UserProfile() {
  const { data: session } = useSession();
  const { state } = useSidebar();
  
  if (!session) return null;
  
  const username = session.user?.username || '';
  const firstLetter = username.charAt(0).toUpperCase();

  return (
    <div className="px-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn(
            "flex items-center gap-2 w-full hover:bg-accent",
            state === "expanded" ? "justify-start" : "justify-center"
          )}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">{firstLetter}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{username}</span>
              <span className="text-xs text-muted-foreground">{session.user?.type}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={async () => {
              await signOut({ callbackUrl: '/login' });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
