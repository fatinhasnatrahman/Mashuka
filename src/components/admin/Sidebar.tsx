import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Megaphone,
  Store,
  FileEdit,
  LayoutList,
  Image as ImageIcon,
  Globe,
  MessageSquare,
  Palette,
  ShieldCheck,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminDashboardMetrics } from '../../types.ts';
import type { AdminRoute } from './types.ts';
import { SafeImage } from '../SafeImage.tsx';

interface SidebarProps {
  activeRoute: AdminRoute;
  onSelectRoute: (route: AdminRoute) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brandName: string;
  logoUrl: string;
  metrics: AdminDashboardMetrics;
  onOpenStorefront: () => void;
}

interface NavItem {
  id: AdminRoute;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function Sidebar({
  activeRoute,
  onSelectRoute,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  brandName,
  logoUrl,
  metrics,
  onOpenStorefront,
}: SidebarProps) {
  const moderationCount =
    metrics.pending_reviews_count + metrics.open_returns_count + metrics.unread_messages_count;

  const sections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Overview',
      items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'E-Commerce',
      items: [
        { id: 'products', label: 'Products & Catalog', icon: Package },
        {
          id: 'inventory',
          label: 'Inventory Control',
          icon: Boxes,
          badge: metrics.low_stock_variants_count || undefined,
        },
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          badge: metrics.active_orders_count || undefined,
        },
        { id: 'customers', label: 'Customers CRM', icon: Users },
        { id: 'marketing', label: 'Marketing & Hero', icon: Megaphone },
        { id: 'store-config', label: 'Store Config', icon: Store },
      ],
    },
    {
      title: 'Content CMS',
      items: [
        { id: 'posts', label: 'Posts & Editorial', icon: FileEdit },
        { id: 'pages', label: 'Pages & Menus', icon: LayoutList },
        { id: 'media', label: 'Media Library', icon: ImageIcon },
        { id: 'seo', label: 'SEO & Redirects', icon: Globe },
        {
          id: 'moderation',
          label: 'Reviews & Care',
          icon: MessageSquare,
          badge: moderationCount || undefined,
        },
        { id: 'appearance', label: 'Appearance & Plugins', icon: Palette },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Users & RBAC', icon: ShieldCheck },
        { id: 'settings', label: 'Settings & SMTP', icon: Settings },
        { id: 'audit', label: 'Audit & Export', icon: ClipboardList },
      ],
    },
  ];

  const renderNavContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#14171F] border-r border-[#E4E6EB] dark:border-[#252A36] select-none">
      {/* Brand Bar */}
      <div className="h-14 px-4 border-b border-[#E4E6EB] dark:border-[#252A36] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectRoute('overview');
            if (isMobile) onCloseMobile();
          }}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          {logoUrl && (
            <SafeImage
              src={logoUrl}
              alt={brandName}
              className="w-7 h-7 rounded-md object-cover border border-[#E4E6EB] dark:border-[#2C3344] shrink-0"
            />
          )}
          {(!collapsed || isMobile) && (
            <span className="text-sm font-extrabold tracking-tight text-[#111315] dark:text-white truncate font-display">
              {brandName} CMS
            </span>
          )}
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-[#525866] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-md text-[#525866] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] hover:text-[#111315] dark:hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {(!collapsed || isMobile) && (
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed && !isMobile ? item.label : undefined}
                    onClick={() => {
                      onSelectRoute(item.id);
                      if (isMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#111315] text-white dark:bg-[#2563EB] dark:text-white'
                        : 'text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] hover:text-[#111315] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {(!collapsed || isMobile) && (
                      <>
                        <span className="flex-1 text-left truncate whitespace-nowrap">
                          {item.label}
                        </span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F3F4F6] dark:bg-[#252A36] text-[#374151] dark:text-[#D1D5DB]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Storefront Link */}
      <div className="p-3 border-t border-[#E4E6EB] dark:border-[#252A36] shrink-0">
        <button
          type="button"
          onClick={onOpenStorefront}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-semibold text-[#111315] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {(!collapsed || isMobile) && <span>Live Storefront</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-150 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderNavContent(false)}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[270px] h-full shadow-2xl">{renderNavContent(true)}</div>
          <div className="flex-1 bg-black/45" onClick={onCloseMobile} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
