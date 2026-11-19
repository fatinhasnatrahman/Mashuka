import { useCallback, useEffect, useState } from 'react';
import type {
  BlogPost,
  CartItem,
  CmsPage,
  CmsSettings,
  NavMenu,
  PackSelection,
  Product,
  ProductReview,
  ProductVariant,
  PublicPlugin,
  SeoRedirect,
} from './types.ts';
import { isSafeInternalPath } from './utils/format.ts';
import { StorefrontView } from './components/StorefrontView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

function reconcileCartWithCatalog(prevCart: CartItem[], activeProducts: Product[]): CartItem[] {
  const variantMap = new Map<number, { product: Product; variant: ProductVariant }>();
  for (const product of activeProducts) {
    for (const variant of product.variants) {
      variantMap.set(variant.id, { product, variant });
    }
  }

  return prevCart
    .map((item): CartItem | null => {
      if (item.type === 'single') {
        if (!item.variant_id) return null;
        const found = variantMap.get(item.variant_id);
        if (!found || found.variant.stock <= 0) return null;
        const unitPrice = found.variant.price_override ?? found.product.price;
        return {
          ...item,
          name: found.product.name,
          unit_price: unitPrice,
          compare_at_price: found.product.compare_at_price,
          max_stock: found.variant.stock,
          quantity: Math.min(item.quantity, found.variant.stock),
        };
      }

      const packItems = item.pack_items || [];
      if (packItems.length === 0) return null;
      const counts = new Map<number, number>();
      for (const sel of packItems) {
        counts.set(sel.variant_id, (counts.get(sel.variant_id) ?? 0) + 1);
      }
      let maxPackStock = Infinity;
      for (const [vid, neededPerPack] of counts.entries()) {
        const found = variantMap.get(vid);
        if (!found || found.variant.stock < neededPerPack) {
          return null;
        }
        maxPackStock = Math.min(maxPackStock, Math.floor(found.variant.stock / neededPerPack));
      }
      if (!Number.isFinite(maxPackStock) || maxPackStock <= 0) return null;
      return {
        ...item,
        max_stock: maxPackStock,
        quantity: Math.min(item.quantity, maxPackStock),
      };
    })
    .filter((item): item is CartItem => item !== null);
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [cms, setCms] = useState<CmsSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [menus, setMenus] = useState<NavMenu[]>([]);
  const [plugins, setPlugins] = useState<PublicPlugin[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [redirects, setRedirects] = useState<SeoRedirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('mashuka_cart_v1');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mashuka_cart_v1', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const resolveRedirectPath = useCallback(
    (targetPath: string, activeRedirects: SeoRedirect[] = redirects): string => {
      let current = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      const seen = new Set<string>();
      for (let i = 0; i < 4; i++) {
        const clean = current.replace(/\/+$/, '') || '/';
        if (seen.has(clean)) break;
        seen.add(clean);
        const match = activeRedirects.find(
          (r) => (r.from_path.replace(/\/+$/, '') || '/') === clean
        );
        if (!match || !isSafeInternalPath(match.to_path)) break;
        current = match.to_path.startsWith('/') ? match.to_path : `/${match.to_path}`;
      }
      return current;
    },
    [redirects]
  );

  const navigate = (targetPath: string) => {
    if (!isSafeInternalPath(targetPath)) return;
    const resolved = resolveRedirectPath(targetPath);
    if (window.location.pathname !== resolved) {
      window.history.pushState({}, '', resolved);
    }
    setCurrentPath(resolved);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Failed to load storefront data.');
      const data = await res.json();
      const loadedProducts: Product[] = data.products || [];
      setCms(data.cms);
      setProducts(loadedProducts);
      setPages(data.pages || []);
      setPosts(data.posts || []);
      setMenus(data.menus || []);
      setPlugins(data.plugins || []);
      setReviews(data.reviews || []);
      setCart((prev) => reconcileCartWithCatalog(prev, loadedProducts));
      const nextRedirects: SeoRedirect[] = data.redirects || [];
      setRedirects(nextRedirects);
      const initialResolved = resolveRedirectPath(window.location.pathname || '/', nextRedirects);
      if (initialResolved !== (window.location.pathname || '/')) {
        window.history.replaceState({}, '', initialResolved);
        setCurrentPath(initialResolved);
      }
      setLoadError('');
    } catch {
      setLoadError('Unable to load store catalog. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [resolveRedirectPath]);

  useEffect(() => {
    fetchStorefront();
  }, [fetchStorefront]);

  const handleAddSingleToCart = (
    product: Product,
    variant: ProductVariant,
    quantity: number
  ) => {
    const key = `single_${variant.id}`;
    const unitPrice = variant.price_override ?? product.price;
    setCart((prev) => {
      const existing = prev.find((i) => i.cart_key === key);
      if (existing) {
        return prev.map((i) =>
          i.cart_key === key
            ? {
                ...i,
                unit_price: unitPrice,
                max_stock: variant.stock,
                quantity: Math.min(variant.stock, i.quantity + quantity),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          cart_key: key,
          type: 'single',
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          variant_label: `${variant.color_name} · ${variant.size}`,
          image_url: variant.image_url || product.image_url,
          unit_price: unitPrice,
          compare_at_price: product.compare_at_price,
          quantity: Math.min(variant.stock, quantity),
          max_stock: variant.stock,
        },
      ];
    });
  };

  const handleAddPackToCart = (
    tier: 3 | 5,
    selections: PackSelection[],
    discountedPrice: number,
    rawPrice: number
  ) => {
    const counts = new Map<number, number>();
    for (const sel of selections) {
      counts.set(sel.variant_id, (counts.get(sel.variant_id) ?? 0) + 1);
    }
    let maxPackStock = Infinity;
    for (const [vid, needed] of counts.entries()) {
      const variant = products.flatMap((p) => p.variants).find((v) => v.id === vid);
      if (variant) {
        maxPackStock = Math.min(maxPackStock, Math.floor(variant.stock / needed));
      }
    }
    const safeMaxStock = Number.isFinite(maxPackStock) && maxPackStock > 0 ? maxPackStock : 1;

    const key = `pack_${tier}_${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        cart_key: key,
        type: 'custom_pack',
        name: `Custom ${tier}-Pair Essential Pack`,
        variant_label: `${tier} Mixed Pairs`,
        image_url:
          selections[0]?.image_url || '/src/assets/images/sock_bundle_box_1795008503521.jpg',
        unit_price: discountedPrice,
        compare_at_price: rawPrice,
        quantity: 1,
        max_stock: safeMaxStock,
        pack_tier: tier,
        pack_items: selections,
      },
    ]);
  };

  const handleUpdateCartQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cart_key !== cartKey) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return { ...item, quantity: Math.min(item.max_stock, nextQty) };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const handleRemoveCartItem = (cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cart_key !== cartKey));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sm text-[#525866]">
        Loading Mashuka...
      </div>
    );
  }

  if (loadError || !cms) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center space-y-3">
        <div className="text-base font-semibold text-[#111315]">
          {loadError || 'Store unavailable'}
        </div>
        <button
          type="button"
          onClick={fetchStorefront}
          className="px-4 py-2 rounded-lg bg-[#111315] text-white text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (currentPath.startsWith('/admin')) {
    return (
      <AdminDashboard
        onBackToStore={(path = '/') => navigate(path)}
        onStoreDataChanged={fetchStorefront}
      />
    );
  }

  return (
    <StorefrontView
      currentPath={currentPath}
      cms={cms}
      products={products}
      pages={pages}
      posts={posts}
      menus={menus}
      plugins={plugins}
      reviews={reviews}
      cart={cart}
      onNavigate={navigate}
      onAddSingleToCart={handleAddSingleToCart}
      onAddPackToCart={handleAddPackToCart}
      onUpdateCartQty={handleUpdateCartQty}
      onRemoveCartItem={handleRemoveCartItem}
      onClearCart={() => setCart([])}
      onOrderSuccess={() => {
        fetchStorefront();
      }}
    />
  );
}
