import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { AdminSessionUser } from '../types.ts';
import {
  canAccessAdminRoute,
  type AdminContextHelpers,
  type AdminDashboardPayload,
  type AdminRoute,
  type ToastItem,
} from './admin/types.ts';
import { Sidebar } from './admin/Sidebar.tsx';
import { Header } from './admin/Header.tsx';
import { ToastContainer } from './admin/ui/Modal.tsx';
import { DashboardView } from './admin/DashboardView.tsx';
import {
  CustomersView,
  InventoryView,
  MarketingView,
  OrdersView,
  ProductsView,
  StoreConfigView,
} from './admin/EcommerceViews.tsx';
import {
  AppearanceAndPluginsView,
  MediaLibraryView,
  ModerationHubView,
  PagesAndMenusView,
  PostsView,
  SeoAndRedirectsView,
} from './admin/ContentCMSViews.tsx';
import {
  AuditAndExportView,
  GeneralSettingsView,
  UsersRbacView,
} from './admin/AdminSettingsViews.tsx';

interface AdminDashboardProps {
  onBackToStore: (path?: string) => void;
  onStoreDataChanged: () => void;
}

export function AdminDashboard({ onBackToStore, onStoreDataChanged }: AdminDashboardProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(() =>
    sessionStorage.getItem('kl_admin_token')
  );
  const [currentUser, setCurrentUser] = useState<AdminSessionUser>({
    id: null,
    name: 'Fatin Hasnat',
    email: 'fatinhasnatdjs@gmail.com',
    role: 'Super Admin',
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeRoute, setActiveRoute] = useState<AdminRoute>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mashuka_admin_theme') === 'dark';
  });

  const [payload, setPayload] = useState<AdminDashboardPayload | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [quickCreateIntent, setQuickCreateIntent] = useState<'product' | 'post' | 'page' | null>(
    null
  );

  useEffect(() => {
    const root = document.documentElement;
    if (authenticated && darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => {
      root.classList.remove('dark');
    };
  }, [authenticated, darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('mashuka_admin_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const pushToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const authHeaders = useCallback((): Record<string, string> => {
    const token = authToken || sessionStorage.getItem('kl_admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authToken]);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/dashboard', { headers: authHeaders() });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load CMS data.');
      const data = (await res.json()) as AdminDashboardPayload;
      setPayload(data);
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to refresh data.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [authHeaders, pushToast]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/me', { headers: authHeaders() });
        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
          if (data.user) setCurrentUser(data.user);
          await loadDashboard();
        }
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [authHeaders, loadDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim() || undefined,
          password: loginPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error || 'Invalid credentials.');
        return;
      }
      if (json.token) {
        sessionStorage.setItem('kl_admin_token', json.token);
        setAuthToken(json.token);
      }
      if (json.user) {
        setCurrentUser(json.user);
      }
      setAuthenticated(true);
      setLoginPassword('');
      await loadDashboard();
    } catch {
      setLoginError('Unable to reach server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    sessionStorage.removeItem('kl_admin_token');
    setAuthToken(null);
    setAuthenticated(false);
    setPayload(null);
  };

  const handleQuickCreate = (action: 'product' | 'post' | 'page' | 'coupon') => {
    if (action === 'product') {
      setQuickCreateIntent('product');
      setActiveRoute('products');
    } else if (action === 'post') {
      setQuickCreateIntent('post');
      setActiveRoute('posts');
    } else if (action === 'page') {
      setQuickCreateIntent('page');
      setActiveRoute('pages');
    } else {
      setActiveRoute('marketing');
    }
  };

  const exitToStore = () => {
    document.documentElement.classList.remove('dark');
    onBackToStore('/');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F8] text-xs text-[#525866]">
        Checking Mashuka CMS session...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F8] p-6">
        <div className="w-full max-w-sm p-6 rounded-2xl border border-[#E4E6EB] bg-white shadow-sm space-y-5">
          <div className="space-y-1.5 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#111315] text-white flex items-center justify-center mx-auto">
              <Lock className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-[#111315]">Mashuka Hybrid CMS</h1>
            <p className="text-xs text-[#525866]">
              Sign in to manage products, WordPress pages, editorial posts, orders &amp; SEO.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#374151]">
                Work Email <span className="text-[#9CA3AF] font-normal">(optional for Super Admin)</span>
              </span>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="fatinhasnatdjs@gmail.com"
                className="w-full h-10 px-3 text-xs rounded-lg border border-[#E4E6EB] bg-[#F9FAFB] focus:outline-none focus:bg-white focus:border-[#2563EB]"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#374151]">Password</span>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-10 px-3 text-xs rounded-lg border border-[#E4E6EB] bg-[#F9FAFB] focus:outline-none focus:bg-white focus:border-[#2563EB]"
              />
            </label>
            {loginError && <p className="text-xs text-[#DC2626]">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-10 rounded-lg bg-[#111315] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={exitToStore}
            className="w-full text-xs text-[#525866] hover:text-[#111315] hover:underline"
          >
            ← Return to Mashuka Storefront
          </button>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F8] dark:bg-[#0B0D12] text-xs text-[#525866] dark:text-[#9CA3AF]">
        {loadingData ? 'Loading Mashuka CMS workspace...' : 'Preparing dashboard...'}
      </div>
    );
  }

  const effectiveUser = payload.currentUser || currentUser;
  const effectiveRoute: AdminRoute = canAccessAdminRoute(effectiveUser.role, activeRoute)
    ? activeRoute
    : 'overview';

  const ctx: AdminContextHelpers = {
    data: payload,
    currentUser: effectiveUser,
    authHeaders,
    reload: loadDashboard,
    notifyStoreChanged: onStoreDataChanged,
    toast: pushToast,
    navigate: (route) => {
      if (!canAccessAdminRoute(effectiveUser.role, route)) {
        pushToast('Your role does not have access to this section.', 'error');
        return;
      }
      setQuickCreateIntent(null);
      setActiveRoute(route);
    },
  };

  return (
    <div className="min-h-screen flex bg-[#F6F7F8] dark:bg-[#0B0D12] text-[#111315] dark:text-[#F3F4F6]">
      <Sidebar
        activeRoute={effectiveRoute}
        userRole={effectiveUser.role}
        onSelectRoute={(r) => {
          if (!canAccessAdminRoute(effectiveUser.role, r)) return;
          setQuickCreateIntent(null);
          setActiveRoute(r);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        brandName={payload.cms.brand_name}
        logoUrl={payload.cms.logo_url}
        metrics={payload.metrics}
        onOpenStorefront={exitToStore}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          activeRoute={effectiveRoute}
          data={payload}
          currentUser={ctx.currentUser}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onNavigate={(r) => {
            setQuickCreateIntent(null);
            setActiveRoute(r);
          }}
          onQuickCreate={handleQuickCreate}
          onOpenStorefront={exitToStore}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {effectiveRoute === 'overview' && (
            <DashboardView ctx={ctx} onQuickCreate={handleQuickCreate} />
          )}
          {effectiveRoute === 'products' && (
            <ProductsView
              ctx={ctx}
              triggerCreate={quickCreateIntent === 'product'}
              onClearTrigger={() => setQuickCreateIntent(null)}
            />
          )}
          {effectiveRoute === 'inventory' && <InventoryView ctx={ctx} />}
          {effectiveRoute === 'orders' && <OrdersView ctx={ctx} />}
          {effectiveRoute === 'customers' && <CustomersView ctx={ctx} />}
          {effectiveRoute === 'marketing' && <MarketingView ctx={ctx} />}
          {effectiveRoute === 'store-config' && <StoreConfigView ctx={ctx} />}
          {effectiveRoute === 'posts' && (
            <PostsView
              ctx={ctx}
              triggerCreate={quickCreateIntent === 'post'}
              onClearTrigger={() => setQuickCreateIntent(null)}
            />
          )}
          {effectiveRoute === 'pages' && (
            <PagesAndMenusView
              ctx={ctx}
              triggerCreate={quickCreateIntent === 'page'}
              onClearTrigger={() => setQuickCreateIntent(null)}
            />
          )}
          {effectiveRoute === 'media' && <MediaLibraryView ctx={ctx} />}
          {effectiveRoute === 'seo' && <SeoAndRedirectsView ctx={ctx} />}
          {effectiveRoute === 'moderation' && <ModerationHubView ctx={ctx} />}
          {effectiveRoute === 'appearance' && <AppearanceAndPluginsView ctx={ctx} />}
          {effectiveRoute === 'users' && <UsersRbacView ctx={ctx} />}
          {effectiveRoute === 'settings' && <GeneralSettingsView ctx={ctx} />}
          {effectiveRoute === 'audit' && <AuditAndExportView ctx={ctx} />}
        </main>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
