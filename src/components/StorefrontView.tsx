import { useMemo, useState } from 'react';
import { ShoppingBag, Search, ArrowRight, X, SlidersHorizontal, Star } from 'lucide-react';
import type {
  BlogPost,
  CartItem,
  CmsPage,
  CmsSettings,
  Order,
  PackSelection,
  Product,
  ProductCategory,
  ProductReview,
  ProductVariant,
} from '../types.ts';
import { formatBDT, formatShortDate } from '../utils/format.ts';
import { RichContentRenderer } from '../utils/richText.tsx';
import { SafeImage } from './SafeImage.tsx';
import { ProductCard } from './ProductCard.tsx';
import { ProductDetailModal } from './ProductDetailModal.tsx';
import { CartDrawer } from './CartDrawer.tsx';
import { PackBuilderSection } from './PackBuilderSection.tsx';
import { OrderTrackerModal } from './OrderTrackerModal.tsx';
import {
  DynamicCmsPageView,
  ReturnRequestView,
  ReviewsView,
  SizeChartView,
} from './StoreSubpages.tsx';

interface StorefrontViewProps {
  currentPath: string;
  cms: CmsSettings;
  products: Product[];
  pages: CmsPage[];
  posts?: BlogPost[];
  reviews: ProductReview[];
  cart: CartItem[];
  onNavigate: (path: string) => void;
  onAddSingleToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  onAddPackToCart: (
    tier: 3 | 5,
    selections: PackSelection[],
    discountedPrice: number,
    rawPrice: number
  ) => void;
  onUpdateCartQty: (cartKey: string, delta: number) => void;
  onRemoveCartItem: (cartKey: string) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | ProductCategory; label: string }> = [
  { id: 'all', label: 'All Styles' },
  { id: 'crew', label: 'Crew' },
  { id: 'ankle', label: 'Ankle' },
  { id: 'no-show', label: 'No-Show' },
  { id: 'sports', label: 'Sports' },
  { id: 'kids', label: 'Kids' },
  { id: 'bundle', label: 'Bundles' },
];

