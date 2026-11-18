import { useState } from 'react';
import { X, Check, Minus, Plus, ShieldCheck } from 'lucide-react';
import type { Product, ProductVariant } from '../types.ts';
import { formatBDT } from '../utils/format.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductDetailModalProps {
  product: Product;
  initialVariantId?: number;
  onClose: () => void;
  onAddToBag: (product: Product, variant: ProductVariant, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  initialVariantId,
  onClose,
  onAddToBag,
}: ProductDetailModalProps) {
  const defaultVariant =
    product.variants.find((v) => v.id === initialVariantId) ||
    product.variants.find((v) => v.stock > 0) ||
    product.variants[0];

  const [selectedVariantId, setSelectedVariantId] = useState<number>(defaultVariant?.id ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [manualImage, setManualImage] = useState<string | null>(null);

  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => [v.color_name, { color_name: v.color_name, color_hex: v.color_hex }])
    ).values()
  );

  const sizesForColor = product.variants.filter(
    (v) => v.color_name === (selectedVariant?.color_name ?? '')
  );

  const handleSelectColor = (colorName: string) => {
    const match =
      product.variants.find((v) => v.color_name === colorName && v.size === selectedVariant?.size) ||
      product.variants.find((v) => v.color_name === colorName);
    if (match) {
      setSelectedVariantId(match.id);
      setManualImage(null);
      setQuantity(1);
    }
  };

  const galleryImages = Array.from(
    new Set(
      [
        product.image_url,
        ...(product.gallery_urls || []),
        ...product.variants.map((v) => v.image_url || '').filter(Boolean),
      ].filter(Boolean)
    )
  );

  const activeImage = manualImage || selectedVariant?.image_url || product.image_url;
  const maxStock = selectedVariant?.stock ?? 0;
  const outOfStock = maxStock <= 0;
  const unitPrice = selectedVariant?.price_override ?? product.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#E4E6EB] rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 border border-[#E4E6EB] text-[#111315] hover:bg-[#F6F7F8] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Sticky Product Photography + Gallery Thumbnails */}
        <div className="bg-[#F6F7F8] flex flex-col justify-center gap-3 p-6 md:p-8 min-h-[300px]">
          <SafeImage
            src={activeImage}
            alt={product.name}
            fallbackTitle={product.name}
            className="w-full h-full max-h-[380px] object-cover rounded-lg"
          />
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setManualImage(imgUrl)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border shrink-0 transition-all ${
                    activeImage === imgUrl
                      ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25'
                      : 'border-[#E4E6EB] opacity-80 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={imgUrl}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="p-6 md:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div>
              <div className="text-xs font-medium text-[#525866] uppercase tracking-wider mb-1.5">
                {product.category === 'bundle'
                  ? `Curated Bundle · ${product.bundle_pairs} Pairs`
                  : `${product.category} Socks`}
              </div>
              <h2 className="text-2xl font-bold text-[#111315] tracking-tight">{product.name}</h2>
              <div className="mt-2.5 flex items-baseline gap-3">
                <span className="text-xl font-semibold text-[#111315] font-mono tabular-nums">
                  {formatBDT(unitPrice)}
                </span>
                {product.compare_at_price && product.compare_at_price > unitPrice && (
                  <span className="text-sm text-[#6B7280] line-through font-mono tabular-nums">
                    {formatBDT(product.compare_at_price)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-[#525866] leading-relaxed">{product.short_description}</p>

            {/* Color Swatches */}
            {uniqueColors.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-[#111315]">Color</span>
                  <span className="text-[#525866]">{selectedVariant?.color_name}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {uniqueColors.map((c) => {
                    const isSelected = c.color_name === selectedVariant?.color_name;
                    return (
                      <button
                        key={c.color_name}
                        type="button"
                        onClick={() => handleSelectColor(c.color_name)}
                        title={c.color_name}
                        aria-label={`Select color ${c.color_name}`}
                        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25 scale-105'
                            : 'border-[#D1D5DB] hover:border-[#111315]'
                        }`}
                        style={{ backgroundColor: c.color_hex }}
                      >
                        {isSelected && (
                          <Check
                            className={`w-4 h-4 ${
                              c.color_hex.toLowerCase() === '#f3f4f6' ||
                              c.color_hex.toLowerCase() === '#ffffff' ||
                              c.color_hex.toLowerCase() === '#d6c8b4' ||
                              c.color_hex.toLowerCase() === '#c8beb0'
                                ? 'text-[#111315]'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[#111315]">Size</span>
                <span className="text-[#525866] font-mono tabular-nums">
                  {outOfStock ? 'Out of stock' : `${maxStock} available · SKU ${selectedVariant?.sku}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((v) => {
                  const active = v.id === selectedVariant?.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQuantity(1);
                      }}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-[#111315] text-white border-[#111315]'
                          : v.stock === 0
                            ? 'bg-[#F6F7F8] text-[#9CA3AF] border-[#E4E6EB] line-through'
                            : 'bg-white text-[#111315] border-[#D1D5DB] hover:border-[#111315]'
                      }`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fabric Specs */}
            <div className="pt-3 border-t border-[#E4E6EB]">
              <div className="text-xs font-medium text-[#111315] mb-1">Material &amp; Construction</div>
              <div className="text-xs text-[#525866] leading-relaxed">{product.fabric_specs}</div>
            </div>
          </div>

          {/* Quantity + Add to Bag */}
          <div className="pt-4 border-t border-[#E4E6EB] space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#D1D5DB] rounded-lg h-11">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={outOfStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-full flex items-center justify-center text-[#111315] disabled:opacity-40 hover:bg-[#F6F7F8]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-mono tabular-nums font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={outOfStock || quantity >= maxStock}
                  aria-label="Increase quantity"
                  className="w-10 h-full flex items-center justify-center text-[#111315] disabled:opacity-40 hover:bg-[#F6F7F8]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock || !selectedVariant}
                onClick={() => {
                  if (selectedVariant) {
                    onAddToBag(product, selectedVariant, quantity);
                    onClose();
                  }
                }}
                className="flex-1 h-11 px-5 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {outOfStock
                  ? 'Out of Stock'
                  : `Add to Bag · ${formatBDT(unitPrice * quantity)}`}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#525866]">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Cash on Delivery &amp; bKash/Nagad across Bangladesh</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
