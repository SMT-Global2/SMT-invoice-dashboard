import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, CheckCircle, Package, Truck, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  {
    title: "Home",
    href: "/",
    icon: Home
  },
  {
    title: "Invoice",
    href: "/invoice",
    icon: FileText
  },
  {
    title: "Checking",
    href: "/checking",
    icon: CheckCircle
  },
  {
    title: "Packing",
    href: "/packing",
    icon: Package
  },
  {
    title: "Delivery",
    href: "/delivery",
    icon: Truck
  }
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {sidebarItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "transparent"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
