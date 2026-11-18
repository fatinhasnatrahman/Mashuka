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
