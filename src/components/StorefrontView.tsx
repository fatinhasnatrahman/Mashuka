import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  Search,
  ArrowRight,
  X,
  SlidersHorizontal,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Check,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import type {
  BlogPost,
  CartItem,
  CmsPage,
  CmsSettings,
  NavMenu,
  NavMenuItem,
  Order,
  PackSelection,
  Product,
  ProductCategory,
  ProductReview,
  ProductVariant,
  PublicPlugin,
} from '../types.ts';
import { formatBDT, formatShortDate, isProductSaleActive } from '../utils/format.ts';
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
  menus?: NavMenu[];
  plugins?: PublicPlugin[];
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

const DEFAULT_HEADER_ITEMS: NavMenuItem[] = [
  { id: 'def-men', label: 'Men', url: '/men', type: 'category', children: [] },
  { id: 'def-women', label: 'Women', url: '/women', type: 'category', children: [] },
  { id: 'def-kids', label: 'Kids & Baby', url: '/kids-baby', type: 'category', children: [] },
  { id: 'def-socks', label: 'Socks', url: '/socks', type: 'category', children: [] },
  { id: 'def-size', label: 'Size Chart', url: '/size-chart', type: 'page', children: [] },
];

const ITEMS_PER_PAGE = 12;

export function StorefrontView({
  currentPath,
  cms,
  products,
  pages,
  posts = [],
  menus = [],
  plugins = [],
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
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [catalogPage, setCatalogPage] = useState(1);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [selectedProductModal, setSelectedProductModal] = useState<{
    product: Product;
    variantId?: number;
  } | null>(null);
  const [selectedCardVariant, setSelectedCardVariant] = useState<Record<number, number>>({});
  const [bagOpen, setBagOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Full product detail page local state
  const [pageVariantId, setPageVariantId] = useState<number | null>(null);
  const [pageActiveImage, setPageActiveImage] = useState<string>('');
  const [pageQty, setPageQty] = useState(1);

  // Newsletter popup plugin state
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [newsletterSuccessCode, setNewsletterSuccessCode] = useState('');

  const viewedSlugsRef = useRef<Set<string>>(new Set());

  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';
  const slugSegment = normalizedPath.startsWith('/page/')
    ? normalizedPath.replace('/page/', '')
    : normalizedPath.replace(/^\//, '');

  const isCollectionRoute =
    normalizedPath === '/' ||
    normalizedPath === '/men' ||
    normalizedPath === '/women' ||
    normalizedPath === '/kids-baby' ||
    normalizedPath === '/socks';

  const productSlug = normalizedPath.startsWith('/product/')
    ? decodeURIComponent(normalizedPath.slice('/product/'.length))
    : null;
  const activeProduct = useMemo(
    () => (productSlug ? products.find((p) => p.slug === productSlug) || null : null),
    [products, productSlug]
  );

  const journalSlug = normalizedPath.startsWith('/journal/')
    ? decodeURIComponent(normalizedPath.slice('/journal/'.length))
    : null;
  const activePost = useMemo(
    () => (journalSlug ? posts.find((p) => p.slug === journalSlug) || null : null),
    [posts, journalSlug]
  );

  const activeCmsPage = useMemo(() => {
    if (
      isCollectionRoute ||
      normalizedPath === '/size-chart' ||
      normalizedPath === '/reviews' ||
      normalizedPath === '/return-request' ||
      normalizedPath === '/journal' ||
      productSlug !== null ||
      journalSlug !== null
    ) {
      return null;
    }
    return pages.find((p) => p.slug === slugSegment) || null;
  }, [isCollectionRoute, normalizedPath, slugSegment, pages, productSlug, journalSlug]);

  const isKnownStaticPage =
    isCollectionRoute ||
    normalizedPath === '/size-chart' ||
    normalizedPath === '/reviews' ||
    normalizedPath === '/return-request' ||
    normalizedPath === '/journal';

  const isNotFound =
    !isKnownStaticPage && !activeProduct && !activePost && !activeCmsPage;

  // Reset catalog pagination when view filters change
  useEffect(() => {
    setCatalogPage(1);
  }, [normalizedPath, activeCategory, searchQuery, sortBy]);

  // Reset product detail page selection when activeProduct changes
  useEffect(() => {
    if (activeProduct) {
      const defVar =
        activeProduct.variants.find((v) => v.stock > 0) || activeProduct.variants[0];
      setPageVariantId(defVar?.id ?? null);
      setPageActiveImage(defVar?.image_url || activeProduct.image_url);
      setPageQty(1);
    }
  }, [activeProduct]);

  // Increment blog post view counter once per slug visit
  useEffect(() => {
    if (activePost && !viewedSlugsRef.current.has(activePost.slug)) {
      viewedSlugsRef.current.add(activePost.slug);
      fetch(`/api/posts/${encodeURIComponent(activePost.slug)}/view`, {
        method: 'POST',
      }).catch(() => {});
    }
  }, [activePost]);

  // Plugins lookup
  const bkashPlugin = useMemo(
    () => plugins.find((p) => p.id === 'bkash-webhook'),
    [plugins]
  );
  const schemaPlugin = useMemo(
    () => plugins.find((p) => p.id === 'schema-jsonld'),
    [plugins]
  );
  const newsletterPlugin = useMemo(
    () => plugins.find((p) => p.id === 'newsletter-popup'),
    [plugins]
  );

  // Newsletter popup timer
  useEffect(() => {
    if (!newsletterPlugin?.is_enabled) return;
    try {
      if (window.localStorage.getItem('mashuka_newsletter_dismissed') === '1') return;
    } catch {
      // ignore storage restrictions
    }
    const delaySec = Math.max(1, Number(newsletterPlugin.config?.delay_seconds || 8));
    const timer = window.setTimeout(() => {
      setNewsletterOpen(true);
    }, delaySec * 1000);
    return () => window.clearTimeout(timer);
  }, [newsletterPlugin]);

  // Apply CMS theme CSS variables, fonts, favicon, document title, meta description & JSON-LD
  useEffect(() => {
    const root = document.documentElement;
    if (cms.primary_color) root.style.setProperty('--cms-primary', cms.primary_color);
    if (cms.accent_color) root.style.setProperty('--cms-accent', cms.accent_color);
    if (cms.heading_font) {
      root.style.setProperty(
        '--font-display',
        `"${cms.heading_font}", system-ui, -apple-system, sans-serif`
      );
    }
    if (cms.body_font) {
      root.style.setProperty(
        '--font-sans',
        `"${cms.body_font}", system-ui, -apple-system, sans-serif`
      );
    }

    if (cms.favicon_url) {
      let fav = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!fav) {
        fav = document.createElement('link');
        fav.rel = 'icon';
        document.head.appendChild(fav);
      }
      fav.href = cms.favicon_url;
    }

    let pageTitle = `${cms.brand_name} — ${cms.brand_slogan}`;
    let pageDescription = cms.hero_subtitle || cms.brand_slogan;

    if (activeProduct) {
      pageTitle = activeProduct.seo_title || `${activeProduct.name} | ${cms.brand_name}`;
      pageDescription = activeProduct.seo_description || activeProduct.short_description;
    } else if (activePost) {
      pageTitle = activePost.seo_title || `${activePost.title} | ${cms.brand_name}`;
      pageDescription = activePost.seo_description || activePost.excerpt;
    } else if (activeCmsPage) {
      pageTitle = activeCmsPage.seo_title || `${activeCmsPage.title} | ${cms.brand_name}`;
      pageDescription = activeCmsPage.seo_description || activeCmsPage.excerpt;
    } else if (normalizedPath === '/men') {
      pageTitle = `Men's Socks | ${cms.brand_name}`;
    } else if (normalizedPath === '/women') {
      pageTitle = `Women's Socks | ${cms.brand_name}`;
    } else if (normalizedPath === '/kids-baby') {
      pageTitle = `Kids & Baby Socks | ${cms.brand_name}`;
    } else if (normalizedPath === '/socks') {
      pageTitle = `All Socks | ${cms.brand_name}`;
    } else if (normalizedPath === '/size-chart') {
      pageTitle = `Size Chart | ${cms.brand_name}`;
    } else if (normalizedPath === '/reviews') {
      pageTitle = `Customer Reviews | ${cms.brand_name}`;
    } else if (normalizedPath === '/return-request') {
      pageTitle = `Return Request | ${cms.brand_name}`;
    } else if (normalizedPath === '/journal') {
      pageTitle = `Editorial Journal | ${cms.brand_name}`;
    } else if (isNotFound) {
      pageTitle = `Page Not Found | ${cms.brand_name}`;
    }

    document.title = pageTitle;
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = pageDescription;
  }, [cms, normalizedPath, activeProduct, activePost, activeCmsPage, isNotFound]);

  // Inject Schema.org JSON-LD when plugin enabled
  useEffect(() => {
    const existing = document.getElementById('mashuka-jsonld');
    if (!schemaPlugin?.is_enabled) {
      if (existing) existing.remove();
      return;
    }

    const origin = window.location.origin;
    let payload: Record<string, unknown>;

    if (activeProduct) {
      const productReviews = reviews.filter((r) => r.product_id === activeProduct.id);
      const avgRating =
        productReviews.length > 0
          ? Number(
              (
                productReviews.reduce((acc, r) => acc + r.rating, 0) /
                productReviews.length
              ).toFixed(1)
            )
          : null;
      const inStock = activeProduct.variants.some((v) => v.stock > 0);
      payload = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: activeProduct.name,
        description: activeProduct.short_description,
        image: activeProduct.image_url,
        brand: { '@type': 'Brand', name: cms.brand_name },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          price: activeProduct.price,
          availability: inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `${origin}/product/${activeProduct.slug}`,
        },
        ...(schemaPlugin.config?.include_reviews && avgRating !== null
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: avgRating,
                reviewCount: productReviews.length,
              },
            }
          : {}),
      };
    } else {
      payload = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: cms.brand_name,
        description: cms.brand_slogan,
        url: origin,
        email: cms.support_email,
        telephone: cms.support_whatsapp,
        address: cms.store_address,
      };
    }

    const scriptEl =
      (existing as HTMLScriptElement | null) || document.createElement('script');
    scriptEl.id = 'mashuka-jsonld';
    scriptEl.type = 'application/ld+json';
    scriptEl.textContent = JSON.stringify(payload);
    if (!existing) document.head.appendChild(scriptEl);

    return () => {
      const el = document.getElementById('mashuka-jsonld');
      if (el) el.remove();
    };
  }, [schemaPlugin, cms, activeProduct, reviews]);

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
    const list = products.filter((p) => {
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
        matchesPage = p.display_pages.includes('socks');
      }

      const matchesCat = activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.fabric_specs.toLowerCase().includes(q);
      return matchesPage && matchesCat && matchesSearch;
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [products, normalizedPath, activeCategory, searchQuery, sortBy]);

  const totalCatalogPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (catalogPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, catalogPage]);

  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const footerPages = pages.filter(
    (p) => p.menu_location === 'footer' || p.menu_location === 'both'
  );
  const extraHeaderPages = pages.filter(
    (p) => p.menu_location === 'header' || p.menu_location === 'both'
  );

  const headerMenuItems = useMemo(() => {
    const saved = menus.find((m) => m.location === 'header')?.items;
    return saved && saved.length > 0 ? saved : DEFAULT_HEADER_ITEMS;
  }, [menus]);

  const mobileMenuItems = useMemo(() => {
    const saved = menus.find((m) => m.location === 'mobile')?.items;
    return saved && saved.length > 0 ? saved : headerMenuItems;
  }, [menus, headerMenuItems]);

  const footerMenuItems = useMemo(() => {
    const saved = menus.find((m) => m.location === 'footer')?.items;
    return saved && saved.length > 0 ? saved : DEFAULT_HEADER_ITEMS;
  }, [menus]);

  const handleSelectVariant = (productId: number, variantId: number) => {
    setSelectedCardVariant((prev) => ({ ...prev, [productId]: variantId }));
  };

  const handleQuickAdd = (product: Product, variant: ProductVariant) => {
    onAddSingleToCart(product, variant, 1);
    setBagOpen(true);
  };

  const dismissNewsletter = () => {
    setNewsletterOpen(false);
    try {
      window.localStorage.setItem('mashuka_newsletter_dismissed', '1');
    } catch {
      // ignore
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !email.includes('@')) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }
    setNewsletterSubmitting(true);
    setNewsletterError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Newsletter Subscriber',
          email,
          phone: '',
          subject: 'Newsletter Signup',
          message: `Subscribed via storefront popup (${normalizedPath})`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNewsletterError(data.error || 'Could not subscribe right now.');
        return;
      }
      const offerCode = String(newsletterPlugin?.config?.offer_code || 'WELCOME10');
      setNewsletterSuccessCode(offerCode);
      try {
        window.localStorage.setItem('mashuka_newsletter_dismissed', '1');
      } catch {
        // ignore
      }
    } catch {
      setNewsletterError('Network error while subscribing.');
    } finally {
      setNewsletterSubmitting(false);
    }
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
        <div
          className={`max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8 ${
            cms.header_layout === 'centered' ? 'md:justify-center md:gap-12' : ''
          }`}
        >
          {/* Zone 1: Brand Logo + Single-line Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setOpenDropdownId(null);
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

          {/* Zone 2: Concise single-line subpage links from NavMenus */}
          {cms.header_layout !== 'minimal' && (
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-[#525866]"
            >
              {headerMenuItems.map((item) => {
                const active = normalizedPath === item.url;
                const hasChildren = item.children && item.children.length > 0;
                const dropdownOpen = openDropdownId === item.id;
                return (
                  <div
                    key={item.id}
                    className="relative flex items-center"
                    onMouseLeave={() => {
                      if (dropdownOpen) setOpenDropdownId(null);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('all');
                        setOpenDropdownId(null);
                        onNavigate(item.url);
                      }}
                      className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#111315] hover:underline underline-offset-4 ${
                        active ? 'text-[#111315] font-semibold underline underline-offset-4' : ''
                      }`}
                    >
                      {item.label}
                    </button>
                    {hasChildren && (
                      <button
                        type="button"
                        aria-label={`Toggle ${item.label} submenu`}
                        onClick={() => setOpenDropdownId(dropdownOpen ? null : item.id)}
                        className="ml-0.5 p-0.5 text-[#525866] hover:text-[#111315]"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasChildren && dropdownOpen && (
                      <div className="absolute top-full left-0 mt-1.5 min-w-[180px] rounded-lg border border-[#E4E6EB] bg-white shadow-lg py-1.5 z-50">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setOpenDropdownId(null);
                              onNavigate(child.url);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs text-[#525866] hover:bg-[#F6F7F8] hover:text-[#111315]"
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {extraHeaderPages
                .filter((ep) => !headerMenuItems.some((m) => m.url === `/page/${ep.slug}`))
                .map((ep) => (
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
          )}

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
          {mobileMenuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveCategory('all');
                onNavigate(item.url);
              }}
              className={`whitespace-nowrap ${
                normalizedPath === item.url ? 'text-[#111315] font-semibold' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
          {extraHeaderPages
            .filter((ep) => !mobileMenuItems.some((m) => m.url === `/page/${ep.slug}`))
            .map((ep) => (
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
              {posts.length === 0 ? (
                <div className="py-12 text-center border border-[#E4E6EB] rounded-xl bg-[#FAFAFA] text-sm text-[#525866]">
                  No published journal stories yet.
                </div>
              ) : (
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
                      <div className="p-5 space-y-2.5 flex-1 flex flex-col">
                        <div className="text-[11px] text-[#525866]">
                          {post.category} · {post.author_name} · {formatShortDate(post.created_at)}
                        </div>
                        <h2 className="text-lg font-bold text-[#111315]">{post.title}</h2>
                        <p className="text-xs text-[#525866] leading-relaxed flex-1">{post.excerpt}</p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => onNavigate(`/journal/${post.slug}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
                          >
                            <span>Read Article</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : activePost ? (
          <article className="py-12 md:py-16 bg-white">
            <div className="max-w-3xl mx-auto px-6 space-y-6">
              <button
                type="button"
                onClick={() => onNavigate('/journal')}
                className="text-xs font-medium text-[#525866] hover:text-[#111315]"
              >
                ← Back to Journal
              </button>
              <div className="space-y-3 border-b border-[#E4E6EB] pb-6">
                <div className="text-xs font-medium text-[#1D4ED8] uppercase tracking-wider">
                  {activePost.category} · {activePost.author_name} ·{' '}
                  {formatShortDate(activePost.created_at)}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#111315] tracking-tight">
                  {activePost.title}
                </h1>
                {activePost.excerpt && (
                  <p className="text-base text-[#525866] leading-relaxed">{activePost.excerpt}</p>
                )}
              </div>
              {activePost.featured_image && (
                <SafeImage
                  src={activePost.featured_image}
                  alt={activePost.title}
                  className="w-full h-72 md:h-96 object-cover rounded-xl border border-[#E4E6EB]"
                />
              )}
              <RichContentRenderer content={activePost.content} className="text-sm leading-relaxed" />
            </div>
          </article>
        ) : activeProduct ? (
          (() => {
            const activeVar =
              activeProduct.variants.find((v) => v.id === pageVariantId) ||
              activeProduct.variants[0];
            const displayPrice = activeVar?.price_override ?? activeProduct.price;
            const onSale = isProductSaleActive(activeProduct, displayPrice);
            const gallery = Array.from(
              new Set([
                ...(activeProduct.image_url ? [activeProduct.image_url] : []),
                ...(activeProduct.gallery_urls || []),
                ...activeProduct.variants
                  .map((v) => v.image_url)
                  .filter((u): u is string => Boolean(u)),
              ])
            );
            const prodReviews = reviews.filter((r) => r.product_id === activeProduct.id);
            const maxStock = activeVar?.stock ?? 0;

            return (
              <section className="py-10 md:py-14 bg-white">
                <div className="max-w-6xl mx-auto px-6 space-y-10">
                  <div className="flex items-center gap-2 text-xs text-[#525866]">
                    <button
                      type="button"
                      onClick={() => onNavigate('/')}
                      className="hover:text-[#111315]"
                    >
                      Home
                    </button>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('/socks')}
                      className="hover:text-[#111315]"
                    >
                      Socks
                    </button>
                    <span>/</span>
                    <span className="text-[#111315] font-medium truncate">{activeProduct.name}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Gallery */}
                    <div className="space-y-3">
                      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#F6F7F8] border border-[#E4E6EB]">
                        <SafeImage
                          src={pageActiveImage || activeProduct.image_url}
                          alt={activeProduct.name}
                          className="w-full h-full object-cover"
                        />
                        {onSale && activeProduct.compare_at_price && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold bg-[#DC2626] text-white">
                            SALE
                          </span>
                        )}
                      </div>
                      {gallery.length > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                          {gallery.map((imgUrl) => (
                            <button
                              key={imgUrl}
                              type="button"
                              onClick={() => setPageActiveImage(imgUrl)}
                              className={`aspect-square rounded-lg overflow-hidden border transition-all ${
                                (pageActiveImage || activeProduct.image_url) === imgUrl
                                  ? 'border-[#111315] ring-2 ring-[#111315]/20'
                                  : 'border-[#E4E6EB] hover:border-[#9CA3AF]'
                              }`}
                            >
                              <SafeImage
                                src={imgUrl}
                                alt={activeProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product details */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                          {activeProduct.category} · {activeProduct.audience}
                        </div>
                        <h1 className="text-3xl font-bold text-[#111315] tracking-tight">
                          {activeProduct.name}
                        </h1>
                        <div className="flex items-baseline gap-2.5 pt-1">
                          <span className="font-mono text-2xl font-bold text-[#111315] tabular-nums">
                            {formatBDT(displayPrice)}
                          </span>
                          {onSale && activeProduct.compare_at_price && (
                            <span className="font-mono text-sm text-[#9CA3AF] line-through tabular-nums">
                              {formatBDT(activeProduct.compare_at_price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-[#525866] leading-relaxed">
                        {activeProduct.short_description}
                      </p>

                      {activeProduct.variants.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#111315]">
                              Color &amp; Size:{' '}
                              <span className="font-normal text-[#525866]">
                                {activeVar?.color_name} · {activeVar?.size}
                              </span>
                            </span>
                            {activeVar && (
                              <span
                                className={`font-mono ${
                                  activeVar.stock > 0 ? 'text-[#059669]' : 'text-[#DC2626]'
                                }`}
                              >
                                {activeVar.stock > 0
                                  ? `${activeVar.stock} pairs in stock`
                                  : 'Sold Out'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeProduct.variants.map((v) => {
                              const selected = activeVar?.id === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setPageVariantId(v.id);
                                    if (v.image_url) setPageActiveImage(v.image_url);
                                    setPageQty(1);
                                  }}
                                  className={`px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center gap-2 transition-colors ${
                                    selected
                                      ? 'border-[#111315] bg-[#111315] text-white'
                                      : 'border-[#E4E6EB] bg-white text-[#111315] hover:border-[#9CA3AF]'
                                  } ${v.stock === 0 ? 'opacity-50' : ''}`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                                    style={{ backgroundColor: v.color_hex }}
                                  />
                                  <span>
                                    {v.color_name} ({v.size})
                                  </span>
                                  {selected && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <div className="inline-flex items-center border border-[#E4E6EB] rounded-lg h-11">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setPageQty((q) => Math.max(1, q - 1))}
                            className="w-10 h-full flex items-center justify-center text-[#525866] hover:text-[#111315]"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums">
                            {pageQty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setPageQty((q) => Math.min(Math.max(1, maxStock), q + 1))}
                            className="w-10 h-full flex items-center justify-center text-[#525866] hover:text-[#111315]"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={!activeVar || maxStock <= 0}
                          onClick={() => {
                            if (activeVar && maxStock > 0) {
                              onAddSingleToCart(activeProduct, activeVar, pageQty);
                              setBagOpen(true);
                            }
                          }}
                          className="flex-1 h-11 rounded-lg bg-[#111315] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-45"
                        >
                          {maxStock > 0 ? 'Add to Bag' : 'Out of Stock'}
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F6F7F8] border border-[#E4E6EB] space-y-2 text-xs text-[#525866]">
                        <div className="font-semibold text-[#111315] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#059669]" />
                          <span>Fabric &amp; Craft Specifications</span>
                        </div>
                        <p>{activeProduct.fabric_specs}</p>
                        {activeVar?.sku && (
                          <div className="font-mono text-[11px] text-[#6B7280]">
                            SKU: {activeVar.sku}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {prodReviews.length > 0 && (
                    <div className="pt-8 border-t border-[#E4E6EB] space-y-4">
                      <h2 className="text-lg font-bold text-[#111315]">
                        Customer Reviews ({prodReviews.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {prodReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 rounded-xl border border-[#E4E6EB] bg-[#FAFAFA] space-y-1.5"
                          >
                            <div className="flex items-center gap-0.5 text-[#D97706]">
                              {Array.from({ length: rev.rating }).map((_, idx) => (
                                <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                            <div className="text-sm font-bold text-[#111315]">{rev.title}</div>
                            <p className="text-xs text-[#525866] leading-relaxed">{rev.comment}</p>
                            <div className="text-[11px] text-[#525866]">
                              {rev.reviewer_name} · {rev.reviewer_city}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })()
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
        ) : isNotFound ? (
          <section className="py-20 bg-white">
            <div className="max-w-lg mx-auto px-6 text-center space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-[#525866]">
                Error 404
              </div>
              <h1 className="text-3xl font-bold text-[#111315] tracking-tight">
                Page Not Found
              </h1>
              <p className="text-sm text-[#525866]">
                The page or product you requested ({normalizedPath}) could not be found.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="h-10 px-5 rounded-lg bg-[#111315] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors"
              >
                Return to Store
              </button>
            </div>
          </section>
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

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        aria-label="Search socks"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search crew, kids, no-show..."
                        className="w-full h-10 pl-9 pr-3 text-sm bg-[#F6F7F8] border border-[#E4E6EB] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D4ED8]"
                      />
                    </div>
                    <select
                      aria-label="Sort products"
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'newest'
                        )
                      }
                      className="h-10 px-3 text-xs font-medium bg-[#F6F7F8] border border-[#E4E6EB] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D4ED8]"
                    >
                      <option value="featured">Sort: Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="newest">Sort: Newest</option>
                    </select>
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
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {paginatedProducts.map((product) => (
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

                    {totalCatalogPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          disabled={catalogPage <= 1}
                          onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                          className="h-9 px-3 rounded-lg border border-[#E4E6EB] text-xs font-medium text-[#111315] hover:bg-[#F6F7F8] disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Prev</span>
                        </button>
                        <span className="px-3 text-xs font-mono text-[#525866] tabular-nums">
                          Page {catalogPage} of {totalCatalogPages}
                        </span>
                        <button
                          type="button"
                          disabled={catalogPage >= totalCatalogPages}
                          onClick={() =>
                            setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))
                          }
                          className="h-9 px-3 rounded-lg border border-[#E4E6EB] text-xs font-medium text-[#111315] hover:bg-[#F6F7F8] disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
        <div
          className={`max-w-6xl mx-auto px-6 grid grid-cols-1 gap-8 ${
            cms.footer_layout === 'compact'
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
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

          {cms.footer_layout !== 'compact' && (
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-white uppercase tracking-wider mb-2">Shop</div>
              <div className="flex flex-col gap-1.5 text-white/75">
                {footerMenuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.url)}
                    className="text-left hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {cms.footer_layout !== 'compact' && (
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
          )}

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
          onViewFullPage={(slug) => {
            setSelectedProductModal(null);
            onNavigate(`/product/${slug}`);
          }}
        />
      )}

      <CartDrawer
        open={bagOpen}
        items={cart}
        cms={cms}
        strictTrx={Boolean(bkashPlugin?.is_enabled && bkashPlugin.config?.strict_trx_length)}
        onClose={() => setBagOpen(false)}
        onUpdateQty={onUpdateCartQty}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
        onOrderSuccess={onOrderSuccess}
      />

      <OrderTrackerModal open={trackerOpen} onClose={() => setTrackerOpen(false)} />

      {/* Newsletter Popup Plugin Modal */}
      {newsletterOpen && newsletterPlugin?.is_enabled && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-popup-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E4E6EB] shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={dismissNewsletter}
              aria-label="Close newsletter popup"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full hover:bg-[#F6F7F8] flex items-center justify-center text-[#525866]"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#111315] text-white flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2
                id="newsletter-popup-title"
                className="text-xl font-bold text-[#111315] tracking-tight"
              >
                {String(
                  newsletterPlugin.config?.headline ||
                    `Get 10% Off Your First ${cms.brand_name} Pair`
                )}
              </h2>
              <p className="text-xs text-[#525866]">
                Join our dispatch list for combed cotton drops and bundle offers.
              </p>
            </div>
            {newsletterSuccessCode ? (
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1.5">
                <div className="text-xs font-semibold text-[#065F46]">
                  You are subscribed! Use promo code at checkout:
                </div>
                <div className="font-mono text-lg font-bold text-[#111315]">
                  {newsletterSuccessCode}
                </div>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  aria-label="Email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 text-sm border border-[#E4E6EB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
                {newsletterError && (
                  <p className="text-xs text-[#DC2626]">{newsletterError}</p>
                )}
                <button
                  type="submit"
                  disabled={newsletterSubmitting}
                  className="w-full h-10 rounded-lg bg-[#111315] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                >
                  {newsletterSubmitting ? 'Subscribing...' : 'Unlock Offer Code'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
