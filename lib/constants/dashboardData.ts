import { 
  BarChart, 
  Building, 
  CheckCircle, 
  FileText, 
  Home,
  Newspaper, 
  Package, 
  Truck, 
  User, 
  LucideIcon,
  Calendar
} from 'lucide-react';

import { Department, UserType } from '@prisma/client';

// Define the structure for each dashboard item
export interface DashboardItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  category: DashboardCategory;
  roles?: (UserType | Department)[];
  searchTerms?: string[]; // Additional search terms to improve findability
}

// Dashboard categories
export type DashboardCategory = 
  | 'home'
  | 'administration'
  | 'invoice-management'
  | 'management'
  | 'other-services'
  | 'receipt-management';

// The centralized data object
export const dashboardItems: DashboardItem[] = [
  // Home
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Main dashboard overview',
    category: 'home',
    searchTerms: ['home', 'dashboard', 'overview', 'main']
  },
  
  // Administration Group
  {
    id: 'analytics',
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart,
    description: 'View detailed invoice analytics and reports',
    category: 'administration',
    roles: ['ADMIN'],
    searchTerms: ['analytics', 'reports', 'statistics', 'data', 'charts', 'metrics']
  },
  
  // Invoice Management Group
  {
    id: 'invoice',
    title: 'Invoice',
    href: '/invoice',
    icon: FileText,
    description: 'Create and Generate Invoices',
    category: 'invoice-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
    searchTerms: ['invoice', 'create', 'generate', 'bill', 'billing']
  },
  {
    id: 'checking',
    title: 'Checking',
    href: '/checking',
    icon: CheckCircle,
    description: 'Review and Verify Generated Invoices',
    category: 'invoice-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
    searchTerms: ['checking', 'verify', 'review', 'validation', 'check']
  },
  {
    id: 'packing',
    title: 'Packing',
    href: '/packing',
    icon: Package,
    description: 'Prepare and Pack Verified Invoices',
    category: 'invoice-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
    searchTerms: ['packing', 'prepare', 'pack', 'package', 'box']
  },
  {
    id: 'delivery',
    title: 'Delivery',
    href: '/delivery',
    icon: Truck,
    description: 'Pick Up, Ship, and Deliver Orders',
    category: 'invoice-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT , Department.RECEIPT_MANAGEMENT],
    searchTerms: ['delivery', 'shipping', 'transport', 'logistics', 'send']
  },
  {
    id: 'billing',
    title: 'Billing',
    href: '/billing',
    icon: Newspaper,
    description: 'Billing Management',
    category: 'invoice-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
    searchTerms: ['billing', 'payment', 'invoice management', 'financial']
  },

  //receipt-management
  {
    id: 'receipt',
    title: 'Receipt',
    href: '/receipt',
    icon: FileText,
    description: 'Receipt Management',
    category: 'receipt-management',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.RECEIPT_MANAGEMENT],
  },

  //other-services
  {
    id: 'inventory',
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    description: 'Inventory Management',
    category: 'other-services',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.PURCHASE_MANAGEMENT],
  },
  {
    id: 'delivery-memo',
    title: 'Delivery Memo',
    href: '/deliverymemo',
    icon: Truck,
    description: 'Delivery Memo Management',
    category: 'other-services',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
  },
  {
    id: 'expiry',
    title: 'Expiry',
    href: '/expiry',
    icon: Calendar,
    description: 'Expiry Management',
    category: 'other-services',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.INVOICE_MANAGEMENT],
  },
  {
    id: 'statement',
    title: 'Statement',
    href: '/statement',
    icon: FileText,
    description: 'Statement Management',
    category: 'other-services',
    roles: ['ADMIN' , Department.ALL_ROUNDER , Department.RECEIPT_MANAGEMENT , Department.INVOICE_MANAGEMENT],
  },

  // Management Group
  {
    id: 'employee',
    title: 'Employee',
    href: '/employee',
    icon: User,
    description: 'Manage Employee Profiles',
    category: 'management',
    searchTerms: ['employee', 'staff', 'personnel', 'team', 'users'],
    roles: ['ADMIN'],
  },
  {
    id: 'agency',
    title: 'Agency',
    href: '/agency',
    icon: Building,
    description: 'Agency Management',
    category: 'management',
    roles: ['ADMIN', Department.PURCHASE_MANAGEMENT],
  },
  {
    id: 'party',
    title: 'Parties / Clients',
    href: '/party',
    icon: Building,
    description: 'Maintain and organize client data',
    category: 'management',
    searchTerms: ['party', 'client', 'customer', 'organization', 'business'],
    roles: ['ADMIN'],
  }
];


// Helper functions to get items by category
export const getItemsByCategory = (category: DashboardCategory): DashboardItem[] => {
  return dashboardItems.filter(item => item.category === category);
};

// Get all categories with at least one item
export const getCategories = (): { id: DashboardCategory; label: string }[] => {
  const categories = new Set<DashboardCategory>(dashboardItems.map(item => item.category));
  
  return Array.from(categories).map(category => {
    // Transform the category ID to a user-friendly label
    const label = category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return { id: category, label };
  });
};

// Search function to filter items by search term
export const searchItems = (query: string): DashboardItem[] => {
  if (!query) return dashboardItems;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return dashboardItems.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
    const descriptionMatch = item.description.toLowerCase().includes(normalizedQuery);
    const searchTermMatch = item.searchTerms?.some(term => 
      term.toLowerCase().includes(normalizedQuery)
    );
    
    return titleMatch || descriptionMatch || searchTermMatch;
  });
};

// Helper to get an item by ID
export const getItemById = (id: string): DashboardItem | undefined => {
  return dashboardItems.find(item => item.id === id);
}; 