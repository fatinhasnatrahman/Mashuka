import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Printer,
  Upload,
  Check,
  Tag,
  PackageCheck,
  AlertTriangle,
  Minus,
  ExternalLink,
} from 'lucide-react';
import type {
  CmsSettings,
  CustomerRecord,
  Order,
  OrderStatus,
  Product,
  ProductAudience,
  ProductCategory,
  ProductStatus,
  ProductType,
  PromoCode,
} from '../../types.ts';
import type { AdminContextHelpers } from './types.ts';
import { formatBDT, formatDateTime } from '../../utils/format.ts';
import { SafeImage } from '../SafeImage.tsx';
import { DataTable, type DataTableColumn } from './ui/DataTable.tsx';
import { Modal, SlideOverDrawer } from './ui/Modal.tsx';
import { SeoPanel } from './ui/SeoPanel.tsx';

const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/60 dark:text-[#FCD34D]',
  processing: 'bg-[#E0F2FE] text-[#075985] dark:bg-[#082F49]/60 dark:text-[#7DD3FC]',
  confirmed: 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A]/50 dark:text-[#93C5FD]',
  packed: 'bg-[#E0E7FF] text-[#3730A3] dark:bg-[#312E81]/50 dark:text-[#C7D2FE]',
  shipped: 'bg-[#F3E8FF] text-[#6B21A8] dark:bg-[#4C1D95]/50 dark:text-[#D8B4FE]',
  delivered: 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]',
  cancelled: 'bg-[#FEE2E2] text-[#991B1B] dark:bg-[#7F1D1D]/50 dark:text-[#FCA5A5]',
  refunded: 'bg-[#F3F4F6] text-[#374151] dark:bg-[#27272A] dark:text-[#D4D4D8]',
};

