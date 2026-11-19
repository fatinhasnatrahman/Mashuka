import type { Product, ProductVariant } from '../types.ts';
import { formatBDT, isProductSaleActive } from '../utils/format.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductCardProps {
  product: Product;
  selectedVariantId?: number;
  onSelectVariant: (productId: number, variantId: number) => void;
  onOpenDetail: (product: Product, variantId?: number) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
}

export function ProductCard({
  product,
  selectedVariantId,
  onSelectVariant,
  onOpenDetail,
  onQuickAdd,
}: ProductCardProps) {
  const activeVar =
    product.variants.find((v) => v.id === selectedVariantId) ||
    product.variants.find((v) => v.stock > 0) ||
    product.variants[0];

  const uniqueColors = Array.from(
    new Map(
      product.variants.map((v) => [
        v.color_name,
        { id: v.id, color_name: v.color_name, color_hex: v.color_hex },
      ])
    ).values()
  );

  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const outOfStock = !activeVar || activeVar.stock <= 0;
  const displayPrice = activeVar?.price_override ?? product.price;

  return (
    <article className="group bg-white border border-[#E4E6EB] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpenDetail(product, activeVar?.id)}
        className="aspect-[4/3] w-full bg-[#F6F7F8] overflow-hidden text-left"
      >
        <SafeImage
          src={activeVar?.image_url || product.image_url}
          alt={product.name}
          fallbackTitle={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </button>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#525866]">
            <span className="uppercase tracking-wide font-medium">
              {product.category === 'bundle'
                ? `${product.bundle_pairs}-Pair Bundle`
                : product.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{product.audience.replace('-', ' & ')}</span>
            <span aria-hidden="true">·</span>
            <span>{totalStock > 0 ? 'In Stock' : 'Sold Out'}</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail(product, activeVar?.id)}
            className="text-left block w-full"
          >
            <h3 className="text-base font-semibold text-[#111315] group-hover:text-[#1D4ED8] transition-colors">
              {product.name}
            </h3>
          </button>

          <p className="text-xs text-[#525866] line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#E4E6EB]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {uniqueColors.map((c) => {
                const isSel = c.color_name === activeVar?.color_name;
                return (
                  <button
                    key={c.color_name}
                    type="button"
                    title={c.color_name}
                    aria-label={`Select ${c.color_name}`}
                    onClick={() => onSelectVariant(product.id, c.id)}
                    className={`w-5 h-5 rounded-full border transition-transform ${
                      isSel
                        ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25 scale-110'
                        : 'border-[#D1D5DB]'
                    }`}
                    style={{ backgroundColor: c.color_hex }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] text-[#525866] truncate">{activeVar?.color_name}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-[#111315] font-mono tabular-nums">
                {formatBDT(displayPrice)}
              </span>
              {isProductSaleActive(product, displayPrice) && (
                <span className="text-xs text-[#9CA3AF] line-through font-mono tabular-nums">
                  {formatBDT(product.compare_at_price!)}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={() => activeVar && onQuickAdd(product, activeVar)}
              className="px-3.5 py-2 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {outOfStock ? 'Sold Out' : 'Quick Add'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
