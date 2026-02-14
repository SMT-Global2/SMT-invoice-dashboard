'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const navItems = [
  { label: 'Invoice Analytics', href: '/analytics' },
  { label: 'User Performance', href: '/analytics/users' },
  { label: 'Invoices Table', href: '/analytics/invoices' },
  { label: 'Receipt', href: '/analytics/receipt' },
  { label: 'Inventory', href: '/analytics/inventory' },
  { label: 'Delivery Memo', href: '/analytics/delivery-memo' },
  { label: 'Expiry', href: '/analytics/expiry' }
]

export function AnalyticsNav() {
  const pathname = usePathname()
  const router = useRouter()

  const currentHref =
    navItems.find((item) => item.href === pathname)?.href || '/analytics'

  return (
    <>
      {/* Mobile dropdown */}
      <div className="md:hidden w-full mb-6">
        <Select
          value={currentHref}
          onValueChange={(value) => router.push(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            {navItems.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop tab-style links */}
      <div className="hidden md:inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-6 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              pathname === item.href
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:bg-background/50 hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  )
}
