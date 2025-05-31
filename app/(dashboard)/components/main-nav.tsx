'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Briefcase, 
  LayoutDashboard,
  BadgeIndianRupee
} from 'lucide-react';

export default function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
      active: pathname === '/dashboard',
    },
    {
      href: '/attendance',
      label: 'Attendance',
      icon: <Calendar className="w-4 h-4 mr-2" />,
      active: pathname === '/attendance',
    },
    {
      href: '/attendance-salary',
      label: 'Attendance & Salary',
      icon: <BadgeIndianRupee className="w-4 h-4 mr-2" />,
      active: pathname === '/attendance-salary',
    },
    {
      href: '/employees',
      label: 'Employees',
      icon: <Users className="w-4 h-4 mr-2" />,
      active: pathname === '/employees',
    },
  ];

  return (
    <nav className="flex flex-col gap-2">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            buttonVariants({
              variant: route.active ? 'default' : 'ghost',
              size: 'sm',
            }),
            'justify-start w-full',
            route.active && 'bg-primary text-primary-foreground font-medium'
          )}
        >
          {route.icon}
          {route.label}
        </Link>
      ))}
    </nav>
  );
} 