function parseOrderPackLabels(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string');
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.labels)) {
      return parsed.labels.filter((v: unknown): v is string => typeof v === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

// ==========================================
// 1. PRODUCT EDITOR MODAL + PRODUCTS VIEW
// ==========================================

interface ProductDraftVariant {
  id?: number;
  sku: string;
  color_name: string;
  color_hex: string;
  size: string;
  material: string;
  price_override: string;
  stock: string;
  image_url: string;
}

interface ProductEditorModalProps {
  open: boolean;
  product: Product | null;
  ctx: AdminContextHelpers;
  onClose: () => void;
}

export function ProductEditorModal({ open, product, ctx, onClose }: ProductEditorModalProps) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [editorTab, setEditorTab] = useState<'general' | 'variants' | 'seo'>('general');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [productType, setProductType] = useState<ProductType>(product?.product_type || 'variable');
  const [status, setStatus] = useState<ProductStatus>(product?.status || 'active');
  const [category, setCategory] = useState<ProductCategory>(product?.category || 'crew');
  const [audience, setAudience] = useState<ProductAudience>(product?.audience || 'unisex');
  const [displayPages, setDisplayPages] = useState<string[]>(
    product?.display_pages?.length ? product.display_pages : ['home', 'socks']
  );
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 10));
  const [shortDesc, setShortDesc] = useState(product?.short_description || '');
  const [fabricSpecs, setFabricSpecs] = useState(
    product?.fabric_specs || '85% Combed Cotton, 13% Nylon, 2% Spandex'
  );
  const [price, setPrice] = useState(String(product?.price ?? 220));
  const [compareAt, setCompareAt] = useState(
    product?.compare_at_price ? String(product.compare_at_price) : ''
  );
  const [costPrice, setCostPrice] = useState(
    product ? (product.cost_price != null ? String(product.cost_price) : '') : '95'
  );
  const [saleStart, setSaleStart] = useState(product?.sale_start || '');
  const [saleEnd, setSaleEnd] = useState(product?.sale_end || '');
  const [tagsInput, setTagsInput] = useState((product?.tags || []).join(', '));
  const [imageUrl, setImageUrl] = useState(
    product?.image_url || '/src/assets/images/sock_crew_ribbed_1795008504482.jpg'
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    product?.gallery_urls?.length
      ? product.gallery_urls
      : [product?.image_url || '/src/assets/images/sock_crew_ribbed_1795008504482.jpg']
  );
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? true);
  const [isBundle, setIsBundle] = useState(product?.is_bundle ?? false);
  const [bundlePairs, setBundlePairs] = useState(String(product?.bundle_pairs ?? 1));
  const [isPackEligible, setIsPackEligible] = useState(product?.is_pack_eligible ?? true);
  const [focusKeyword, setFocusKeyword] = useState(product?.focus_keyword || '');
  const [seoTitle, setSeoTitle] = useState(product?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(product?.seo_description || '');

  const [variants, setVariants] = useState<ProductDraftVariant[]>(() =>
    product?.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          color_name: v.color_name,
          color_hex: v.color_hex,
          size: v.size,
          material: v.material || 'Combed Cotton',
          price_override: v.price_override ? String(v.price_override) : '',
          stock: String(v.stock),
          image_url: v.image_url || '',
        }))
      : [
          {
            sku: `MSH-${Date.now().toString().slice(-4)}-1`,
            color_name: 'Obsidian Black',
            color_hex: '#141416',
            size: 'UK 6-9',
            material: 'Combed Cotton',
            price_override: '',
            stock: '40',
            image_url: '',
          },
        ]
  );

  const placementOptions = useMemo(() => {
    const core = [
      { key: 'home', label: 'Home Page (Featured)' },
      { key: 'men', label: 'Men' },
      { key: 'women', label: 'Women' },
      { key: 'kids-baby', label: 'Kids & Baby' },
      { key: 'socks', label: 'All Socks' },
    ];
    const customPages = data.pages
      .filter((p) => p.show_products)
      .map((p) => ({ key: p.slug, label: p.title }));
    return [...core, ...customPages];
  }, [data.pages]);

  const numericPrice = Math.max(0, Number(price) || 0);
  const hasCostPrice = costPrice.trim() !== '';
  const numericCost = hasCostPrice ? Math.max(0, Number(costPrice) || 0) : 0;
  const marginBDT = numericPrice - numericCost;
  const marginPct = numericPrice > 0 ? Math.round((marginBDT / numericPrice) * 100) : 0;

  const togglePlacement = (key: string) => {
    setDisplayPages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleUploadImage = async (file: File, addToGallery = false) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      if (addToGallery) {
        setGalleryUrls((prev) => [...prev, json.url]);
      } else {
        setImageUrl(json.url);
        if (!galleryUrls.includes(json.url)) {
          setGalleryUrls((prev) => [json.url, ...prev]);
        }
      }
      toast('Image uploaded successfully');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('Product name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        product_type: productType,
        status,
        category,
        audience,
        display_pages: displayPages.length ? displayPages : ['home', 'socks'],
        sort_order: Number(sortOrder) || 0,
        short_description: shortDesc.trim(),
        fabric_specs: fabricSpecs.trim(),
        price: Number(price) || 190,
        compare_at_price: compareAt.trim() ? Number(compareAt) : null,
        cost_price: costPrice.trim() ? Number(costPrice) : null,
        sale_start: saleStart || null,
        sale_end: saleEnd || null,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        gallery_urls: galleryUrls.length ? galleryUrls : [imageUrl],
        image_url: imageUrl,
        is_featured: isFeatured,
        is_bundle: isBundle,
        bundle_pairs: Math.max(1, Number(bundlePairs) || 1),
        is_pack_eligible: isPackEligible,
        is_active: status === 'active',
        focus_keyword: focusKeyword.trim(),
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        variants: variants.map((v, i) => ({
          id: v.id,
          sku: v.sku.trim() || `MSH-${Date.now().toString().slice(-3)}-${i + 1}`,
          color_name: v.color_name.trim() || 'Black',
          color_hex: v.color_hex || '#141416',
          size: v.size.trim() || 'UK 6-9',
          material: v.material.trim() || 'Combed Cotton',
          price_override: v.price_override.trim() ? Number(v.price_override) : null,
          stock: Math.max(0, Number(v.stock) || 0),
          image_url: v.image_url.trim() || null,
        })),
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save product.');
      toast(product ? 'Product updated.' : 'Product created.');
      await reload();
      notifyStoreChanged();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to save product.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? `Edit Product — ${product.name}` : 'Create New Product'}
      subtitle="Configure pricing, COGS margin, page placement, SKU variants, and search SEO."
      size="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : product ? 'Update Product' : 'Publish Product'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117] w-fit">
          {[
            { id: 'general' as const, label: 'General & Pricing' },
            { id: 'variants' as const, label: `Variants & SKUs (${variants.length})` },
            { id: 'seo' as const, label: 'Search SEO' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setEditorTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                editorTab === t.id
                  ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                  : 'text-[#525866] dark:text-[#9CA3AF]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {editorTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Product Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Executive Ribbed Crew"
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                      Type
                    </span>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value as ProductType)}
                      className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                    >
                      <option value="variable">Variable</option>
                      <option value="simple">Simple</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                      Status
                    </span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ProductStatus)}
                      className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Category
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  >
                    <option value="crew">Crew</option>
                    <option value="ankle">Ankle</option>
                    <option value="no-show">No-Show</option>
                    <option value="sports">Sports</option>
                    <option value="kids">Kids</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Audience
                  </span>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as ProductAudience)}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  >
                    <option value="unisex">Unisex</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids-baby">Kids &amp; Baby</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Sort Order
                  </span>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Bundle Pairs
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={bundlePairs}
                    onChange={(e) => setBundlePairs(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  />
                </label>
              </div>

              {/* Pricing + COGS Margin */}
              <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#0E1117] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111315] dark:text-white">
                    Pricing &amp; Margin Calculator
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#16A34A] dark:text-[#4ADE80]">
                    {hasCostPrice
                      ? `Profit: ${formatBDT(marginBDT)} (${marginPct}% margin)`
                      : 'Enter COGS to calculate margin'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Selling Price (৳)
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-[#111315] dark:text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Compare-At / Regular (৳)
                    </span>
                    <input
                      type="number"
                      value={compareAt}
                      onChange={(e) => setCompareAt(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-[#111315] dark:text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Cost of Goods (COGS ৳)
                    </span>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-[#111315] dark:text-white"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Sale Schedule Start
                    </span>
                    <input
                      type="date"
                      value={saleStart}
                      onChange={(e) => setSaleStart(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-[#111315] dark:text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Sale Schedule End
                    </span>
                    <input
                      type="date"
                      value={saleEnd}
                      onChange={(e) => setSaleEnd(e.target.value)}
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-[#111315] dark:text-white"
                    />
                  </label>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Short Description
                </span>
                <textarea
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full p-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Yarn &amp; Fabric Specs
                  </span>
                  <input
                    type="text"
                    value={fabricSpecs}
                    onChange={(e) => setFabricSpecs(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Tags (comma separated)
                  </span>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="combed-cotton, bestseller, gift-box"
                    className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  />
                </label>
              </div>
            </div>

            {/* Right Sidebar: Media Gallery & Page Placement */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-3">
                <div className="text-xs font-bold text-[#111315] dark:text-white">
                  Primary Image &amp; Gallery
                </div>
                <SafeImage
                  src={imageUrl}
                  alt={name || 'Product preview'}
                  className="w-full h-40 object-cover rounded-lg border border-[#E4E6EB] dark:border-[#2C3344]"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 h-8 px-2 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white"
                  >
                    {data.media
                      .filter((m) => m.media_type === 'image')
                      .map((m) => (
                        <option key={m.url} value={m.url}>
                          {m.title || m.name}
                        </option>
                      ))}
                  </select>
                  <label className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium inline-flex items-center gap-1 cursor-pointer hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? '...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(f, false);
                      }}
                    />
                  </label>
                </div>

                {/* Gallery Thumbnails */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#525866] dark:text-[#9CA3AF]">
                    <span>Gallery ({galleryUrls.length})</span>
                    <label className="text-[#2563EB] cursor-pointer hover:underline">
                      + Add Gallery Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadImage(f, true);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {galleryUrls.map((g, idx) => (
                      <div key={`${g}-${idx}`} className="relative group">
                        <SafeImage
                          src={g}
                          alt={`Gallery ${idx + 1}`}
                          className="w-12 h-12 rounded-md object-cover border border-[#E4E6EB] dark:border-[#2C3344]"
                        />
                        {galleryUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[10px] hidden group-hover:flex items-center justify-center"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Multi-Page Placement */}
              <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-2.5">
                <div className="text-xs font-bold text-[#111315] dark:text-white">
                  Show On Storefront Pages
                </div>
                <div className="space-y-1.5">
                  {placementOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 text-xs text-[#374151] dark:text-[#D1D5DB] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={displayPages.includes(opt.key)}
                        onChange={() => togglePlacement(opt.key)}
                        className="rounded border-[#D1D5DB]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span>Featured on Homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBundle}
                    onChange={(e) => setIsBundle(e.target.checked)}
                  />
                  <span>Multi-Pair Gift Bundle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPackEligible}
                    onChange={(e) => setIsPackEligible(e.target.checked)}
                  />
                  <span>Eligible in 3/5-Pair Pack Builder</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {editorTab === 'variants' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
                Manage individual color, size, material, SKU, price overrides, and stock quantities.
              </p>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      sku: `MSH-${Date.now().toString().slice(-4)}-${prev.length + 1}`,
                      color_name: 'Navy',
                      color_hex: '#1E3A8A',
                      size: 'UK 6-9',
                      material: 'Combed Cotton',
                      price_override: '',
                      stock: '25',
                      image_url: '',
                    },
                  ])
                }
                className="h-8 px-3 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant SKU</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end"
                >
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      SKU
                    </span>
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, sku: e.target.value } : row))
                        )
                      }
                      className="w-full h-8 px-2 text-xs font-mono rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Color
                    </span>
                    <input
                      type="text"
                      value={v.color_name}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, color_name: e.target.value } : row
                          )
                        )
                      }
                      className="w-full h-8 px-2 text-xs rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Swatch
                    </span>
                    <input
                      type="color"
                      value={v.color_hex}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, color_hex: e.target.value } : row
                          )
                        )
                      }
                      className="w-full h-8 p-0.5 rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Size
                    </span>
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, size: e.target.value } : row))
                        )
                      }
                      className="w-full h-8 px-2 text-xs rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Material
                    </span>
                    <input
                      type="text"
                      value={v.material}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, material: e.target.value } : row
                          )
                        )
                      }
                      className="w-full h-8 px-2 text-xs rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Override ৳
                    </span>
                    <input
                      type="number"
                      value={v.price_override}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, price_override: e.target.value } : row
                          )
                        )
                      }
                      placeholder="Base"
                      className="w-full h-8 px-2 text-xs font-mono rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                      Stock
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, stock: e.target.value } : row))
                        )
                      }
                      className="w-full h-8 px-2 text-xs font-mono rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={variants.length <= 1}
                      onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-8 px-2.5 rounded border border-[#FECACA] text-[#DC2626] disabled:opacity-40 hover:bg-[#FEF2F2] dark:hover:bg-[#2A1519]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editorTab === 'seo' && (
          <SeoPanel
            title={name}
            slug={slug}
            focusKeyword={focusKeyword}
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            contentText={`${shortDesc}\n${fabricSpecs}`}
            basePath="/product"
            onChange={(patch) => {
              if (patch.slug !== undefined) setSlug(patch.slug);
              if (patch.focus_keyword !== undefined) setFocusKeyword(patch.focus_keyword);
              if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
              if (patch.seo_description !== undefined) setSeoDescription(patch.seo_description);
            }}
          />
        )}
      </div>
    </Modal>
  );
}

