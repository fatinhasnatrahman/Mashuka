import { useEffect, useState } from 'react';
import { X, Minus, Plus, Trash2, CheckCircle2, ArrowLeft, Tag } from 'lucide-react';
import type { CartItem, CmsSettings, DeliveryZone, Order, PaymentMethod } from '../types.ts';
import { formatBDT } from '../utils/format.ts';
import { SafeImage } from './SafeImage.tsx';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  cms: CmsSettings;
  onClose: () => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onClearCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export function CartDrawer({
  open,
  items,
  cms,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderSuccess,
}: CartDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    free_shipping?: boolean;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>('dhaka');
  const [city, setCity] = useState('Dhaka');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    cms.cod_enabled ? 'cod' : cms.mobile_banking_enabled ? 'bkash' : 'cod'
  );
  const [walletSender, setWalletSender] = useState('');
  const [walletTrxId, setWalletTrxId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (paymentMethod === 'cod' && !cms.cod_enabled && cms.mobile_banking_enabled) {
      setPaymentMethod('bkash');
    } else if (paymentMethod !== 'cod' && !cms.mobile_banking_enabled && cms.cod_enabled) {
      setPaymentMethod('cod');
    }
  }, [cms.cod_enabled, cms.mobile_banking_enabled, paymentMethod]);

  if (!open) return null;

  const noPaymentMethods = !cms.cod_enabled && !cms.mobile_banking_enabled;
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discountAmount = appliedPromo ? Math.min(subtotal, appliedPromo.discount) : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = cms.tax_rate_pct > 0 ? Math.round((afterDiscount * cms.tax_rate_pct) / 100) : 0;
  const baseShipping =
    deliveryZone === 'dhaka' ? cms.dhaka_shipping_fee : cms.outside_dhaka_shipping_fee;
  const qualifiesFreeShipping =
    Boolean(appliedPromo?.free_shipping) ||
    (cms.free_shipping_threshold > 0 && afterDiscount >= cms.free_shipping_threshold);
  const shippingFee = items.length === 0 ? 0 : qualifiesFreeShipping ? 0 : baseShipping;
  const total = afterDiscount + taxAmount + shippingFee;
  const remainingForFree = Math.max(0, cms.free_shipping_threshold - afterDiscount);

  const handleApplyPromo = async () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || 'Invalid promo code.');
        setAppliedPromo(null);
      } else {
        setAppliedPromo({
          code: data.code,
          discount: data.discount_amount || 0,
          free_shipping: Boolean(data.free_shipping),
        });
        setPromoError('');
      }
    } catch {
      setPromoError('Could not validate promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_zone: deliveryZone,
        city: deliveryZone === 'dhaka' ? city || 'Dhaka' : city,
        address,
        notes,
        payment_method: paymentMethod,
        wallet_sender: paymentMethod === 'cod' ? undefined : walletSender,
        wallet_trx_id: paymentMethod === 'cod' ? undefined : walletTrxId,
        promo_code: appliedPromo?.code,
        items: items.map((item) =>
          item.type === 'custom_pack'
            ? {
                type: 'custom_pack',
                quantity: item.quantity,
                pack_tier: item.pack_tier,
                pack_items: (item.pack_items || []).map((pi) => ({
                  product_id: pi.product_id,
                  variant_id: pi.variant_id,
                })),
              }
            : {
                type: 'single',
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
              }
        ),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Failed to place order. Please review your details.');
      } else {
        setConfirmedOrder(data.order);
        onOrderSuccess(data.order);
        onClearCart();
        setAppliedPromo(null);
        setPromoInput('');
        setStep('confirmed');
      }
    } catch {
      setCheckoutError('Network error while submitting order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'confirmed') {
      setStep('bag');
      setConfirmedOrder(null);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag and checkout"
    >
      <div
        className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#E4E6EB] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('bag')}
                aria-label="Back to bag"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F6F7F8] text-[#111315]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold text-[#111315]">
              {step === 'bag' && `Your Bag (${items.reduce((s, i) => s + i.quantity, 0)})`}
              {step === 'checkout' && 'Delivery & Payment'}
              {step === 'confirmed' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close bag"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#F6F7F8] text-[#525866]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6 py-4">
              <div className="p-5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
                <div className="flex items-center gap-2 text-[#16A34A] font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Order {confirmedOrder.order_number} Confirmed</span>
                </div>
                <p className="text-xs text-[#166534] leading-relaxed">
                  Thank you, {confirmedOrder.customer_name}. Your order is queued for dispatch to{' '}
                  {confirmedOrder.address}, {confirmedOrder.city}. Save your order number{' '}
                  <span className="font-mono font-semibold">{confirmedOrder.order_number}</span> to
                  track shipment status anytime.
                </p>
              </div>

              <div className="border border-[#E4E6EB] rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between text-xs text-[#525866]">
                  <span>Payment Method</span>
                  <span className="font-medium text-[#111315] uppercase">
                    {confirmedOrder.payment_method === 'cod'
                      ? 'Cash on Delivery'
                      : `${confirmedOrder.payment_method} (${confirmedOrder.wallet_trx_id})`}
                  </span>
                </div>
                <div className="border-t border-[#E4E6EB] pt-3 space-y-2">
                  {confirmedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <div className="pr-4">
                        <div className="font-medium text-[#111315]">
                          {item.quantity}x {item.item_name}
                        </div>
                        <div className="text-[#525866]">{item.variant_label}</div>
                      </div>
                      <span className="font-mono tabular-nums font-medium text-[#111315]">
                        {formatBDT(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#E4E6EB] pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#525866]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatBDT(confirmedOrder.subtotal)}</span>
                  </div>
                  {confirmedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-[#16A34A]">
                      <span>Promo ({confirmedOrder.promo_code})</span>
                      <span className="font-mono tabular-nums">
                        -{formatBDT(confirmedOrder.discount_amount)}
                      </span>
                    </div>
                  )}
                  {(confirmedOrder.tax_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-[#525866]">
                      <span>VAT / Tax</span>
                      <span className="font-mono tabular-nums">
                        {formatBDT(confirmedOrder.tax_amount ?? 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#525866]">
                    <span>Shipping</span>
                    <span className="font-mono tabular-nums">
                      {confirmedOrder.shipping_fee === 0 ? 'Free' : formatBDT(confirmedOrder.shipping_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#111315] pt-1.5 border-t border-[#E4E6EB]">
                    <span>Total Paid / Due</span>
                    <span className="font-mono tabular-nums">{formatBDT(confirmedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3">
              <div className="text-base font-semibold text-[#111315]">Your shopping bag is empty</div>
              <p className="text-sm text-[#525866] max-w-xs">
                Browse combed-cotton crew, ankle, and no-show pairs or build a custom discounted pack.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-5 py-2.5 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                Browse Socks
              </button>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-5">
              {/* Free shipping meter */}
              {cms.free_shipping_threshold > 0 && (
                <div className="p-3.5 rounded-lg bg-[#F6F7F8] border border-[#E4E6EB]">
                  <div className="text-xs font-medium text-[#111315] mb-2">
                    {remainingForFree === 0
                      ? 'You unlocked Free Delivery across Bangladesh.'
                      : `Add ${formatBDT(remainingForFree)} more for Free Delivery.`}
                  </div>
                  <div className="h-1.5 bg-[#E4E6EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D4ED8] transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((afterDiscount / cms.free_shipping_threshold) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="divide-y divide-[#E4E6EB]">
                {items.map((item) => (
                  <div key={item.cart_key} className="py-4 flex gap-4">
                    <SafeImage
                      src={item.image_url}
                      alt={item.name}
                      fallbackTitle={item.name}
                      className="w-20 h-20 object-cover rounded-lg bg-[#F6F7F8] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-[#111315] leading-snug">
                            {item.name}
                          </div>
                          <div className="text-xs text-[#525866] mt-0.5">{item.variant_label}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.cart_key)}
                          aria-label={`Remove ${item.name}`}
                          className="text-[#9CA3AF] hover:text-[#DC2626] p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.type === 'custom_pack' && item.pack_items && (
                        <ul className="mt-2 space-y-0.5 text-[11px] text-[#525866]">
                          {item.pack_items.map((pi, idx) => (
                            <li key={idx}>
                              {idx + 1}. {pi.name} ({pi.color_name} · {pi.size})
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-[#D1D5DB] rounded-md h-8">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.cart_key, -1)}
                            aria-label="Decrease item quantity"
                            className="w-7 h-full flex items-center justify-center hover:bg-[#F6F7F8]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-mono tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.cart_key, 1)}
                            disabled={item.quantity >= item.max_stock}
                            aria-label="Increase item quantity"
                            className="w-7 h-full flex items-center justify-center hover:bg-[#F6F7F8] disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-sm font-semibold font-mono tabular-nums text-[#111315]">
                          {formatBDT(item.unit_price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="pt-2 border-t border-[#E4E6EB]">
                <label className="block text-xs font-medium text-[#111315] mb-1.5">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      className="w-full h-10 pl-8 pr-3 text-xs uppercase font-mono border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 h-10 rounded-lg border border-[#111315] text-xs font-medium text-[#111315] hover:bg-[#111315] hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {promoLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="mt-1.5 text-xs text-[#DC2626]">{promoError}</p>}
                {appliedPromo && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#16A34A]">
                    <span>
                      Code <span className="font-mono font-semibold">{appliedPromo.code}</span> applied
                      {appliedPromo.free_shipping
                        ? ' (Free Shipping)'
                        : ` (-${formatBDT(discountAmount)})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedPromo(null)}
                      className="underline text-[#525866]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
              {checkoutError && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {checkoutError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tahmid Rahman"
                    className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">
                    Mobile Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full h-10 px-3 text-sm font-mono border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1.5">
                  Delivery Zone
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryZone('dhaka');
                      setCity('Dhaka');
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      deliveryZone === 'dhaka'
                        ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                        : 'border-[#E4E6EB] hover:border-[#111315]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#111315]">Inside Dhaka</div>
                    <div className="text-xs text-[#525866] font-mono tabular-nums mt-0.5">
                      {qualifiesFreeShipping ? 'Free' : formatBDT(cms.dhaka_shipping_fee)} · 24-48h
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryZone('outside');
                      if (city === 'Dhaka') setCity('');
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      deliveryZone === 'outside'
                        ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                        : 'border-[#E4E6EB] hover:border-[#111315]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#111315]">Outside Dhaka</div>
                    <div className="text-xs text-[#525866] font-mono tabular-nums mt-0.5">
                      {qualifiesFreeShipping ? 'Free' : formatBDT(cms.outside_dhaka_shipping_fee)} · 2-4
                      days
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">District / City</label>
                  <input
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Dhaka / Chattogram"
                    className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#111315] mb-1">
                    Full Street Address
                  </label>
                  <input
                    required
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Road, Block / Area"
                    className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Call before arriving, gate instructions, etc."
                  className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              {/* Payment Method */}
              <div className="pt-2 border-t border-[#E4E6EB] space-y-3">
                <label className="block text-xs font-medium text-[#111315]">Payment Method</label>
                {noPaymentMethods ? (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                    Checkout is temporarily paused — enable COD or bKash/Nagad in Store Configuration.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ...(cms.cod_enabled ? [{ id: 'cod' as const, label: 'Cash on Delivery' }] : []),
                        ...(cms.mobile_banking_enabled
                          ? [
                              { id: 'bkash' as const, label: 'bKash' },
                              { id: 'nagad' as const, label: 'Nagad' },
                            ]
                          : []),
                      ]
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                          paymentMethod === pm.id
                            ? 'bg-[#111315] text-white border-[#111315]'
                            : 'bg-white text-[#111315] border-[#D1D5DB] hover:border-[#111315]'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                )}

                {paymentMethod !== 'cod' && (
                  <div className="p-4 rounded-lg bg-[#F6F7F8] border border-[#E4E6EB] space-y-3">
                    <div className="text-xs text-[#111315] leading-relaxed">
                      <span className="font-semibold uppercase">{paymentMethod}:</span>{' '}
                      {paymentMethod === 'bkash' ? cms.bkash_instructions : cms.nagad_instructions}
                    </div>
                    <div className="text-xs font-mono font-semibold text-[#1D4ED8]">
                      Account: {paymentMethod === 'bkash' ? cms.bkash_number : cms.nagad_number} · Amount:{' '}
                      {formatBDT(total)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[#111315] mb-1">
                          Sender Mobile Number
                        </label>
                        <input
                          required
                          type="tel"
                          value={walletSender}
                          onChange={(e) => setWalletSender(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-[#D1D5DB] rounded-md focus:outline-none focus:border-[#1D4ED8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#111315] mb-1">
                          Transaction ID (TrxID)
                        </label>
                        <input
                          required
                          type="text"
                          value={walletTrxId}
                          onChange={(e) => setWalletTrxId(e.target.value)}
                          placeholder="e.g. BKH9X4M2Q1"
                          className="w-full h-9 px-2.5 text-xs font-mono uppercase bg-white border border-[#D1D5DB] rounded-md focus:outline-none focus:border-[#1D4ED8]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Totals */}
        {step !== 'confirmed' && items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E4E6EB] bg-[#FAFAFA] space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#525866]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatBDT(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#16A34A]">
                  <span>Discount ({appliedPromo?.code})</span>
                  <span className="font-mono tabular-nums">-{formatBDT(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-[#525866]">
                  <span>VAT / Tax ({cms.tax_rate_pct}%)</span>
                  <span className="font-mono tabular-nums">{formatBDT(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#525866]">
                <span>
                  Delivery ({deliveryZone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
                </span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0 ? 'Free' : formatBDT(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#111315] pt-1.5 border-t border-[#E4E6EB]">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatBDT(total)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full h-11 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                Proceed to Checkout · {formatBDT(total)}
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting || noPaymentMethods}
                className="w-full h-11 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Confirming Order...' : `Place Order · ${formatBDT(total)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
