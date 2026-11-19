export function formatBDT(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `৳${safe.toLocaleString('en-US')}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isProductSaleActive(product: {
  price: number;
  compare_at_price?: number | null;
  sale_start?: string | null;
  sale_end?: string | null;
}, displayPrice?: number): boolean {
  const effectivePrice = displayPrice ?? product.price;
  if (!product.compare_at_price || product.compare_at_price <= effectivePrice) {
    return false;
  }
  const now = Date.now();
  if (product.sale_start) {
    const startTs = new Date(product.sale_start).getTime();
    if (!Number.isNaN(startTs) && now < startTs) return false;
  }
  if (product.sale_end) {
    const endTs = new Date(product.sale_end).getTime();
    if (!Number.isNaN(endTs) && now > endTs) return false;
  }
  return true;
}

export function isSafeInternalPath(path: string | undefined | null): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed || /[\r\n\\]/.test(trimmed)) return false;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalized.startsWith('//') || /^\/[a-zA-Z]+:/.test(normalized)) return false;
  return true;
}
