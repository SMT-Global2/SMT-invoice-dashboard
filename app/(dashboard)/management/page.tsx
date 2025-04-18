'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ClipboardList, FileText, Users, Settings, MessageSquare } from 'lucide-react';

export default function ManagementPage() {
  const router = useRouter();

  const tiles = [
    {
      title: 'Contact Forms',
      description: 'View and manage customer feedback and complaints',
      icon: <MessageSquare className="h-6 w-6" />,
      href: '/management/contact-forms',
    },
    {
      title: 'Invoices',
      description: 'Manage and track invoices',
      icon: <FileText className="h-6 w-6" />,
      href: '/management/invoices',
    },
    {
      title: 'Users',
      description: 'Manage user accounts and permissions',
      icon: <Users className="h-6 w-6" />,
      href: '/management/users',
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: <Settings className="h-6 w-6" />,
      href: '/management/settings',
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Management Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiles.map((tile) => (
          <Card
            key={tile.title}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(tile.href)}
          >
            <CardHeader>
              <div className="flex items-center space-x-4">
                {tile.icon}
                <CardTitle>{tile.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{tile.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 