import { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Menu,
  ExternalLink,
  LogOut,
  User,
  ChevronDown,
  Package,
  FileEdit,
  LayoutList,
  Tag,
  KeyRound,
} from 'lucide-react';
import type { AdminSessionUser } from '../../types.ts';
import { canAccessAdminRoute, type AdminDashboardPayload, type AdminRoute } from './types.ts';

interface HeaderProps {
  activeRoute: AdminRoute;
  data: AdminDashboardPayload;
  currentUser?: AdminSessionUser;
  darkMode: boolean;
  onToggleDark: () => void;
  onOpenMobileSidebar: () => void;
  onNavigate: (route: AdminRoute) => void;
  onQuickCreate: (action: 'product' | 'post' | 'page' | 'coupon') => void;
  onOpenStorefront: () => void;
  onLogout: () => void;
}

const ROUTE_TITLES: Record<AdminRoute, string> = {
  overview: 'Dashboard Overview',
  products: 'Products & Catalog',
  inventory: 'Inventory Control',
  orders: 'Order Management',
  customers: 'Customers & CRM',
  marketing: 'Marketing & Hero',
  'store-config': 'Store Configuration',
  posts: 'Posts & Editorial',
  pages: 'Pages & Navigation Menus',
  media: 'Media Library',
  seo: 'SEO & Redirects',
  moderation: 'Reviews, Returns & Inbox',
  appearance: 'Appearance & Plugins',
  users: 'Users & RBAC Matrix',
  settings: 'General & SMTP Settings',
  audit: 'Audit Logs & Export',
};

