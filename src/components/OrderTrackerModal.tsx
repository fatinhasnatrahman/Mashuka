import { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { Order } from '../types.ts';
import { formatBDT, formatDateTime } from '../utils/format.ts';

interface OrderTrackerModalProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Verification',
  processing: 'Processing Order',
  confirmed: 'Confirmed',
  packed: 'Packed & Ready',
  shipped: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function OrderTrackerModal({ open, onClose }: OrderTrackerModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  if (!open) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({
        orderNumber: orderNumber.trim(),
        phone: phone.trim(),
      });
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setError(data.error || 'Could not locate order.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Track your order"
    >
      <div
        className="w-full max-w-md bg-white border border-[#E4E6EB] rounded-xl shadow-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#111315]">Track Your Order</h2>
            <p className="text-xs text-[#525866]">
              Enter your order number and phone number to view dispatch status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tracker"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#F6F7F8] text-[#525866]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleLookup} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#111315] mb-1">Order Number</label>
            <input
              required
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. MSH-1001"
              className="w-full h-10 px-3 text-sm font-mono uppercase border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#111315] mb-1">Phone Number</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full h-10 px-3 text-sm font-mono border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Checking...' : 'Check Status'}</span>
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
            {error}
          </div>
        )}

        {order && (
          <div className="p-4 rounded-xl bg-[#F6F7F8] border border-[#E4E6EB] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-[#111315]">
                {order.order_number}
              </span>
              <span className="font-semibold text-[#1D4ED8]">
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <div className="text-[#525866]">
              Placed {formatDateTime(order.created_at)} · {order.city}
            </div>
            <div className="border-t border-[#E4E6EB] pt-2 space-y-1">
              {order.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span className="text-[#111315]">
                    {it.quantity}x {it.item_name}
                  </span>
                  <span className="font-mono tabular-nums">{formatBDT(it.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E4E6EB] pt-2 flex justify-between font-bold text-[#111315]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatBDT(order.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
