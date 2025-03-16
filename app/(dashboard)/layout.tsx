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

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <SidebarProvider defaultOpen={false}>
        {/* <div className="flex min-h-screen w-full bg-muted/40 max-w-[100vw] relative"> */}
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
                    <SidebarMenuItem>
                      <Link href="/" passHref legacyBehavior>
                        <SidebarMenuButton tooltip="Dashboard">
                          <Home className="h-5 w-5" />
                          <span>Dashboard</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>

                {/* Administration Group */}
                <SidebarGroup>
                  <SidebarGroupLabel>Administration</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <SidebarMenuItem>
                          <Link href="/analytics" passHref legacyBehavior>
                            <SidebarMenuButton tooltip="Analytics">
                              <BarChart className="h-5 w-5" />
                              <span>Analytics</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      </RoleGuard>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {/* Invoice Management Group */}
                <SidebarGroup>
                  <SidebarGroupLabel>Invoice Management</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <Link href="/invoice" passHref legacyBehavior>
                          <SidebarMenuButton tooltip="Invoices">
                            <FileText className="h-5 w-5" />
                            <span>Invoices</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      
                      <SidebarMenuItem>
                        <Link href="/checking" passHref legacyBehavior>
                          <SidebarMenuButton tooltip="Checking">
                            <CheckCircle className="h-5 w-5" />
                            <span>Checking</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      
                      <SidebarMenuItem>
                        <Link href="/packing" passHref legacyBehavior>
                          <SidebarMenuButton tooltip="Packing">
                            <Package className="h-5 w-5" />
                            <span>Packing</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      
                      <SidebarMenuItem>
                        <Link href="/delivery" passHref legacyBehavior>
                          <SidebarMenuButton tooltip="Delivery">
                            <Truck className="h-5 w-5" />
                            <span>Delivery</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      
                      <SidebarMenuItem>
                        <Link href="/billing" passHref legacyBehavior>
                          <SidebarMenuButton tooltip="Billing">
                            <Newspaper className="h-5 w-5" />
                            <span>Billing</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                {/* Management Group */}
                <SidebarGroup>
                  <SidebarGroupLabel>Management</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <SidebarMenuItem>
                          <Link href="/employee" passHref legacyBehavior>
                            <SidebarMenuButton tooltip="Employee">
                              <UserIcon className="h-5 w-5" />
                              <span>Employee</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      </RoleGuard>
                      
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <SidebarMenuItem>
                          <Link href="/party" passHref legacyBehavior>
                            <SidebarMenuButton tooltip="Parties / Clients">
                              <Building className="h-5 w-5" />
                              <span>Parties / Clients</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      </RoleGuard>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="border-t">
                <UserProfile />
              </SidebarFooter>
            </Sidebar>
          </div>
          
          <MainContent>{children}</MainContent>
          
          <Analytics />
        {/* </div> */}
      </SidebarProvider>
    </Providers>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  
  return (
    <div className={cn(
      "flex flex-col flex-1 transition-all duration-300 ease-in-out w-full",
      state === "expanded" ? "ml-0 md:ml-[17rem]" : "ml-0 md:ml-[5rem]"
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
      
      <main className="flex-1 p-4 md:p-6 bg-muted/40 overflow-x-hidden">
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
