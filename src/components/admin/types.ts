import type {
  AdminDashboardMetrics,
  AdminSessionUser,
  ApiKeyEntry,
  AuditLogEntry,
  BlogPost,
  CmsPage,
  CmsPlugin,
  CmsSettings,
  ContactMessage,
  CustomerRecord,
  MediaItem,
  NavMenu,
  Order,
  Product,
  ProductReview,
  PromoCode,
  RbacRole,
  RbacUser,
  ReturnRequest,
  SeoRedirect,
} from '../../types.ts';

export type AdminRoute =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'marketing'
  | 'store-config'
  | 'posts'
  | 'pages'
  | 'media'
  | 'seo'
  | 'moderation'
  | 'appearance'
  | 'users'
  | 'settings'
  | 'audit';

export function canAccessAdminRoute(role: RbacRole, route: AdminRoute): boolean {
  if (role === 'Super Admin') return true;
  const allowed: Record<Exclude<RbacRole, 'Super Admin'>, AdminRoute[]> = {
    'Shop Manager': [
      'overview',
      'products',
      'inventory',
      'orders',
      'customers',
      'marketing',
      'media',
      'moderation',
    ],
    'Content Editor': ['overview', 'posts', 'pages', 'media', 'seo', 'moderation'],
    Author: ['overview', 'posts', 'media'],
    'Customer Support': ['overview', 'orders', 'customers', 'moderation'],
  };
  return allowed[role]?.includes(route) ?? false;
}

export interface AdminDashboardPayload {
  currentUser?: AdminSessionUser;
  metrics: AdminDashboardMetrics;
  orders: Order[];
  products: Product[];
  promos: PromoCode[];
  cms: CmsSettings;
  pages: CmsPage[];
  posts: BlogPost[];
  menus: NavMenu[];
  redirects: SeoRedirect[];
  plugins: CmsPlugin[];
  users: RbacUser[];
  auditLogs: AuditLogEntry[];
  apiKeys: ApiKeyEntry[];
  customers: CustomerRecord[];
  reviews: ProductReview[];
  returns: ReturnRequest[];
  messages: ContactMessage[];
  media: MediaItem[];
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AdminContextHelpers {
  data: AdminDashboardPayload;
  currentUser: AdminSessionUser;
  authHeaders: () => Record<string, string>;
  reload: () => Promise<void>;
  notifyStoreChanged: () => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  navigate: (route: AdminRoute) => void;
}
