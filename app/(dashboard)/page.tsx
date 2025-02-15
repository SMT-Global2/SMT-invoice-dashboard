import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductsTable } from './products-table';
import { getProducts } from '@/lib/db';

export default async function HomePage(
  props: {
    searchParams: Promise<{ q: string; offset: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const search = searchParams.q ?? '';
  const offset = searchParams.offset ?? 0;
  const { products, newOffset, totalProducts } = await getProducts(
    search,
    Number(offset)
  );

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived" className="hidden sm:flex">
            Archived
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Product
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <ProductsTable
          products={products}
          offset={newOffset ?? 0}
          totalProducts={totalProducts}
        />
      </TabsContent>
    </Tabs>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Package, Truck } from "lucide-react"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold">Process Dashboard</h1>
        </div>
      </header>
      <main className="container mx-auto py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardTile
            title="Invoice Generator"
            icon={<FileText className="h-6 w-6" />}
            description="Generate and manage invoices"
          />
          <DashboardTile
            title="Checking"
            icon={<CheckCircle className="h-6 w-6" />}
            description="Verify order details and items"
          />
          <DashboardTile
            title="Packaging"
            icon={<Package className="h-6 w-6" />}
            description="Prepare items for shipment"
          />
          <DashboardTile
            title="Delivery"
            icon={<Truck className="h-6 w-6" />}
            description="Track and manage deliveries"
          />
        </div>
      </main>
    </div>
  )
}

function DashboardTile({ title, icon, description }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
