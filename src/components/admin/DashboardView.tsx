import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  Package,
  FileEdit,
  LayoutList,
  Tag,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { canAccessAdminRoute, type AdminContextHelpers } from './types.ts';
import { formatBDT, formatDateTime } from '../../utils/format.ts';
import { SafeImage } from '../SafeImage.tsx';

interface DashboardViewProps {
  ctx: AdminContextHelpers;
  onQuickCreate: (action: 'product' | 'post' | 'page' | 'coupon') => void;
}

type ChartRange = '7D' | '30D' | '90D' | '1Y';

export function DashboardView({ ctx, onQuickCreate }: DashboardViewProps) {
  const { data, currentUser, navigate } = ctx;
  const { metrics, orders, products, posts, reviews, returns } = data;
  const [range, setRange] = useState<ChartRange>('7D');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartPoints = useMemo(() => {
    const validOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded'
    );
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 86400000;

    if (range === '7D') {
      const buckets = Array.from({ length: 7 }, (_, idx) => {
        const dayStart = startOfToday - (6 - idx) * dayMs;
        const d = new Date(dayStart);
        return {
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          start: dayStart,
          end: dayStart + dayMs,
          revenue: 0,
          ordersCount: 0,
        };
      });
      for (const o of validOrders) {
        const t = new Date(o.created_at).getTime();
        const b = buckets.find((bucket) => t >= bucket.start && t < bucket.end);
        if (b) {
          b.revenue += o.total || 0;
          b.ordersCount += 1;
        }
      }
      return buckets;
    }

    if (range === '30D') {
      const buckets = Array.from({ length: 4 }, (_, idx) => {
        const end = startOfToday + dayMs - (3 - idx) * 7 * dayMs;
        const start = end - 7 * dayMs;
        return { label: `W${idx + 1}`, start, end, revenue: 0, ordersCount: 0 };
      });
      for (const o of validOrders) {
        const t = new Date(o.created_at).getTime();
        const b = buckets.find((bucket) => t >= bucket.start && t < bucket.end);
        if (b) {
          b.revenue += o.total || 0;
          b.ordersCount += 1;
        }
      }
      return buckets;
    }

    if (range === '90D') {
      const buckets = Array.from({ length: 3 }, (_, idx) => {
        const ref = new Date(now.getFullYear(), now.getMonth() - (2 - idx), 1);
        const start = ref.getTime();
        const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
        return {
          label: ref.toLocaleDateString('en-US', { month: 'short' }),
          start,
          end,
          revenue: 0,
          ordersCount: 0,
        };
      });
      for (const o of validOrders) {
        const t = new Date(o.created_at).getTime();
        const b = buckets.find((bucket) => t >= bucket.start && t < bucket.end);
        if (b) {
          b.revenue += o.total || 0;
          b.ordersCount += 1;
        }
      }
      return buckets;
    }

    // 1Y: 4 quarters of current calendar year
    const yr = now.getFullYear();
    const buckets = [0, 1, 2, 3].map((q) => ({
      label: `Q${q + 1}`,
      start: new Date(yr, q * 3, 1).getTime(),
      end: new Date(yr, q * 3 + 3, 1).getTime(),
      revenue: 0,
      ordersCount: 0,
    }));
    for (const o of validOrders) {
      const t = new Date(o.created_at).getTime();
      const b = buckets.find((bucket) => t >= bucket.start && t < bucket.end);
      if (b) {
        b.revenue += o.total || 0;
        b.ordersCount += 1;
      }
    }
    return buckets;
  }, [range, orders]);

  const maxRev = Math.max(...chartPoints.map((p) => p.revenue), 1);
  const maxOrders = Math.max(...chartPoints.map((p) => p.ordersCount), 1);

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: formatBDT(metrics.total_revenue),
      sub: `${orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').length} non-cancelled orders`,
    },
    {
      label: 'Total Orders',
      value: String(metrics.total_orders_count),
      sub: `${metrics.active_orders_count} active in fulfillment`,
    },
    {
      label: 'Average Order Value',
      value: formatBDT(metrics.aov),
      sub: metrics.total_orders_count > 0 ? 'Based on live orders' : 'No completed orders yet',
    },
    {
      label: 'Blog & Page Views',
      value: metrics.total_page_views.toLocaleString('en-US'),
      sub: 'Live published post reads',
    },
    {
      label: 'Active Subscribers',
      value: metrics.active_subscribers.toLocaleString('en-US'),
      sub: 'Unique order & inquiry contacts',
    },
    {
      label: 'Conversion Rate',
      value: metrics.conversion_rate > 0 ? `${metrics.conversion_rate}%` : 'N/A',
      sub: 'Requires frontend analytics tracker',
    },
  ];

  const topProducts = useMemo(() => {
    const validOrders = orders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'refunded'
    );
    const salesMap = new Map<
      string,
      { key: string; name: string; units: number; revenue: number; image_url: string; category: string }
    >();
    for (const ord of validOrders) {
      for (const item of ord.items) {
        const prod = products.find((p) => p.id === item.product_id);
        const key = item.product_id ? `p-${item.product_id}` : `name-${item.item_name}`;
        const existing = salesMap.get(key) || {
          key,
          name: prod?.name || item.item_name,
          units: 0,
          revenue: 0,
          image_url: prod?.image_url || '',
          category: prod?.category || 'pack',
        };
        existing.units += item.quantity;
        existing.revenue += item.line_total || item.unit_price * item.quantity;
        salesMap.set(key, existing);
      }
    }
    return Array.from(salesMap.values())
      .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
      .slice(0, 4);
  }, [orders, products]);

  const topPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.views_count - a.views_count).slice(0, 4);
  }, [posts]);

  const lowStockVariants = useMemo(() => {
    const threshold = data.cms.low_stock_threshold || 12;
    const rows: Array<{
      variantId: number;
      productName: string;
      sku: string;
      label: string;
      stock: number;
    }> = [];
    for (const p of products) {
      for (const v of p.variants) {
        if (v.stock <= threshold) {
          rows.push({
            variantId: v.id,
            productName: p.name,
            sku: v.sku,
            label: `${v.color_name} · ${v.size}`,
            stock: v.stock,
          });
        }
      }
    }
    return rows.sort((a, b) => a.stock - b.stock).slice(0, 5);
  }, [products, data.cms.low_stock_threshold]);

  const pendingModeration = useMemo(() => {
    const pendingRev = reviews.filter((r) => !r.is_approved).slice(0, 3);
    const openRet = returns.filter((r) => r.status === 'requested' || r.status === 'approved').slice(0, 3);
    return { pendingRev, openRet };
  }, [reviews, returns]);

  // SVG dimensions
  const svgW = 640;
  const svgH = 220;
  const padX = 32;
  const padY = 20;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const revPolyline = chartPoints
    .map((pt, idx) => {
      const x = padX + (chartPoints.length === 1 ? plotW / 2 : (idx / (chartPoints.length - 1)) * plotW);
      const y = padY + plotH - (pt.revenue / maxRev) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const ordersPolyline = chartPoints
    .map((pt, idx) => {
      const x = padX + (chartPoints.length === 1 ? plotW / 2 : (idx / (chartPoints.length - 1)) * plotW);
      const y = padY + plotH - (pt.ordersCount / maxOrders) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-[#111315] dark:text-white">
            {data.cms.brand_name} Operations &amp; Publishing Hub
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Live storefront inventory, BDT orders, editorial posts, and SEO controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAccessAdminRoute(currentUser.role, 'products') && (
            <button
              type="button"
              onClick={() => onQuickCreate('product')}
              className="h-8 px-3 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <Package className="w-3.5 h-3.5" />
              <span>New Product</span>
            </button>
          )}
          {canAccessAdminRoute(currentUser.role, 'posts') && (
            <button
              type="button"
              onClick={() => onQuickCreate('post')}
              className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#1A1F2B] text-xs font-medium text-[#111315] dark:text-white inline-flex items-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#252A36] whitespace-nowrap"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>New Post</span>
            </button>
          )}
          {canAccessAdminRoute(currentUser.role, 'pages') && (
            <button
              type="button"
              onClick={() => onQuickCreate('page')}
              className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#1A1F2B] text-xs font-medium text-[#111315] dark:text-white inline-flex items-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#252A36] whitespace-nowrap"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>
          )}
          {canAccessAdminRoute(currentUser.role, 'marketing') && (
            <button
              type="button"
              onClick={() => onQuickCreate('coupon')}
              className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#1A1F2B] text-xs font-medium text-[#111315] dark:text-white inline-flex items-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#252A36] whitespace-nowrap"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-2"
          >
            <div className="text-xs font-medium text-[#525866] dark:text-[#9CA3AF] truncate">
              {card.label}
            </div>
            <div className="text-xl font-bold text-[#111315] dark:text-white font-mono tabular-nums">
              {card.value}
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] truncate max-w-full">
              <TrendingUp className="w-3 h-3 text-[#2563EB] shrink-0" />
              <span className="truncate">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Chart + Top Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Revenue vs Orders Chart */}
        <div className="xl:col-span-7 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#111315] dark:text-white">
                Revenue vs. Order Volume
              </h2>
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
                Hover points to inspect live BDT revenue and completed order counts
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
              {(['7D', '30D', '90D', '1Y'] as ChartRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r);
                    setHoveredIdx(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-colors ${
                    range === r
                      ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                      : 'text-[#525866] dark:text-[#9CA3AF] hover:text-[#111315] dark:hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 overflow-visible">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padY + plotH - ratio * plotH;
                return (
                  <line
                    key={ratio}
                    x1={padX}
                    x2={svgW - padX}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#E4E6EB] dark:text-[#252A36]"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Orders dashed line */}
              <polyline
                fill="none"
                stroke="#0EA5E9"
                strokeWidth="2"
                strokeDasharray="5 4"
                points={ordersPolyline}
              />

              {/* Revenue solid line */}
              <polyline
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                points={revPolyline}
              />

              {/* Interactive nodes */}
              {chartPoints.map((pt, idx) => {
                const x =
                  padX + (chartPoints.length === 1 ? plotW / 2 : (idx / (chartPoints.length - 1)) * plotW);
                const yRev = padY + plotH - (pt.revenue / maxRev) * plotH;
                const yOrd = padY + plotH - (pt.ordersCount / maxOrders) * plotH;
                const active = hoveredIdx === idx;
                return (
                  <g
                    key={pt.label}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect x={x - 24} y={padY} width={48} height={plotH} fill="transparent" />
                    <circle
                      cx={x}
                      cy={yRev}
                      r={active ? 5.5 : 3.5}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={x}
                      cy={yOrd}
                      r={active ? 5 : 3}
                      fill="#0EA5E9"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={svgH - 2}
                      textAnchor="middle"
                      className="fill-[#6B7280] dark:fill-[#9CA3AF] text-[11px] font-mono"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-[#525866] dark:text-[#9CA3AF]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2563EB] inline-block" />
                  <span>Revenue (BDT)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-[#0EA5E9] inline-block" />
                  <span>Orders</span>
                </span>
              </div>

              {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                <div className="font-mono tabular-nums text-[#111315] dark:text-white font-semibold">
                  {chartPoints[hoveredIdx].label}: {formatBDT(chartPoints[hoveredIdx].revenue)} ·{' '}
                  {chartPoints[hoveredIdx].ordersCount.toLocaleString()} orders
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top-Selling Products & Most-Read Articles */}
        <div className="xl:col-span-5 grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF]">
                Top-Selling Products
              </h3>
              {canAccessAdminRoute(currentUser.role, 'products') && (
                <button
                  type="button"
                  onClick={() => navigate('products')}
                  className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1"
                >
                  <span>Catalog</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {topProducts.length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] py-3">
                No completed sales recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
                {topProducts.map((p) => (
                  <div key={p.key} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.image_url && (
                        <SafeImage
                          src={p.image_url}
                          alt={p.name}
                          className="w-8 h-8 rounded-md object-cover border border-[#E4E6EB] dark:border-[#2C3344] shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {p.units} sold · {p.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold tabular-nums text-[#111315] dark:text-white shrink-0">
                      {formatBDT(p.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF]">
                Most-Read Editorial Articles
              </h3>
              {canAccessAdminRoute(currentUser.role, 'posts') && (
                <button
                  type="button"
                  onClick={() => navigate('posts')}
                  className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1"
                >
                  <span>Posts</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
              {topPosts.map((post) => (
                <div key={post.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                      {post.title}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      {post.category} · {post.author_name}
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#525866] dark:text-[#9CA3AF] shrink-0">
                    {post.views_count.toLocaleString()} views
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-6 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111315] dark:text-white">Recent Orders</h2>
            {canAccessAdminRoute(currentUser.role, 'orders') && (
              <button
                type="button"
                onClick={() => navigate('orders')}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                Manage all orders →
              </button>
            )}
          </div>
          <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
            {orders.slice(0, 5).map((ord) => (
              <button
                key={ord.id}
                type="button"
                disabled={!canAccessAdminRoute(currentUser.role, 'orders')}
                onClick={() => {
                  if (canAccessAdminRoute(currentUser.role, 'orders')) navigate('orders');
                }}
                className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#191E29] px-1 rounded transition-colors disabled:cursor-default"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                    <span className="font-mono">{ord.order_number}</span> · {ord.customer_name}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {ord.payment_method.toUpperCase()} · {formatDateTime(ord.created_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                    {formatBDT(ord.total)}
                  </div>
                  <div className="text-[11px] capitalize text-[#525866] dark:text-[#9CA3AF]">
                    {ord.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Low Stock Inventory Alerts */}
        <div className="lg:col-span-3 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111315] dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>Low-Stock Alerts</span>
            </h2>
            {canAccessAdminRoute(currentUser.role, 'inventory') && (
              <button
                type="button"
                onClick={() => navigate('inventory')}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                Adjust
              </button>
            )}
          </div>
          {lowStockVariants.length === 0 ? (
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] py-4">
              All variants are above your threshold ({data.cms.low_stock_threshold} pairs).
            </p>
          ) : (
            <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
              {lowStockVariants.map((row) => (
                <div key={row.variantId} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                      {row.productName}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono">
                      {row.sku} · {row.label}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                      row.stock === 0 ? 'text-[#DC2626]' : 'text-[#D97706]'
                    }`}
                  >
                    {row.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Moderation Queue */}
        <div className="lg:col-span-3 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111315] dark:text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#2563EB]" />
              <span>Moderation Queue</span>
            </h2>
            {canAccessAdminRoute(currentUser.role, 'moderation') && (
              <button
                type="button"
                onClick={() => navigate('moderation')}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                Open Hub
              </button>
            )}
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-[#E4E6EB] dark:border-[#252A36]">
              <span className="text-[#525866] dark:text-[#9CA3AF]">Pending Reviews</span>
              <span className="font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                {metrics.pending_reviews_count}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#E4E6EB] dark:border-[#252A36]">
              <span className="text-[#525866] dark:text-[#9CA3AF]">Open Return Requests</span>
              <span className="font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                {metrics.open_returns_count}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#E4E6EB] dark:border-[#252A36]">
              <span className="text-[#525866] dark:text-[#9CA3AF]">Unread Inbox</span>
              <span className="font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                {metrics.unread_messages_count}
              </span>
            </div>
            {pendingModeration.pendingRev.length > 0 && (
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] pt-1">
                Latest review: &ldquo;{pendingModeration.pendingRev[0].title}&rdquo; by{' '}
                {pendingModeration.pendingRev[0].reviewer_name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