export function ProductsView({
  ctx,
  triggerCreate,
  onClearTrigger,
}: {
  ctx: AdminContextHelpers;
  triggerCreate?: boolean;
  onClearTrigger?: () => void;
}) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [editing, setEditing] = useState<Product | null | undefined>(
    triggerCreate ? null : undefined
  );

  useEffect(() => {
    if (triggerCreate) {
      setEditing(null);
    }
  }, [triggerCreate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.products.filter((p) => {
      const okStatus = statusFilter === 'all' || p.status === statusFilter;
      const okQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q));
      return okStatus && okQuery;
    });
  }, [data.products, search, statusFilter]);

  const handleBulk = async (rows: Product[], action: 'activate' | 'draft' | 'delete') => {
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ids: rows.map((r) => r.id), action }),
      });
      if (!res.ok) throw new Error('Bulk action failed');
      toast(`Applied ${action} to ${rows.length} product(s).`);
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bulk action failed', 'error');
    }
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <SafeImage
            src={p.image_url}
            alt={p.name}
            className="w-10 h-10 rounded-lg object-cover border border-[#E4E6EB] dark:border-[#2C3344] shrink-0"
          />
          <div className="min-w-0">
            <div className="font-semibold text-[#111315] dark:text-white truncate">{p.name}</div>
            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              {p.product_type} · {p.category} · {p.display_pages.join(', ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price / Margin',
      align: 'right',
      sortValue: (p) => p.price,
      render: (p) => {
        const margin = p.cost_price ? p.price - p.cost_price : null;
        return (
          <div className="font-mono tabular-nums">
            <div className="font-semibold text-[#111315] dark:text-white">{formatBDT(p.price)}</div>
            {margin !== null && (
              <div className="text-[11px] text-[#16A34A] dark:text-[#4ADE80]">
                +{formatBDT(margin)} margin
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      sortValue: (p) => p.variants.reduce((a, v) => a + v.stock, 0),
      render: (p) => {
        const total = p.variants.reduce((a, v) => a + v.stock, 0);
        return (
          <div className="font-mono tabular-nums">
            <span className={total <= 15 ? 'text-[#D97706] font-semibold' : ''}>{total} pairs</span>
            <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              {p.variants.length} SKUs
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      render: (p) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
            p.status === 'active'
              ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
              : p.status === 'draft'
              ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D]'
              : 'bg-[#F3F4F6] text-[#374151] dark:bg-[#27272A] dark:text-[#D4D4D8]'
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setEditing(p)}
            aria-label="Edit product"
            className="p-1.5 rounded-md border border-[#E4E6EB] dark:border-[#2C3344] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
            title="Edit product"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete product"
            onClick={async () => {
              try {
                const res = await fetch(`/api/admin/products/${p.id}`, {
                  method: 'DELETE',
                  headers: authHeaders(),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || 'Failed to delete product.');
                toast('Product deleted.');
                await reload();
                notifyStoreChanged();
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Unable to delete product.', 'error');
              }
            }}
            className="p-1.5 rounded-md border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1519]"
            title="Delete product"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Products &amp; Catalog Manager
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Assign products to Home, Men, Women, Kids &amp; Baby, All Socks, or custom WordPress pages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product</span>
        </button>
      </div>

      <DataTable
        rows={filtered}
        getRowId={(p) => p.id}
        columns={columns}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search product name, category, or SKU..."
        onRowClick={(p) => setEditing(p)}
        filterSlot={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {(['all', 'active', 'draft', 'archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${
                  statusFilter === st
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
        bulkActions={[
          { label: 'Activate', onClick: (rows) => handleBulk(rows, 'activate') },
          { label: 'Move to Draft', onClick: (rows) => handleBulk(rows, 'draft') },
          { label: 'Delete', variant: 'danger', onClick: (rows) => handleBulk(rows, 'delete') },
        ]}
      />

      {editing !== undefined && (
        <ProductEditorModal
          key={editing ? `edit-${editing.id}` : 'new'}
          open={true}
          product={editing}
          ctx={ctx}
          onClose={() => {
            setEditing(undefined);
            onClearTrigger?.();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// 2. INVENTORY & STOCK CONTROL VIEW
// ==========================================

export function InventoryView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const threshold = data.cms.low_stock_threshold || 12;

  const flatRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list: Array<{
      id: number;
      sku: string;
      productName: string;
      imageUrl: string;
      colorName: string;
      colorHex: string;
      size: string;
      stock: number;
    }> = [];
    for (const p of data.products) {
      for (const v of p.variants) {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'low' && v.stock > 0 && v.stock <= threshold) ||
          (filter === 'out' && v.stock === 0);
        const matchesQ =
          !q ||
          p.name.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          v.color_name.toLowerCase().includes(q);
        if (matchesFilter && matchesQ) {
          list.push({
            id: v.id,
            sku: v.sku,
            productName: p.name,
            imageUrl: v.image_url || p.image_url,
            colorName: v.color_name,
            colorHex: v.color_hex,
            size: v.size,
            stock: v.stock,
          });
        }
      }
    }
    return list;
  }, [data.products, filter, search, threshold]);

  const adjustStock = async (variantId: number, nextStock: number) => {
    const clamped = Math.max(0, Math.round(nextStock));
    try {
      const res = await fetch(`/api/admin/variants/${variantId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ stock: clamped }),
      });
      if (!res.ok) throw new Error('Failed to update stock');
      await reload();
      notifyStoreChanged();
      toast(`Stock updated to ${clamped}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Stock update failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[#111315] dark:text-white">
          Inventory &amp; Stock Control
        </h1>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
          Inline SKU stock adjustments. Low-stock alert threshold is set to{' '}
          <span className="font-mono font-semibold">{threshold}</span> pairs.
        </p>
      </div>

      <DataTable
        rows={flatRows}
        getRowId={(r) => r.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search SKU, product, or color..."
        filterSlot={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {[
              { id: 'all' as const, label: 'All SKUs' },
              { id: 'low' as const, label: 'Low Stock' },
              { id: 'out' as const, label: 'Out of Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  filter === tab.id
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
        columns={[
          {
            key: 'sku',
            header: 'SKU',
            sortValue: (r) => r.sku,
            render: (r) => <span className="font-mono text-xs font-semibold">{r.sku}</span>,
          },
          {
            key: 'product',
            header: 'Product & Variant',
            sortValue: (r) => r.productName,
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <SafeImage
                  src={r.imageUrl}
                  alt={r.productName}
                  className="w-8 h-8 rounded object-cover border border-[#E4E6EB] dark:border-[#2C3344]"
                />
                <div>
                  <div className="font-semibold text-[#111315] dark:text-white">{r.productName}</div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/15"
                      style={{ backgroundColor: r.colorHex }}
                    />
                    <span>
                      {r.colorName} · {r.size}
                    </span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'health',
            header: 'Health',
            sortValue: (r) => r.stock,
            render: (r) =>
              r.stock === 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B] dark:bg-[#7F1D1D]/50 dark:text-[#FCA5A5] text-[11px] font-semibold">
                  Out of Stock
                </span>
              ) : r.stock <= threshold ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D] text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3" /> Low Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC] text-[11px] font-semibold">
                  In Stock
                </span>
              ),
          },
          {
            key: 'adjust',
            header: 'Quick Adjust',
            align: 'right',
            render: (r) => (
              <div className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <button
                  type="button"
                  onClick={() => adjustStock(r.id, r.stock - 5)}
                  className="h-7 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustStock(r.id, r.stock - 1)}
                  className="h-7 w-7 rounded border border-[#E4E6EB] dark:border-[#2C3344] inline-flex items-center justify-center hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-10 text-center font-bold">{r.stock}</span>
                <button
                  type="button"
                  onClick={() => adjustStock(r.id, r.stock + 1)}
                  className="h-7 w-7 rounded border border-[#E4E6EB] dark:border-[#2C3344] inline-flex items-center justify-center hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustStock(r.id, r.stock + 10)}
                  className="h-7 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                >
                  +10
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// ==========================================
// 3. ORDER MANAGEMENT & INVOICE VIEW
// ==========================================

export function OrdersView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [search, setSearch] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editPayStatus, setEditPayStatus] = useState<'paid' | 'pending' | 'refunded'>('pending');
  const [editTracking, setEditTracking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const openDrawer = (ord: Order) => {
    setActiveOrder(ord);
    setEditStatus(ord.status);
    setEditPayStatus(ord.payment_status || 'pending');
    setEditTracking(ord.tracking_number || '');
    setEditNotes(ord.internal_notes || '');
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.orders.filter((o) => {
      const okStatus = statusFilter === 'all' || o.status === statusFilter;
      const okQ =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        (o.wallet_trx_id || '').toLowerCase().includes(q);
      return okStatus && okQ;
    });
  }, [data.orders, statusFilter, search]);

  const handleSaveOrder = async () => {
    if (!activeOrder) return;
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          status: editStatus,
          payment_status: editPayStatus,
          tracking_number: editTracking.trim() || null,
          internal_notes: editNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update order');
      toast(`Order ${activeOrder.order_number} updated.`);
      setActiveOrder(json.order);
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Order Management System
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Verify bKash/Nagad TrxIDs, update fulfillment tracking, add internal notes, and print invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await reload();
            toast('Orders synced with storefront.');
          }}
          className="h-9 px-3.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-xs font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
        >
          Refresh Orders
        </button>
      </div>

      <DataTable
        rows={filteredOrders}
        getRowId={(o) => o.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search order #, customer, phone, TrxID..."
        onRowClick={openDrawer}
        filterSlot={
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {(
              [
                'all',
                'pending',
                'processing',
                'confirmed',
                'packed',
                'shipped',
                'delivered',
                'cancelled',
                'refunded',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded text-[11px] font-medium capitalize ${
                  statusFilter === st
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
        columns={[
          {
            key: 'order_number',
            header: 'Order #',
            sortValue: (o) => o.order_number,
            render: (o) => (
              <div>
                <div className="font-mono font-bold text-[#111315] dark:text-white">
                  {o.order_number}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono">
                  {formatDateTime(o.created_at)}
                </div>
              </div>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            sortValue: (o) => o.customer_name,
            render: (o) => (
              <div>
                <div className="font-semibold text-[#111315] dark:text-white">
                  {o.customer_name}
                </div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono">
                  {o.customer_phone} · {o.city}
                </div>
              </div>
            ),
          },
          {
            key: 'payment',
            header: 'Payment',
            render: (o) => (
              <div>
                <div className="font-semibold uppercase text-[11px]">{o.payment_method}</div>
                {o.wallet_trx_id ? (
                  <div className="text-[11px] font-mono text-[#1D4ED8] dark:text-[#60A5FA]">
                    Trx: {o.wallet_trx_id}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                    {o.payment_status || 'pending'}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'total',
            header: 'Total',
            align: 'right',
            sortValue: (o) => o.total,
            render: (o) => (
              <span className="font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                {formatBDT(o.total)}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            sortValue: (o) => o.status,
            render: (o) => (
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${ORDER_STATUS_STYLE[o.status]}`}
              >
                {o.status}
              </span>
            ),
          },
        ]}
      />

      {/* Order Detail Drawer */}
      <SlideOverDrawer
        open={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        title={activeOrder ? `Order ${activeOrder.order_number}` : ''}
        subtitle={
          activeOrder
            ? `${activeOrder.customer_name} · ${formatDateTime(activeOrder.created_at)}`
            : ''
        }
        width="lg"
        footer={
          activeOrder && (
            <>
              <button
                type="button"
                onClick={() => setInvoiceOrder(activeOrder)}
                className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Printable Invoice</span>
              </button>
              <button
                type="button"
                disabled={savingOrder}
                onClick={handleSaveOrder}
                className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {savingOrder ? 'Saving...' : 'Save Order Update'}
              </button>
            </>
          )
        }
      >
        {activeOrder && (
          <div className="space-y-5 text-xs">
            {/* Shipping & Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#0E1117]">
              <div className="space-y-1">
                <div className="font-bold text-[#111315] dark:text-white">Shipping Address</div>
                <div>{activeOrder.customer_name}</div>
                <div className="font-mono">{activeOrder.customer_phone}</div>
                <div className="text-[#525866] dark:text-[#9CA3AF]">
                  {activeOrder.address}, {activeOrder.city}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#111315] dark:text-white">Payment Summary</div>
                <div className="uppercase font-semibold">{activeOrder.payment_method}</div>
                {activeOrder.wallet_sender && (
                  <div className="font-mono">Sender: {activeOrder.wallet_sender}</div>
                )}
                {activeOrder.wallet_trx_id && (
                  <div className="font-mono text-[#1D4ED8] dark:text-[#60A5FA]">
                    TrxID: {activeOrder.wallet_trx_id}
                  </div>
                )}
                {activeOrder.notes && (
                  <div className="text-[#525866] dark:text-[#9CA3AF] pt-1">
                    Note: {activeOrder.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Fulfillment Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">Order Status</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  {(
                    [
                      'pending',
                      'processing',
                      'confirmed',
                      'packed',
                      'shipped',
                      'delivered',
                      'cancelled',
                      'refunded',
                    ] as OrderStatus[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Payment Status
                </span>
                <select
                  value={editPayStatus}
                  onChange={(e) =>
                    setEditPayStatus(e.target.value as 'paid' | 'pending' | 'refunded')
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">
                Courier Tracking Number (Steadfast / Pathao / RedX)
              </span>
              <input
                type="text"
                value={editTracking}
                onChange={(e) => setEditTracking(e.target.value)}
                placeholder="e.g. SF-BD-894120"
                className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">
                Internal Admin Notes
              </span>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Private team notes on TrxID verification or courier instructions..."
                className="w-full p-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>

            {/* Line Items */}
            <div className="rounded-xl border border-[#E4E6EB] dark:border-[#252A36] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#F9FAFB] dark:bg-[#10131A] border-b border-[#E4E6EB] dark:border-[#252A36] font-bold">
                Itemized Pairs
              </div>
              <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
                {activeOrder.items.map((item) => {
                  const packLabels = parseOrderPackLabels(item.pack_details);
                  return (
                    <div key={item.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#111315] dark:text-white">
                          {item.item_name}
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          {item.variant_label} × {item.quantity}
                        </div>
                        {packLabels.length > 0 && (
                          <div className="mt-1 text-[11px] text-[#525866] dark:text-[#9CA3AF] space-y-0.5">
                            {packLabels.map((lbl, idx) => (
                              <div key={idx}>• {lbl}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="font-mono font-semibold tabular-nums">
                        {formatBDT(item.line_total)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-[#F9FAFB] dark:bg-[#10131A] border-t border-[#E4E6EB] dark:border-[#252A36] space-y-1 font-mono tabular-nums">
                <div className="flex justify-between text-[#525866] dark:text-[#9CA3AF]">
                  <span>Subtotal</span>
                  <span>{formatBDT(activeOrder.subtotal)}</span>
                </div>
                {activeOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-[#16A34A]">
                    <span>Discount ({activeOrder.promo_code})</span>
                    <span>-{formatBDT(activeOrder.discount_amount)}</span>
                  </div>
                )}
                {(activeOrder.tax_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-[#525866] dark:text-[#9CA3AF]">
                    <span>Tax / VAT</span>
                    <span>{formatBDT(activeOrder.tax_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#525866] dark:text-[#9CA3AF]">
                  <span>Shipping</span>
                  <span>{formatBDT(activeOrder.shipping_fee)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#111315] dark:text-white pt-1 border-t border-[#E4E6EB] dark:border-[#252A36]">
                  <span>Total</span>
                  <span>{formatBDT(activeOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Printable Invoice Modal */}
      <Modal
        open={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
        title={`Tax & Order Invoice — ${invoiceOrder?.order_number || ''}`}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setInvoiceOrder(null)}
              className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium no-print"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5 no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </>
        }
      >
        {invoiceOrder && (
          <div className="space-y-6 text-xs bg-white text-[#111315] p-4 rounded-lg">
            <div className="flex items-start justify-between border-b border-[#E4E6EB] pb-4">
              <div>
                <div className="text-lg font-extrabold">{data.cms.brand_name}</div>
                <div className="text-[#525866]">{data.cms.brand_slogan}</div>
                <div className="text-[#525866] mt-1">{data.cms.store_address}</div>
                <div className="text-[#525866] font-mono">
                  {data.cms.support_email} · {data.cms.support_whatsapp}
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-sm font-bold">INVOICE #{invoiceOrder.order_number}</div>
                <div className="text-[#525866]">{formatDateTime(invoiceOrder.created_at)}</div>
                <div className="mt-1 uppercase font-semibold">
                  Payment: {invoiceOrder.payment_method}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-bold uppercase text-[10px] text-[#525866]">Billed &amp; Shipped To</div>
                <div className="font-semibold mt-1">{invoiceOrder.customer_name}</div>
                <div className="font-mono">{invoiceOrder.customer_phone}</div>
                <div>
                  {invoiceOrder.address}, {invoiceOrder.city}
                </div>
              </div>
              {invoiceOrder.tracking_number && (
                <div className="text-right">
                  <div className="font-bold uppercase text-[10px] text-[#525866]">Tracking ID</div>
                  <div className="font-mono font-bold mt-1">{invoiceOrder.tracking_number}</div>
                </div>
              )}
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E4E6EB] text-left text-[11px] uppercase text-[#525866]">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EB]">
                {invoiceOrder.items.map((it) => {
                  const packLabels = parseOrderPackLabels(it.pack_details);
                  return (
                    <tr key={it.id}>
                      <td className="py-2">
                        <div className="font-semibold">{it.item_name}</div>
                        <div className="text-[11px] text-[#525866]">{it.variant_label}</div>
                        {packLabels.length > 0 && (
                          <div className="mt-0.5 text-[10px] text-[#6B7280]">
                            {packLabels.join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">{it.quantity}</td>
                      <td className="py-2 text-right font-mono">{formatBDT(it.unit_price)}</td>
                      <td className="py-2 text-right font-mono font-semibold">
                        {formatBDT(it.line_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-[#E4E6EB] pt-3 space-y-1 font-mono text-right">
              <div>Subtotal: {formatBDT(invoiceOrder.subtotal)}</div>
              {invoiceOrder.discount_amount > 0 && (
                <div>Discount: -{formatBDT(invoiceOrder.discount_amount)}</div>
              )}
              {(invoiceOrder.tax_amount ?? 0) > 0 && (
                <div>Tax / VAT: {formatBDT(invoiceOrder.tax_amount ?? 0)}</div>
              )}
              <div>Shipping: {formatBDT(invoiceOrder.shipping_fee)}</div>
              <div className="text-sm font-bold">Grand Total: {formatBDT(invoiceOrder.total)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==========================================
// 4. CUSTOMERS & CRM VIEW
// ==========================================

export function CustomersView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, toast } = ctx;
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.customers.filter((c) => {
      const okTag = tagFilter === 'all' || c.tags.includes(tagFilter);
      const okQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      return okTag && okQ;
    });
  }, [data.customers, search, tagFilter]);

  const toggleCustomerTag = async (customer: CustomerRecord, tag: string) => {
    const nextTags = customer.tags.includes(tag)
      ? customer.tags.filter((t) => t !== tag)
      : [...customer.tags, tag];
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(customer.phone)}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ tags: nextTags }),
      });
      if (!res.ok) throw new Error('Failed to update tags');
      setSelectedCustomer({ ...customer, tags: nextTags });
      await reload();
      toast('Customer CRM tags updated.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update tags', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[#111315] dark:text-white">
          Customers &amp; CRM Directory
        </h1>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
          Lifetime Value (LTV), order count, segmentation tags, and full purchase history.
        </p>
      </div>

      <DataTable
        rows={filtered}
        getRowId={(c) => c.phone}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customer name, phone, or city..."
        onRowClick={(c) => setSelectedCustomer(c)}
        filterSlot={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {['all', 'VIP', 'Repeat Buyer', 'Subscriber'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  tagFilter === t
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {t === 'all' ? 'All Customers' : t}
              </button>
            ))}
          </div>
        }
        columns={[
          {
            key: 'name',
            header: 'Customer',
            sortValue: (c) => c.name,
            render: (c) => (
              <div>
                <div className="font-semibold text-[#111315] dark:text-white">{c.name}</div>
                <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                  {c.phone} · {c.city}
                </div>
              </div>
            ),
          },
          {
            key: 'tags',
            header: 'Segment Tags',
            render: (c) => (
              <span className="text-xs text-[#525866] dark:text-[#9CA3AF]">
                {c.tags.length > 0 ? c.tags.join(' · ') : 'Standard'}
              </span>
            ),
          },
          {
            key: 'orders',
            header: 'Orders',
            align: 'right',
            sortValue: (c) => c.total_orders,
            render: (c) => <span className="font-mono tabular-nums">{c.total_orders}</span>,
          },
          {
            key: 'ltv',
            header: 'Lifetime Value',
            align: 'right',
            sortValue: (c) => c.ltv,
            render: (c) => (
              <span className="font-mono font-bold tabular-nums text-[#111315] dark:text-white">
                {formatBDT(c.ltv)}
              </span>
            ),
          },
          {
            key: 'last_active',
            header: 'Last Active',
            align: 'right',
            sortValue: (c) => c.last_active,
            render: (c) => (
              <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {formatDateTime(c.last_active)}
              </span>
            ),
          },
        ]}
      />

      <SlideOverDrawer
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || 'Customer Profile'}
        subtitle={
          selectedCustomer
            ? `${selectedCustomer.phone} · ${selectedCustomer.city} · LTV ${formatBDT(selectedCustomer.ltv)}`
            : ''
        }
      >
        {selectedCustomer && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-2.5">
              <div className="font-bold text-[#111315] dark:text-white">CRM Segment Tags</div>
              <div className="flex flex-wrap gap-2">
                {['VIP', 'Repeat Buyer', 'Subscriber', 'Wholesale'].map((tag) => {
                  const active = selectedCustomer.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleCustomerTag(selectedCustomer, tag)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#111315] dark:bg-[#2563EB] text-white border-transparent'
                          : 'border-[#E4E6EB] dark:border-[#2C3344] text-[#374151] dark:text-[#D1D5DB]'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-[#111315] dark:text-white">
                Order History ({selectedCustomer.orders.length})
              </div>
              <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36] rounded-xl border border-[#E4E6EB] dark:border-[#252A36] overflow-hidden">
                {selectedCustomer.orders.map((ord) => (
                  <div key={ord.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono font-bold text-[#111315] dark:text-white">
                        {ord.order_number}
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        {formatDateTime(ord.created_at)} · {ord.payment_method.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">{formatBDT(ord.total)}</div>
                      <div className="text-[11px] capitalize text-[#525866] dark:text-[#9CA3AF]">
                        {ord.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}

// ==========================================
// 5. MARKETING, COUPONS & HERO BANNER VIEW
// ==========================================

export function MarketingView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, currentUser, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const canEditCms = currentUser.role === 'Super Admin';
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | 'free_shipping'>('percent');
  const [discountValue, setDiscountValue] = useState('15');
  const [minSubtotal, setMinSubtotal] = useState('500');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [heroDraft, setHeroDraft] = useState({
    announcement_text: data.cms.announcement_text,
    hero_kicker: data.cms.hero_kicker,
    hero_title: data.cms.hero_title,
    hero_subtitle: data.cms.hero_subtitle,
    hero_cta_label: data.cms.hero_cta_label,
    hero_image_url: data.cms.hero_image_url,
  });
  const [savingHero, setSavingHero] = useState(false);

  useEffect(() => {
    setHeroDraft({
      announcement_text: data.cms.announcement_text,
      hero_kicker: data.cms.hero_kicker,
      hero_title: data.cms.hero_title,
      hero_subtitle: data.cms.hero_subtitle,
      hero_cta_label: data.cms.hero_cta_label,
      hero_image_url: data.cms.hero_image_url,
    });
  }, [data.cms]);

  const handleHeroImageUpload = async (file?: File) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      await fetch('/api/admin/media/meta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          url: json.url,
          title: `${data.cms.brand_name} Hero Banner`,
          alt_text: heroDraft.hero_title || 'Hero banner image',
          caption: '',
        }),
      }).catch(() => {});
      setHeroDraft((prev) => ({ ...prev, hero_image_url: json.url }));
      toast('Hero image uploaded and selected.');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
  };

  const handleCreatePromo = async () => {
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          code,
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          min_subtotal: Number(minSubtotal) || 0,
          usage_limit: usageLimit.trim() ? Number(usageLimit) : null,
          expires_at: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create coupon');
      setCode('');
      setUsageLimit('');
      setExpiresAt('');
      toast(`Coupon ${json.promo.code} created.`);
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Coupon error', 'error');
    }
  };

  const handleSaveHero = async () => {
    if (!canEditCms) {
      toast('Super Admin role required to update storefront banner settings.', 'error');
      return;
    }
    setSavingHero(true);
    try {
      const nextCms: CmsSettings = { ...data.cms, ...heroDraft };
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cms: nextCms }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save banner');
      toast('Homepage Hero & Announcement Bar updated.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSavingHero(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[#111315] dark:text-white">
          Marketing, Coupons &amp; Hero Banner
        </h1>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
          Create percentage, fixed BDT, or free-shipping coupons and edit your storefront hero campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coupon Builder & List */}
        <div className="xl:col-span-7 space-y-4">
          <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
            <div className="text-sm font-bold text-[#111315] dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#2563EB]" />
              <span>Create Discount Coupon</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Coupon Code
                </span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EID20"
                  className="w-full h-9 px-3 text-xs font-mono uppercase rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Discount Type
                </span>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as 'percent' | 'fixed' | 'free_shipping')
                  }
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Cart (৳)</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Value {discountType === 'percent' ? '(%)' : '(৳)'}
                </span>
                <input
                  type="number"
                  disabled={discountType === 'free_shipping'}
                  value={discountType === 'free_shipping' ? '0' : discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-50"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Min Spend (৳)
                </span>
                <input
                  type="number"
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Usage Limit
                </span>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF]">
                  Expires On
                </span>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreatePromo}
              className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Coupon</span>
            </button>
          </div>

          <DataTable
            rows={data.promos}
            getRowId={(p) => p.id}
            columns={[
              {
                key: 'code',
                header: 'Code',
                sortValue: (p) => p.code,
                render: (p) => <span className="font-mono font-bold">{p.code}</span>,
              },
              {
                key: 'rule',
                header: 'Rule',
                render: (p) => (
                  <span className="text-xs">
                    {p.discount_type === 'free_shipping'
                      ? 'Free Shipping'
                      : p.discount_type === 'percent'
                      ? `${p.discount_value}% off`
                      : `${formatBDT(p.discount_value)} off`}{' '}
                    · Min {formatBDT(p.min_subtotal)}
                  </span>
                ),
              },
              {
                key: 'usage',
                header: 'Uses',
                align: 'right',
                render: (p) => (
                  <span className="font-mono tabular-nums">
                    {p.usage_count}
                    {p.usage_limit ? ` / ${p.usage_limit}` : ''}
                  </span>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                render: (p) => (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/promos/${p.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ is_active: !p.is_active }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to update coupon');
                        await reload();
                        notifyStoreChanged();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Update failed', 'error');
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      p.is_active
                        ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                        : 'bg-[#F3F4F6] text-[#525866] dark:bg-[#27272A] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Paused'}
                  </button>
                ),
              },
              {
                key: 'del',
                header: '',
                align: 'right',
                render: (p: PromoCode) => (
                  <button
                    type="button"
                    aria-label="Delete coupon"
                    title="Delete coupon"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/promos/${p.id}`, {
                          method: 'DELETE',
                          headers: authHeaders(),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to delete coupon');
                        toast('Coupon removed.');
                        await reload();
                        notifyStoreChanged();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Delete failed', 'error');
                      }
                    }}
                    className="p-1 text-[#DC2626] hover:opacity-80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ),
              },
            ]}
          />
        </div>

        {/* Hero Banner & Announcement Bar */}
        <div className="xl:col-span-5 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4 h-fit">
          <div className="text-sm font-bold text-[#111315] dark:text-white">
            Homepage Hero &amp; Announcement Bar
          </div>
          {!canEditCms && (
            <div className="p-2.5 rounded-lg border border-[#FDE68A] bg-[#FEF3C7]/60 dark:border-[#78350F] dark:bg-[#451A03]/30 text-[11px] text-[#92400E] dark:text-[#FCD34D]">
              Read-only: Super Admin permissions are required to modify Homepage Hero &amp; Announcement Bar settings.
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
              Announcement Strip Text
            </span>
            <input
              type="text"
              disabled={!canEditCms}
              value={heroDraft.announcement_text}
              onChange={(e) => setHeroDraft({ ...heroDraft, announcement_text: e.target.value })}
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
              Hero Headline
            </span>
            <input
              type="text"
              disabled={!canEditCms}
              value={heroDraft.hero_title}
              onChange={(e) => setHeroDraft({ ...heroDraft, hero_title: e.target.value })}
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
              Hero Subtitle
            </span>
            <textarea
              rows={2}
              disabled={!canEditCms}
              value={heroDraft.hero_subtitle}
              onChange={(e) => setHeroDraft({ ...heroDraft, hero_subtitle: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-60"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                CTA Button Label
              </span>
              <input
                type="text"
                disabled={!canEditCms}
                value={heroDraft.hero_cta_label}
                onChange={(e) => setHeroDraft({ ...heroDraft, hero_cta_label: e.target.value })}
                className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-60"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
                Hero Image Asset
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  disabled={!canEditCms}
                  value={heroDraft.hero_image_url}
                  onChange={(e) => setHeroDraft({ ...heroDraft, hero_image_url: e.target.value })}
                  className="flex-1 min-w-0 h-9 px-2 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] disabled:opacity-60"
                >
                  {data.media
                    .filter((m) => m.media_type === 'image')
                    .map((m) => (
                      <option key={m.url} value={m.url}>
                        {m.title || m.name}
                      </option>
                    ))}
                </select>
                <label className={`h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] hover:bg-[#F3F4F6] text-xs font-medium inline-flex items-center gap-1 shrink-0 ${canEditCms ? 'cursor-pointer' : 'opacity-50 pointer-events-none'}`}>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!canEditCms}
                    className="hidden"
                    onChange={(e) => handleHeroImageUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            </label>
          </div>
          <SafeImage
            src={heroDraft.hero_image_url}
            alt="Hero preview"
            className="w-full h-36 object-cover rounded-lg border border-[#E4E6EB] dark:border-[#2C3344]"
          />
          <button
            type="button"
            disabled={savingHero || !canEditCms}
            onClick={handleSaveHero}
            className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold disabled:opacity-50"
          >
            {savingHero ? 'Saving...' : 'Publish Hero Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. STORE CONFIGURATION VIEW
// ==========================================

export function StoreConfigView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [draft, setDraft] = useState<CmsSettings>(data.cms);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(data.cms);
  }, [data.cms]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cms: draft }),
      });
      if (!res.ok) throw new Error('Failed to save store configuration');
      toast('Store payment, shipping, and tax settings saved.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Store Configuration
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Payment gateways, Bangladesh shipping zones, tax rates, and bundle discounts.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Payment Gateways */}
      <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
        <div className="text-sm font-bold text-[#111315] dark:text-white">Payment Gateways</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { key: 'cod_enabled' as const, label: 'Cash on Delivery (COD)', supported: true },
            { key: 'mobile_banking_enabled' as const, label: 'bKash & Nagad', supported: true },
            { key: 'stripe_enabled' as const, label: 'Stripe Card Checkout', supported: false },
            { key: 'paypal_enabled' as const, label: 'PayPal Express', supported: false },
          ].map((gw) => (
            <label
              key={gw.key}
              className={`p-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] flex items-center justify-between gap-2 ${
                gw.supported ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="font-medium">{gw.label}</div>
                {!gw.supported && (
                  <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                    Not integrated yet
                  </div>
                )}
              </div>
              <input
                type="checkbox"
                disabled={!gw.supported}
                checked={gw.supported ? draft[gw.key] : false}
                onChange={(e) => setDraft({ ...draft, [gw.key]: e.target.checked })}
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium">bKash Merchant / Personal Number</span>
            <input
              type="text"
              value={draft.bkash_number}
              onChange={(e) => setDraft({ ...draft, bkash_number: e.target.value })}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Nagad Merchant / Personal Number</span>
            <input
              type="text"
              value={draft.nagad_number}
              onChange={(e) => setDraft({ ...draft, nagad_number: e.target.value })}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
        </div>
      </div>

      {/* Shipping Zones & Tax */}
      <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
        <div className="text-sm font-bold text-[#111315] dark:text-white">
          Shipping Zones, Tax &amp; Pack Rules
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium">Inside Dhaka Shipping (৳)</span>
            <input
              type="number"
              value={draft.dhaka_shipping_fee}
              onChange={(e) =>
                setDraft({ ...draft, dhaka_shipping_fee: Number(e.target.value) || 0 })
              }
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Outside Dhaka Shipping (৳)</span>
            <input
              type="number"
              value={draft.outside_dhaka_shipping_fee}
              onChange={(e) =>
                setDraft({ ...draft, outside_dhaka_shipping_fee: Number(e.target.value) || 0 })
              }
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Free Shipping Threshold (৳)</span>
            <input
              type="number"
              value={draft.free_shipping_threshold}
              onChange={(e) =>
                setDraft({ ...draft, free_shipping_threshold: Number(e.target.value) || 0 })
              }
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Tax Rate (%)</span>
            <input
              type="number"
              step="0.5"
              value={draft.tax_rate_pct}
              onChange={(e) => setDraft({ ...draft, tax_rate_pct: Number(e.target.value) || 0 })}
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">Low-Stock Alert Threshold</span>
            <input
              type="number"
              value={draft.low_stock_threshold}
              onChange={(e) =>
                setDraft({ ...draft, low_stock_threshold: Number(e.target.value) || 5 })
              }
              className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium">3-Pair / 5-Pair Pack Discount (%)</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={draft.pack_3_discount_pct}
                onChange={(e) =>
                  setDraft({ ...draft, pack_3_discount_pct: Number(e.target.value) || 0 })
                }
                className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
              <input
                type="number"
                value={draft.pack_5_discount_pct}
                onChange={(e) =>
                  setDraft({ ...draft, pack_5_discount_pct: Number(e.target.value) || 0 })
                }
                className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