export function Header({
  activeRoute,
  data,
  currentUser,
  darkMode,
  onToggleDark,
  onOpenMobileSidebar,
  onNavigate,
  onQuickCreate,
  onOpenStorefront,
  onLogout,
}: HeaderProps) {
  const sessionUser: AdminSessionUser = currentUser ||
    data.currentUser || {
      id: null,
      name: 'Fatin Hasnat',
      email: 'fatinhasnatdjs@gmail.com',
      role: 'Super Admin',
    };
  const initials =
    sessionUser.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'AD';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ id: string; title: string; subtitle: string; route: AdminRoute }> = [];

    for (const p of data.products) {
      if (p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)) {
        results.push({
          id: `prod-${p.id}`,
          title: p.name,
          subtitle: `Product · ৳${p.price}`,
          route: 'products',
        });
      }
    }
    for (const o of data.orders) {
      if (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      ) {
        results.push({
          id: `ord-${o.id}`,
          title: `${o.order_number} · ${o.customer_name}`,
          subtitle: `Order · ৳${o.total} · ${o.status}`,
          route: 'orders',
        });
      }
    }
    for (const post of data.posts) {
      if (post.title.toLowerCase().includes(q)) {
        results.push({
          id: `post-${post.id}`,
          title: post.title,
          subtitle: `Article · ${post.status}`,
          route: 'posts',
        });
      }
    }
    for (const page of data.pages) {
      if (page.title.toLowerCase().includes(q) || page.slug.toLowerCase().includes(q)) {
        results.push({
          id: `page-${page.id}`,
          title: page.title,
          subtitle: `Page · /page/${page.slug}`,
          route: 'pages',
        });
      }
    }
    return results.filter((r) => canAccessAdminRoute(sessionUser.role, r.route)).slice(0, 8);
  }, [searchQuery, data, sessionUser.role]);

  const notifications = useMemo(() => {
    const list: Array<{ id: string; text: string; detail: string; route: AdminRoute }> = [];
    if (data.metrics.pending_verification_count > 0) {
      list.push({
        id: 'trx',
        text: `${data.metrics.pending_verification_count} wallet order(s) awaiting TrxID check`,
        detail: 'Review bKash/Nagad payments in Orders',
        route: 'orders',
      });
    }
    if (data.metrics.low_stock_variants_count > 0) {
      list.push({
        id: 'stock',
        text: `${data.metrics.low_stock_variants_count} variant SKU(s) low on stock`,
        detail: 'Restock inside Inventory Control',
        route: 'inventory',
      });
    }
    if (data.metrics.pending_reviews_count > 0) {
      list.push({
        id: 'reviews',
        text: `${data.metrics.pending_reviews_count} review(s) awaiting moderation`,
        detail: 'Approve or reply in Moderation Hub',
        route: 'moderation',
      });
    }
    if (data.metrics.open_returns_count > 0) {
      list.push({
        id: 'returns',
        text: `${data.metrics.open_returns_count} open return/exchange request(s)`,
        detail: 'Process customer resolution',
        route: 'moderation',
      });
    }
    if (data.metrics.unread_messages_count > 0) {
      list.push({
        id: 'msgs',
        text: `${data.metrics.unread_messages_count} unread Contact Us message(s)`,
        detail: 'Reply from Customer Care Inbox',
        route: 'moderation',
      });
    }
    return list.filter((n) => canAccessAdminRoute(sessionUser.role, n.route));
  }, [data.metrics, sessionUser.role]);

  return (
    <header className="sticky top-0 z-30 h-14 px-4 lg:px-6 bg-white/95 dark:bg-[#14171F]/95 backdrop-blur-sm border-b border-[#E4E6EB] dark:border-[#252A36] flex items-center justify-between gap-4 no-print">
      {/* Left: Mobile Trigger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open menu"
          className="lg:hidden p-1.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-[#374151] dark:text-[#D1D5DB]"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-[#6B7280] dark:text-[#9CA3AF] hidden sm:inline whitespace-nowrap">
            {data.cms.brand_name} Admin
          </span>
          <span className="text-[#9CA3AF] hidden sm:inline">/</span>
          <span className="font-semibold text-[#111315] dark:text-white truncate">
            {ROUTE_TITLES[activeRoute]}
          </span>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="relative hidden md:block w-full max-w-sm">
        <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          placeholder="Search products, orders, posts, pages..."
          className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] text-[#111315] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB]"
        />
        {searchOpen && searchQuery.trim() !== '' && (
          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] shadow-xl overflow-hidden z-40">
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                No matches for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onMouseDown={() => {
                      onNavigate(res.route);
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#1F2430] transition-colors"
                  >
                    <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                      {res.title}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      {res.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Action, Notifications, Theme Toggle, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Create */}
        {(
          [
            { key: 'product' as const, label: 'New Product', icon: Package, route: 'products' as AdminRoute },
            { key: 'post' as const, label: 'New Blog Post', icon: FileEdit, route: 'posts' as AdminRoute },
            { key: 'page' as const, label: 'New Web Page', icon: LayoutList, route: 'pages' as AdminRoute },
            { key: 'coupon' as const, label: 'Create Coupon', icon: Tag, route: 'marketing' as AdminRoute },
          ].filter((item) => canAccessAdminRoute(sessionUser.role, item.route))
        ).length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setQuickOpen((v) => !v);
                setNotifOpen(false);
                setProfileOpen(false);
              }}
              className="h-9 px-3 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Create</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {quickOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] shadow-xl py-1.5 z-40">
                {[
                  { key: 'product' as const, label: 'New Product', icon: Package, route: 'products' as AdminRoute },
                  { key: 'post' as const, label: 'New Blog Post', icon: FileEdit, route: 'posts' as AdminRoute },
                  { key: 'page' as const, label: 'New Web Page', icon: LayoutList, route: 'pages' as AdminRoute },
                  { key: 'coupon' as const, label: 'Create Coupon', icon: Tag, route: 'marketing' as AdminRoute },
                ]
                  .filter((item) => canAccessAdminRoute(sessionUser.role, item.route))
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setQuickOpen(false);
                          onQuickCreate(item.key);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#111315] dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] flex items-center gap-2.5"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setQuickOpen(false);
              setProfileOpen(false);
            }}
            aria-label="Open notifications"
            className="relative h-9 w-9 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] flex items-center justify-center text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1.5 w-80 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] shadow-xl overflow-hidden z-40">
              <div className="px-4 py-2.5 border-b border-[#E4E6EB] dark:border-[#252A36] text-xs font-bold text-[#111315] dark:text-white">
                Operational Alerts ({notifications.length})
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  All store queues are clear.
                </div>
              ) : (
                <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onNavigate(n.route);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#1F2430] transition-colors"
                    >
                      <div className="text-xs font-semibold text-[#111315] dark:text-white">
                        {n.text}
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                        {n.detail}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Light/Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDark}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
          className="h-9 w-9 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] flex items-center justify-center text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setQuickOpen(false);
              setNotifOpen(false);
            }}
            className="h-9 pl-2 pr-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] flex items-center gap-2 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
          >
            <span className="w-6 h-6 rounded-md bg-[#111315] dark:bg-[#2563EB] text-white text-[11px] font-bold flex items-center justify-center">
              {initials}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-[#111315] dark:text-white whitespace-nowrap">
              {sessionUser.name}
            </span>
            <ChevronDown className="w-3 h-3 text-[#6B7280] dark:text-[#9CA3AF]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] shadow-xl py-1.5 z-40">
              <div className="px-3.5 py-2 border-b border-[#E4E6EB] dark:border-[#252A36]">
                <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                  {sessionUser.name}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {sessionUser.role} · {sessionUser.email}
                </div>
              </div>
              {canAccessAdminRoute(sessionUser.role, 'settings') && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              )}
              {canAccessAdminRoute(sessionUser.role, 'users') && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('users');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Team &amp; Permissions</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onOpenStorefront();
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Live Storefront</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1519] flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
