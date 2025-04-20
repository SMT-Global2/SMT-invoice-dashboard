import { 
  BarChart, 
  Building,
  Briefcase,
  CheckCircle, 
  FileText, 
  Home,
  Receipt,
  DollarSign,
  Package, 
  Truck, 
  Users,
  User, 
  LucideIcon,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Boxes,
  FileSpreadsheet,
  FileCheck,
  ShoppingBag,
  TimerOff,
  PieChart,
  Handshake,
  Building2
} from 'lucide-react';

import { Department, UserType } from '@prisma/client';

// Define the structure for each dashboard item
export interface DashboardItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  roles?: (UserType | Department)[];
  searchTerms?: string[]; // Additional search terms to improve findability
}

// Define the structure for dashboard categories
export interface DashboardCategory {
  id: string;
  label: string;
  items: DashboardItem[];
}

// Dashboard items not belonging to any category (Home)
export const homeItems: DashboardItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Main dashboard overview',
    searchTerms: ['home', 'dashboard', 'overview', 'main']
  }
];

// The centralized dashboard structure with categories and their items
export const dashboardCategories: DashboardCategory[] = [
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'analytics',
        title: 'Analytics',
        href: '/analytics',
        icon: PieChart,
        description: 'View detailed invoice analytics and reports',
        roles: ['ADMIN'],
        searchTerms: ['analytics', 'reports', 'statistics', 'data', 'charts', 'metrics']
      }
    ]
  },
  
  {
    id: 'invoice-management',
    label: 'Invoice Management',
    items: [
      {
        id: 'invoice',
        title: 'Invoice',
        href: '/invoice',
        icon: FileSpreadsheet,
        description: 'Create and Generate Invoices',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT],
        searchTerms: ['invoice', 'create', 'generate', 'bill', 'billing']
      },
      {
        id: 'checking',
        title: 'Checking',
        href: '/checking',
        icon: ClipboardCheck,
        description: 'Review and Verify Generated Invoices',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT],
        searchTerms: ['checking', 'verify', 'review', 'validation', 'check']
      },
      {
        id: 'packing',
        title: 'Packing',
        href: '/packing',
        icon: Boxes,
        description: 'Prepare and Pack Verified Invoices',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT],
        searchTerms: ['packing', 'prepare', 'pack', 'package', 'box']
      },
      {
        id: 'delivery',
        title: 'Delivery',
        href: '/delivery',
        icon: Truck,
        description: 'Pick Up, Ship, and Deliver Orders',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT, Department.RECEIPT_MANAGEMENT],
        searchTerms: ['delivery', 'shipping', 'transport', 'logistics', 'send']
      },
      {
        id: 'billing',
        title: 'Billing',
        href: '/billing',
        icon: DollarSign,
        description: 'Billing Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT],
        searchTerms: ['billing', 'payment', 'invoice management', 'financial']
      }
    ]
  },
  
  {
    id: 'receipt-management',
    label: 'Receipt Management',
    items: [
      {
        id: 'receipt',
        title: 'Receipt',
        href: '/receipt',
        icon: Receipt,
        description: 'Receipt Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.RECEIPT_MANAGEMENT]
      }
    ]
  },
  
  {
    id: 'other-services',
    label: 'Other Services',
    items: [
      {
        id: 'inventory',
        title: 'Inventory',
        href: '/inventory',
        icon: ShoppingBag,
        description: 'Inventory Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.PURCHASE_MANAGEMENT]
      },
      {
        id: 'delivery-memo',
        title: 'Delivery Memo',
        href: '/deliverymemo',
        icon: ClipboardList,
        description: 'Delivery Memo Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT, Department.DELIVERY_MEMO_MANAGEMENT]
      },
      {
        id: 'expiry',
        title: 'Expiry',
        href: '/expiry',
        icon: TimerOff,
        description: 'Expiry Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.INVOICE_MANAGEMENT , Department.RECEIPT_MANAGEMENT]
      },
      {
        id: 'statement',
        title: 'Statement',
        href: '/statement-excel',
        icon: FileCheck,
        description: 'Statement Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.RECEIPT_MANAGEMENT, Department.INVOICE_MANAGEMENT]
      }
    ]
  },
  
  {
    id: 'management',
    label: ' Admin Management',
    items: [
      {
        id: 'employee',
        title: 'Employee',
        href: '/employee',
        icon: Users,
        description: 'Manage Employee Profiles',
        searchTerms: ['employee', 'staff', 'personnel', 'team', 'users'],
        roles: ['ADMIN']
      },
      {
        id: 'agency',
        title: 'Agency',
        href: '/agency',
        icon: Building2,
        description: 'Agency Management',
        roles: ['ADMIN', Department.PURCHASE_MANAGEMENT]
      },
      {
        id: 'transportation',
        title: 'Transportation',
        href: '/transportation',
        icon: Truck,
        description: 'Transportation Management',
        roles: ['ADMIN', Department.ALL_ROUNDER, Department.PURCHASE_MANAGEMENT]
      },
      {
        id: 'party',
        title: 'Parties / Clients',
        href: '/party',
        icon: Handshake,
        description: 'Maintain and organize client data',
        searchTerms: ['party', 'client', 'customer', 'organization', 'business'],
        roles: ['ADMIN']
      },
      {
        id: 'contact-forms',
        title: 'Contact Forms',
        href: '/manage-contact-forms',
        icon: FileText,
        description: 'View and manage customer feedback and complaints',
        searchTerms: ['contact', 'feedback', 'complaints', 'forms', 'customer service'],
        roles: ['ADMIN']
      }
    ]
  }
];

// Helper function to get a flattened list of all dashboard items
export const getAllItems = (): DashboardItem[] => {
  return [
    ...homeItems,
    ...dashboardCategories.flatMap(category => category.items)
  ];
};

// Helper function to get an item by ID
export const getItemById = (id: string): DashboardItem | undefined => {
  return getAllItems().find(item => item.id === id);
};

// Search function to filter items by search term
export const searchItems = (query: string): DashboardItem[] => {
  if (!query) return getAllItems();
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return getAllItems().filter(item => {
    const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
    const descriptionMatch = item.description.toLowerCase().includes(normalizedQuery);
    const searchTermMatch = item.searchTerms?.some(term => 
      term.toLowerCase().includes(normalizedQuery)
    );
    
    return titleMatch || descriptionMatch || searchTermMatch;
  });
}; 