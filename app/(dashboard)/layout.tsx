'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Package,
  PanelLeft,
  User as UserIcon,
  Building,
  LogOut,
  FileText, 
  CheckCircle, 
  Truck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Analytics } from '@vercel/analytics/react';
import { SMTLogo } from '@/components/icons';
import Providers from './providers';
import { NavItem } from './nav-item';
import { ModeToggle, ThemeProvider } from "@/components/theme-provider"
import { useState } from 'react';
import { DropdownMenu , DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleGuard } from '@/components/auth/role-guard';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <main className="flex min-h-screen w-full flex-col bg-muted/40 max-w-[100vw]">
        <DesktopNav />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav />
            <User />
            <SignoutButton />
          </header>
          <main className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4 bg-muted/40">
            {children}
          </main>
        </div>
        <Analytics />
      </main>
    </Providers>
  );
}

function DesktopNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        
        <NavItem href="/" label="SMT">
          <SMTLogo/>
          <span className="sr-only">SMT</span>
        </NavItem>

        <NavItem href="/" label="Dashboard">
          <Home className="h-5 w-5" />
        </NavItem>

        <NavItem href="/invoice" label="Invoices">
          <FileText className="h-5 w-5" />
        </NavItem>

        <NavItem href="/checking" label="Checking">
          <CheckCircle className="h-5 w-5" />
        </NavItem>

        <NavItem href="/packing" label="Packing">
          <Package className="h-5 w-5" />
        </NavItem>

        <NavItem href="/delivery" label="Delivery">
          <Truck className="h-5 w-5" />
        </NavItem>

        <RoleGuard allowedRoles={['ADMIN']}>
          <NavItem href="/employee" label="Employee">
            <UserIcon className="h-5 w-5" />
          </NavItem>
        </RoleGuard>

        <RoleGuard allowedRoles={['ADMIN']}>
          <NavItem href="/party" label="Manage Parties">
          <Building className="h-5 w-5" />
          </NavItem>
        </RoleGuard>

      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <nav className="grid gap-6 text-lg font-medium">

          <Link
            href="/"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
          >
            <SMTLogo />
            <span className="sr-only">SMT</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Home className="h-5 w-5" />
            Dashboard
          </Link>

          <Link
            href="/invoice"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-5 w-5" />
            Invoices
          </Link>

          <Link
            href="/checking"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <CheckCircle className="h-5 w-5" />
            Checking
          </Link>

          <Link
            href="/packing"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Package className="h-5 w-5" />
            Packing
          </Link>

          <Link
            href="/delivery"
            className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Truck className="h-5 w-5" />
            Delivery
          </Link>

          {/* <RoleGuard allowedRoles={['ADMIN']}> */}
            <Link
              href="/employee"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <UserIcon className="h-5 w-5" />
              Employee
            </Link>
          {/* </RoleGuard> */}

          {/* <RoleGuard allowedRoles={['ADMIN']}> */}
            <Link
              href="/party"
              className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Building className="h-5 w-5" />
              Party
            </Link>
          {/* </RoleGuard> */}

        </nav>
      </SheetContent>
    </Sheet>
  );
}

function User() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="text-lg font-medium">
      Hi, {session.user?.username}!
    </div>
  );
}

function SignoutButton() {
  const { data: session } = useSession();
  const username = session?.user?.username || '';
  const firstLetter = username.charAt(0).toUpperCase();

  return (
    <div className='ml-auto flex gap-5 items-center'>
      <ModeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted">{firstLetter}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {username && (
                <p className="font-medium">{username}</p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
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