export function StorefrontView({
  currentPath,
  cms,
  products,
  pages,
  posts = [],
  reviews,
  cart,
  onNavigate,
  onAddSingleToCart,
  onAddPackToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onOrderSuccess,
}: StorefrontViewProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [selectedProductModal, setSelectedProductModal] = useState<{
    product: Product;
    variantId?: number;
  } | null>(null);
  const [selectedCardVariant, setSelectedCardVariant] = useState<Record<number, number>>({});
  const [bagOpen, setBagOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';
  const slugSegment = normalizedPath.startsWith('/page/')
    ? normalizedPath.replace('/page/', '')
    : normalizedPath.replace(/^\//, '');

  const activeCmsPage = useMemo(() => {
    if (
      normalizedPath === '/' ||
      normalizedPath === '/men' ||
      normalizedPath === '/women' ||
      normalizedPath === '/kids-baby' ||
      normalizedPath === '/socks' ||
      normalizedPath === '/size-chart' ||
      normalizedPath === '/reviews' ||
      normalizedPath === '/return-request' ||
      normalizedPath === '/journal'
    ) {
      return null;
    }
    return pages.find((p) => p.slug === slugSegment) || null;
  }, [normalizedPath, slugSegment, pages]);

  const collectionContext = useMemo(() => {
    if (normalizedPath === '/men') {
      return {
        pageKey: 'men',
        title: "Men's Socks & Everyday Bundles",
        subtitle: 'Combed-cotton crew, executive dress, invisible no-show, and athletic cushioning.',
      };
    }
    if (normalizedPath === '/women') {
      return {
        pageKey: 'women',
        title: "Women's Socks & Soft Essentials",
        subtitle: 'Breathable ankle, low-cut no-show, and ribbed crew pairs tailored for daily comfort.',
      };
    }
    if (normalizedPath === '/kids-baby') {
      return {
        pageKey: 'kids-baby',
        title: 'Kids & Baby Gentle Socks',
        subtitle: 'Non-binding cuffs and extra-soft organic combed cotton for babies, toddlers, and school days.',
      };
    }
    if (normalizedPath === '/socks') {
      return {
        pageKey: 'socks',
        title: 'All Mashuka Socks',
        subtitle: 'Explore every cut — Crew, Ankle, No-Show, Sports, Kids, and value multi-pair packs.',
      };
    }
    return null;
  }, [normalizedPath]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      let matchesPage = true;
      if (normalizedPath === '/') {
        matchesPage = p.display_pages.includes('home') || p.is_featured;
      } else if (normalizedPath === '/men') {
        matchesPage = p.display_pages.includes('men') || p.audience === 'men' || p.audience === 'unisex';
      } else if (normalizedPath === '/women') {
        matchesPage =
          p.display_pages.includes('women') || p.audience === 'women' || p.audience === 'unisex';
      } else if (normalizedPath === '/kids-baby') {
        matchesPage =
          p.display_pages.includes('kids-baby') || p.audience === 'kids-baby' || p.category === 'kids';
      } else if (normalizedPath === '/socks') {
        matchesPage = p.display_pages.includes('socks') || true;
      }

      const matchesCat = activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.fabric_specs.toLowerCase().includes(q);
      return matchesPage && matchesCat && matchesSearch;
    });
  }, [products, normalizedPath, activeCategory, searchQuery]);

  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const footerPages = pages.filter(
    (p) => p.menu_location === 'footer' || p.menu_location === 'both'
  );
  const extraHeaderPages = pages.filter(
    (p) => p.menu_location === 'header' || p.menu_location === 'both'
  );

  const handleSelectVariant = (productId: number, variantId: number) => {
    setSelectedCardVariant((prev) => ({ ...prev, [productId]: variantId }));
  };

  const handleQuickAdd = (product: Product, variant: ProductVariant) => {
    onAddSingleToCart(product, variant, 1);
    setBagOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111315]">
      {/* Maintenance Mode Notice */}
      {cms.maintenance_mode && (
        <div className="bg-[#FEF3C7] text-[#92400E] border-b border-[#FDE68A] text-xs px-4 py-2 text-center font-medium">
          Catalog maintenance is in progress — orders &amp; browsing remain active across Bangladesh.
        </div>
      )}

      {/* Slim Dismissible Utility & Announcement Bar */}
      {showAnnouncement && (
        <div className="bg-[#111315] text-white text-xs h-9 px-4 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setTrackerOpen(true)}
              className="text-white/85 hover:text-white underline underline-offset-2 whitespace-nowrap"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/reviews')}
              className="text-white/85 hover:text-white whitespace-nowrap"
            >
              Reviews
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/return-request')}
              className="text-white/85 hover:text-white whitespace-nowrap"
            >
              Return Request
            </button>
          </div>
          <p className="truncate text-center flex-1 px-4 text-white/95">{cms.announcement_text}</p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="text-white font-medium hover:underline whitespace-nowrap"
            >
              Admin CMS
            </button>
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              aria-label="Dismiss announcement"
              className="text-white/70 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E4E6EB]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Logo + Single-line Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              onNavigate('/');
            }}
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#111315] whitespace-nowrap shrink-0 font-display"
          >
            {cms.logo_url && (
              <SafeImage
                src={cms.logo_url}
                alt={`${cms.brand_name} logo`}
                className="w-8 h-8 rounded-md object-cover shrink-0 border border-[#E4E6EB]"
              />
            )}
            <span>{cms.brand_name}</span>
          </button>

          {/* Zone 2: Concise single-line subpage links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#525866]">
            {[
              { path: '/men', label: 'Men' },
              { path: '/women', label: 'Women' },
              { path: '/kids-baby', label: 'Kids & Baby' },
              { path: '/socks', label: 'Socks' },
              { path: '/size-chart', label: 'Size Chart' },
            ].map((link) => {
              const active = normalizedPath === link.path;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    onNavigate(link.path);
                  }}
                  className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#111315] hover:underline underline-offset-4 ${
                    active ? 'text-[#111315] font-semibold underline underline-offset-4' : ''
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            {extraHeaderPages.map((ep) => (
              <button
                key={ep.id}
                type="button"
                onClick={() => onNavigate(`/page/${ep.slug}`)}
                className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#111315] hover:underline underline-offset-4 ${
                  normalizedPath === `/page/${ep.slug}`
                    ? 'text-[#111315] font-semibold underline underline-offset-4'
                    : ''
                }`}
              >
                {ep.title}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="h-10 px-4 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="font-mono tabular-nums">Bag ({bagCount})</span>
            </button>
          </div>
        </div>

        {/* Mobile Subpage Strip */}
        <div className="md:hidden border-t border-[#E4E6EB] px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-[#525866]">
          <button type="button" onClick={() => onNavigate('/men')} className="whitespace-nowrap">
            Men
          </button>
          <button type="button" onClick={() => onNavigate('/women')} className="whitespace-nowrap">
            Women
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/kids-baby')}
            className="whitespace-nowrap"
          >
            Kids &amp; Baby
          </button>
          <button type="button" onClick={() => onNavigate('/socks')} className="whitespace-nowrap">
            Socks
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/size-chart')}
            className="whitespace-nowrap"
          >
            Size Chart
          </button>
          {extraHeaderPages.map((ep) => (
            <button
              key={ep.id}
              type="button"
              onClick={() => onNavigate(`/page/${ep.slug}`)}
              className="whitespace-nowrap"
            >
              {ep.title}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {normalizedPath === '/size-chart' ? (
          <SizeChartView cms={cms} onBackHome={() => onNavigate('/')} />
        ) : normalizedPath === '/reviews' ? (
          <ReviewsView
            reviews={reviews}
            products={products}
            onBackHome={() => onNavigate('/')}
          />
        ) : normalizedPath === '/return-request' ? (
          <ReturnRequestView
            onBackHome={() => onNavigate('/')}
            onOpenPolicy={() => onNavigate('/page/return-refund-policy')}
          />
        ) : normalizedPath === '/journal' ? (
          <section className="py-12 md:py-16 bg-white">
            <div className="max-w-5xl mx-auto px-6 space-y-8">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="text-xs font-medium text-[#525866] hover:text-[#111315]"
                >
                  ← Back to Home
                </button>
                <h1 className="text-3xl font-bold text-[#111315] tracking-tight">
                  {cms.brand_name} Editorial &amp; Care Journal
                </h1>
                <p className="text-sm text-[#525866]">
                  Stories on combed cotton, sizing guides, and everyday essentials from Bangladesh.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-xl border border-[#E4E6EB] bg-white overflow-hidden flex flex-col"
                  >
                    <SafeImage
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-52 object-cover"
                    />
                    <div className="p-5 space-y-2.5 flex-1">
                      <div className="text-[11px] text-[#525866]">
                        {post.category} · {post.author_name} · {formatShortDate(post.created_at)}
                      </div>
                      <h2 className="text-lg font-bold text-[#111315]">{post.title}</h2>
                      <p className="text-xs text-[#525866] leading-relaxed">{post.excerpt}</p>
                      <div className="pt-2">
                        <RichContentRenderer content={post.content} className="text-xs leading-relaxed" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : activeCmsPage ? (
          <DynamicCmsPageView
            page={activeCmsPage}
            cms={cms}
            products={products}
            selectedCardVariant={selectedCardVariant}
            onSelectCardVariant={handleSelectVariant}
            onOpenDetail={(product, variantId) =>
              setSelectedProductModal({ product, variantId })
            }
            onQuickAdd={handleQuickAdd}
            onBackHome={() => onNavigate('/')}
          />
        ) : (
          <>
            {/* Hero on Home, or Clean Subpage Header on Men/Women/Kids & Baby/Socks */}
            {normalizedPath === '/' ? (
              <section className="relative w-full min-h-[520px] md:min-h-[620px] lg:min-h-[680px] flex items-end md:items-center overflow-hidden border-b border-[#E4E6EB] bg-[#111315]">
                {/* Full-bleed edge-to-edge cover photograph */}
                <SafeImage
                  src={cms.hero_image_url}
                  alt={cms.hero_title}
                  fallbackTitle={cms.brand_name}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />

                {/* Measured gradient scrim for WCAG contrast across mobile and desktop */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 md:hidden"
                />

                <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-14 md:py-24">
                  <div className="max-w-xl space-y-5">
                    <h1 className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold text-white leading-[1.06] tracking-tight text-balance">
                      {cms.hero_title}
                    </h1>
                    <p className="text-base text-white/85 leading-relaxed max-w-lg">
                      {cms.hero_subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('catalog');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="h-11 px-6 rounded-lg bg-white text-[#111315] text-sm font-semibold hover:bg-[#F3F4F6] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>{cms.hero_cta_label}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('pack-builder');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="h-11 px-5 rounded-lg border border-white/45 bg-black/30 backdrop-blur-[2px] text-white text-sm font-medium hover:bg-white/15 transition-colors whitespace-nowrap"
                      >
                        Build a Pack · Save up to {cms.pack_5_discount_pct}%
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="border-b border-[#E4E6EB] bg-[#F6F7F8] py-10">
                <div className="max-w-6xl mx-auto px-6 space-y-2">
                  <div className="text-xs font-medium text-[#1D4ED8] uppercase tracking-wider">
                    {cms.brand_name} · {cms.brand_slogan}
                  </div>
                  <h1 className="text-3xl font-bold text-[#111315] tracking-tight">
                    {collectionContext?.title}
                  </h1>
                  <p className="text-sm text-[#525866] max-w-2xl">{collectionContext?.subtitle}</p>
                </div>
              </section>
            )}

            {/* Basiq-style 4-Column Shop by Category Showcase on Homepage */}
            {normalizedPath === '/' && (
              <section className="py-12 bg-white border-b border-[#E4E6EB]">
                <div className="max-w-6xl mx-auto px-6 space-y-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#111315] tracking-tight">
                        Shop by Collection
                      </h2>
                      <p className="text-sm text-[#525866] mt-1">
                        Everyday essentials tailored for men, women, kids, and value bundles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('/socks')}
                      className="text-xs font-semibold text-[#111315] hover:text-[#1D4ED8] hover:underline whitespace-nowrap"
                    >
                      View All Socks →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      {
                        title: "Men's Socks",
                        subtitle: 'Ribbed crew & executive dress',
                        image: '/src/assets/images/sock_crew_ribbed_1795008504482.jpg',
                        action: () => onNavigate('/men'),
                      },
                      {
                        title: "Women's Socks",
                        subtitle: 'Soft ankle & invisible no-show',
                        image: '/src/assets/images/sock_noshow_invisible_1795008501930.jpg',
                        action: () => onNavigate('/women'),
                      },
                      {
                        title: 'Kids & Baby',
                        subtitle: 'Gentle cuffs & organic knit',
                        image: '/src/assets/images/sock_ankle_everyday_1795008501503.jpg',
                        action: () => onNavigate('/kids-baby'),
                      },
                      {
                        title: 'Bundles & Save',
                        subtitle: `Save up to ${cms.pack_5_discount_pct}% on packs`,
                        image: '/src/assets/images/sock_bundle_box_1795008503521.jpg',
                        action: () => {
                          const el = document.getElementById('pack-builder');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        },
                      },
                    ].map((cat) => (
                      <button
                        key={cat.title}
                        type="button"
                        onClick={cat.action}
                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E4E6EB] bg-[#F6F7F8] text-left"
                      >
                        <SafeImage
                          src={cat.image}
                          alt={cat.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2 text-white">
                          <div>
                            <div className="text-base font-bold leading-tight">{cat.title}</div>
                            <div className="text-xs text-white/80 mt-0.5">{cat.subtitle}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Catalog Section */}
            <section id="catalog" className="py-14 md:py-16 bg-white">
              <div className="max-w-6xl mx-auto px-6 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111315] tracking-tight">
                      {normalizedPath === '/' ? 'Latest Drops & Bestsellers' : 'Available Pairs & Bundles'}
                    </h2>
                    <p className="text-sm text-[#525866] mt-1">
                      {filteredProducts.length} items · Cash on Delivery, bKash &amp; Nagad
                    </p>
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search crew, kids, no-show..."
                      className="w-full h-10 pl-9 pr-3 text-sm bg-[#F6F7F8] border border-[#E4E6EB] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {CATEGORY_TABS.map((tab) => {
                    const active = activeCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                          active
                            ? 'bg-[#111315] text-white'
                            : 'bg-[#F6F7F8] text-[#525866] hover:text-[#111315]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center border border-[#E4E6EB] rounded-xl bg-[#FAFAFA] space-y-3">
                    <div className="text-base font-semibold text-[#111315]">
                      No products assigned to this view yet
                    </div>
                    <p className="text-sm text-[#525866]">
                      Reset filters or assign products to this page inside the Mashuka Admin CMS.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('all');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#111315] text-white text-xs font-medium"
                    >
                      Show All
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        selectedVariantId={selectedCardVariant[product.id]}
                        onSelectVariant={handleSelectVariant}
                        onOpenDetail={(prod, varId) =>
                          setSelectedProductModal({ product: prod, variantId: varId })
                        }
                        onQuickAdd={handleQuickAdd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Pack Builder & Craftsmanship on Home + Socks Page */}
            {(normalizedPath === '/' || normalizedPath === '/socks') && (
              <PackBuilderSection
                products={products}
                cms={cms}
                onAddPackToBag={(tier, selections, discountedPrice, rawPrice) => {
                  onAddPackToCart(tier, selections, discountedPrice, rawPrice);
                  setBagOpen(true);
                }}
              />
            )}

            {/* Reviews Preview Strip on Home */}
            {normalizedPath === '/' && reviews.length > 0 && (
              <section className="py-14 bg-white border-t border-[#E4E6EB]">
                <div className="max-w-6xl mx-auto px-6 space-y-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#111315] tracking-tight">
                        Worn Across Bangladesh
                      </h2>
                      <p className="text-sm text-[#525866] mt-1">
                        Verified reviews from Dhaka, Chattogram, and Sylhet shoppers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('/reviews')}
                      className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
                    >
                      All Reviews &amp; Write One →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reviews.slice(0, 3).map((rev) => (
                      <div
                        key={rev.id}
                        className="p-5 rounded-xl border border-[#E4E6EB] bg-[#FAFAFA] space-y-2"
                      >
                        <div className="flex items-center gap-0.5 text-[#D97706]">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <div className="text-sm font-bold text-[#111315]">{rev.title}</div>
                        <p className="text-xs text-[#525866] leading-relaxed">{rev.comment}</p>
                        <div className="text-[11px] text-[#525866] pt-1">
                          {rev.reviewer_name} · {rev.reviewer_city}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Comprehensive Footer with All Policy, Customer Care & WordPress CMS Pages */}
      <footer className="bg-[#111315] text-white py-12 border-t border-[#27272A]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {cms.logo_url && (
                <SafeImage
                  src={cms.logo_url}
                  alt={cms.brand_name}
                  className="w-8 h-8 rounded-md object-cover border border-white/15"
                />
              )}
              <div>
                <div className="text-base font-extrabold tracking-tight font-display">
                  {cms.brand_name}
                </div>
                <div className="text-[11px] text-white/65">{cms.brand_slogan}</div>
              </div>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{cms.store_address}</p>
            <div className="text-xs text-white/70 font-mono">
              WhatsApp: {cms.support_whatsapp}
              <br />
              {cms.support_email}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider mb-2">Shop</div>
            <div className="flex flex-col gap-1.5 text-white/75">
              <button type="button" onClick={() => onNavigate('/men')} className="text-left hover:text-white">
                Men
              </button>
              <button type="button" onClick={() => onNavigate('/women')} className="text-left hover:text-white">
                Women
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/kids-baby')}
                className="text-left hover:text-white"
              >
                Kids &amp; Baby
              </button>
              <button type="button" onClick={() => onNavigate('/socks')} className="text-left hover:text-white">
                All Socks
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/size-chart')}
                className="text-left hover:text-white"
              >
                Size Chart
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider mb-2">
              Company &amp; Policies
            </div>
            <div className="flex flex-col gap-1.5 text-white/75">
              {footerPages.map((fp) => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => onNavigate(`/page/${fp.slug}`)}
                  className="text-left hover:text-white"
                >
                  {fp.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onNavigate('/reviews')}
                className="text-left hover:text-white"
              >
                Customer Reviews
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/return-request')}
                className="text-left hover:text-white"
              >
                Return Request Form
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/journal')}
                className="text-left hover:text-white"
              >
                Editorial Journal
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="font-semibold text-white uppercase tracking-wider">
              Delivery &amp; Store CMS
            </div>
            <p className="text-white/70 leading-relaxed">
              Inside Dhaka {formatBDT(cms.dhaka_shipping_fee)} · Outside Dhaka{' '}
              {formatBDT(cms.outside_dhaka_shipping_fee)} · Free over{' '}
              {formatBDT(cms.free_shipping_threshold)}.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTrackerOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/25 text-white hover:bg-white hover:text-[#111315] transition-colors font-medium"
              >
                Track Your Order
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-[#111315] hover:bg-[#E5E7EB] transition-colors font-semibold"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Open WordPress CMS</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {selectedProductModal && (
        <ProductDetailModal
          product={selectedProductModal.product}
          initialVariantId={selectedProductModal.variantId}
          onClose={() => setSelectedProductModal(null)}
          onAddToBag={(product, variant, qty) => {
            onAddSingleToCart(product, variant, qty);
            setBagOpen(true);
          }}
        />
      )}

      <CartDrawer
        open={bagOpen}
        items={cart}
        cms={cms}
        onClose={() => setBagOpen(false)}
        onUpdateQty={onUpdateCartQty}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
        onOrderSuccess={onOrderSuccess}
      />

      <OrderTrackerModal open={trackerOpen} onClose={() => setTrackerOpen(false)} />
    </div>
  );
}
