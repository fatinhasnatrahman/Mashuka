import { useState } from 'react';
import { Plus, Trash2, Check, PackageCheck } from 'lucide-react';
import type { CmsSettings, PackSelection, Product } from '../types.ts';
import { formatBDT } from '../utils/format.ts';
import { SafeImage } from './SafeImage.tsx';

interface PackBuilderSectionProps {
  products: Product[];
  cms: CmsSettings;
  onAddPackToBag: (tier: 3 | 5, selections: PackSelection[], discountedPrice: number, rawPrice: number) => void;
}

export function PackBuilderSection({ products, cms, onAddPackToBag }: PackBuilderSectionProps) {
  const eligibleProducts = products.filter(
    (p) => p.is_pack_eligible && !p.is_bundle && p.variants.some((v) => v.stock > 0)
  );

  const [tier, setTier] = useState<3 | 5>(3);
  const [selections, setSelections] = useState<PackSelection[]>([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>({});
  const [addedFlash, setAddedFlash] = useState(false);

  const discountPct = tier === 5 ? cms.pack_5_discount_pct : cms.pack_3_discount_pct;
  const rawTotal = selections.reduce((sum, s) => sum + s.unit_price, 0);
  const discountedTotal = Math.round(rawTotal * (1 - discountPct / 100));
  const savings = Math.max(0, rawTotal - discountedTotal);
  const isComplete = selections.length === tier;

  const getActiveVariant = (product: Product) => {
    const chosenId = selectedVariantByProduct[product.id];
    return (
      product.variants.find((v) => v.id === chosenId && v.stock > 0) ||
      product.variants.find((v) => v.stock > 0) ||
      product.variants[0]
    );
  };

  const handleAddPair = (product: Product) => {
    if (selections.length >= tier) return;
    const variant = getActiveVariant(product);
    if (!variant || variant.stock <= 0) return;

    const usedInPackCount = selections.filter((s) => s.variant_id === variant.id).length;
    if (usedInPackCount >= variant.stock) return;

    setSelections((prev) => [
      ...prev,
      {
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        color_name: variant.color_name,
        color_hex: variant.color_hex,
        size: variant.size,
        unit_price: variant.price_override ?? product.price,
        image_url: variant.image_url || product.image_url,
      },
    ]);
  };

  const handleRemovePair = (idx: number) => {
    setSelections((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSwitchTier = (nextTier: 3 | 5) => {
    setTier(nextTier);
    if (selections.length > nextTier) {
      setSelections((prev) => prev.slice(0, nextTier));
    }
  };

  const handleConfirmPack = () => {
    if (!isComplete) return;
    onAddPackToBag(tier, selections, discountedTotal, rawTotal);
    setSelections([]);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1800);
  };

  return (
    <section id="pack-builder" className="py-16 md:py-20 border-t border-[#E4E6EB] bg-[#F6F7F8]">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        {/* Header & Tier Toggle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="text-xs font-medium text-[#1D4ED8] uppercase tracking-wider mb-2">
              Custom Multi-Pair Builder
            </div>
            <h2 className="text-3xl font-bold text-[#111315] tracking-tight text-balance">
              Mix any {tier} pairs and save {discountPct}% automatically.
            </h2>
            <p className="mt-2 text-sm text-[#525866] leading-relaxed">
              Combine ribbed crew, breathable ankle, invisible no-show, or cushioned athletic pairs in
              one custom bundle.
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-white border border-[#E4E6EB] rounded-lg shrink-0 self-start">
            <button
              type="button"
              onClick={() => handleSwitchTier(3)}
              className={`px-4 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors ${
                tier === 3
                  ? 'bg-[#111315] text-white'
                  : 'text-[#525866] hover:text-[#111315]'
              }`}
            >
              3-Pair Pack ({cms.pack_3_discount_pct}% Off)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTier(5)}
              className={`px-4 py-2 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors ${
                tier === 5
                  ? 'bg-[#111315] text-white'
                  : 'text-[#525866] hover:text-[#111315]'
              }`}
            >
              5-Pair Pack ({cms.pack_5_discount_pct}% Off)
            </button>
          </div>
        </div>

        {/* Builder Grid: Eligible Socks Left + Live Pack Tray Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Eligible Singles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {eligibleProducts.map((product) => {
              const activeVar = getActiveVariant(product);
              const usedCount = selections.filter((s) => s.variant_id === activeVar?.id).length;
              const remainingStock = (activeVar?.stock ?? 0) - usedCount;
              const canAdd = selections.length < tier && remainingStock > 0;

              return (
                <div
                  key={product.id}
                  className="bg-white border border-[#E4E6EB] rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex gap-3.5 items-center">
                    <SafeImage
                      src={product.image_url}
                      alt={product.name}
                      fallbackTitle={product.name}
                      className="w-16 h-16 rounded-lg object-cover bg-[#F6F7F8] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#525866] uppercase tracking-wide">
                        {product.category}
                      </div>
                      <div className="text-sm font-semibold text-[#111315] truncate">
                        {product.name}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-[#111315] mt-0.5">
                        {formatBDT(activeVar?.price_override ?? product.price)}
                      </div>
                    </div>
                  </div>

                  {/* Variant Selectors */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E4E6EB]">
                    <select
                      aria-label={`Select variant for ${product.name}`}
                      value={activeVar?.id ?? ''}
                      onChange={(e) =>
                        setSelectedVariantByProduct((prev) => ({
                          ...prev,
                          [product.id]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 min-w-0 h-9 px-2.5 text-xs bg-[#F6F7F8] border border-[#E4E6EB] rounded-md focus:outline-none focus:border-[#1D4ED8]"
                    >
                      {product.variants
                        .filter((v) => v.stock > 0)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.color_name} · {v.size}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleAddPair(product)}
                      disabled={!canAdd}
                      className="h-9 px-3 rounded-md bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pack Tray Summary */}
          <div className="lg:col-span-5 bg-white border border-[#E4E6EB] rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#111315]">
                  Your {tier}-Pair Pack ({selections.length}/{tier})
                </div>
                <div className="text-xs text-[#525866]">
                  {isComplete
                    ? 'Pack complete — ready to add to bag'
                    : `Pick ${tier - selections.length} more pair${tier - selections.length > 1 ? 's' : ''}`}
                </div>
              </div>
              {selections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelections([])}
                  className="text-xs text-[#525866] hover:text-[#111315] underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Visual Slots */}
            <div className="space-y-2.5">
              {Array.from({ length: tier }).map((_, idx) => {
                const slot = selections[idx];
                if (!slot) {
                  return (
                    <div
                      key={idx}
                      className="h-12 rounded-lg border border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-3.5 flex items-center justify-between text-xs text-[#9CA3AF]"
                    >
                      <span>Pair {idx + 1}</span>
                      <span>Select from left</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="h-12 rounded-lg border border-[#E4E6EB] bg-white px-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: slot.color_hex }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#111315] truncate">{slot.name}</div>
                        <div className="text-[11px] text-[#525866] truncate">
                          {slot.color_name} · {slot.size}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePair(idx)}
                      aria-label={`Remove pair ${idx + 1}`}
                      className="text-[#9CA3AF] hover:text-[#DC2626] p-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pricing Breakdown */}
            <div className="pt-4 border-t border-[#E4E6EB] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#525866]">
                <span>Individual Pairs Value</span>
                <span className="font-mono tabular-nums">{formatBDT(rawTotal)}</span>
              </div>
              <div className="flex justify-between text-[#1D4ED8] font-medium">
                <span>Pack Discount ({discountPct}%)</span>
                <span className="font-mono tabular-nums">-{formatBDT(savings)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#111315] pt-2 border-t border-[#E4E6EB]">
                <span>Pack Price</span>
                <span className="font-mono tabular-nums">{formatBDT(discountedTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!isComplete}
              onClick={handleConfirmPack}
              className="w-full h-11 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {addedFlash ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added Pack to Bag</span>
                </>
              ) : isComplete ? (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Add Custom Pack · {formatBDT(discountedTotal)}</span>
                </>
              ) : (
                <span>Select {tier - selections.length} More Pair(s)</span>
              )}
            </button>
          </div>
        </div>

        {/* Craftsmanship Pillars (Claim-to-Proof Adjacency) */}
        <div className="pt-10 border-t border-[#E4E6EB]">
          <div className="max-w-2xl mb-8">
            <h3 className="text-2xl font-bold text-[#111315] tracking-tight">{cms.craft_heading}</h3>
            <p className="mt-2 text-sm text-[#525866] leading-relaxed">{cms.craft_subheading}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cms.craft_pillars.map((pillar, index) => (
              <div
                key={index}
                className="bg-white border border-[#E4E6EB] rounded-xl p-6 space-y-2.5"
              >
                <div className="text-xs font-mono font-semibold text-[#1D4ED8] uppercase tracking-wide">
                  0{index + 1}. {pillar.metric}
                </div>
                <div className="text-base font-bold text-[#111315]">{pillar.title}</div>
                <p className="text-sm text-[#525866] leading-relaxed">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
