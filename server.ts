import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  authenticateAdminUser,
  db,
  getAdminPasswordHash,
  getApiKeys,
  getAuditLogs,
  getBlogPosts,
  getCmsPages,
  getCmsSettings,
  getContactMessages,
  getCustomersDirectory,
  getMediaLibrary,
  getMenus,
  getOrCreateSessionSecret,
  getOrders,
  getPlugins,
  getProducts,
  getPromos,
  getRbacUsers,
  getRedirects,
  getReturnRequests,
  getReviews,
  hashPassword,
  initDatabase,
  logAudit,
  setAdminPassword,
  setRbacUserPassword,
  updateCmsSettings,
  verifyPassword,
  verifySessionUserPassword,
} from './server/db.ts';
import type {
  AdminDashboardMetrics,
  AdminSessionUser,
  BlogPostStatus,
  CmsMenuLocation,
  CmsPageTemplate,
  DeliveryZone,
  NavMenuItem,
  Order,
  OrderStatus,
  PaymentMethod,
  ProductAudience,
  ProductCategory,
  ProductStatus,
  ProductType,
  RbacRole,
  ReturnStatus,
} from './src/types.ts';

initDatabase();

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET?.trim() || getOrCreateSessionSecret();

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_UPLOAD_MIME: Record<string, string[]> = {
  '.jpg': ['image/jpeg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/pjpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.pdf': ['application/pdf'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = Object.prototype.hasOwnProperty.call(ALLOWED_UPLOAD_MIME, ext) ? ext : '.jpg';
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 32);
    cb(null, `${base || 'media'}-${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ALLOWED_UPLOAD_MIME[ext];
    if (!allowedMimes || !allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(new Error('Unsupported file type. Allowed formats: JPG, PNG, WEBP, MP4, PDF.'));
      return;
    }
    cb(null, true);
  },
});

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

interface AdminTokenPayload {
  role: 'admin';
  user_id: number | null;
  name: string;
  email: string;
  rbac_role: RbacRole;
  exp: number;
}

interface AuthenticatedRequest extends Request {
  adminUser?: AdminSessionUser;
}

function signSessionToken(payload: AdminTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined): AdminSessionUser | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<AdminTokenPayload>;
    if (parsed.role !== 'admin' || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    return {
      id: parsed.user_id ?? null,
      name: parsed.name || 'Fatin Hasnat',
      email: parsed.email || 'fatinhasnatdjs@gmail.com',
      role: parsed.rbac_role || 'Super Admin',
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

function extractAdminToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.kl_admin_session;
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractAdminToken(req);
  const user = verifySessionToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please sign in to the Admin CMS.' });
    return;
  }
  req.adminUser = user;
  next();
}

function requireRole(...allowed: RbacRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const role = req.adminUser?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxRequests) {
      res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      hits.clear();
    }
    next();
  };
}

const loginRateLimiter = createRateLimiter(12, 15 * 60 * 1000);
const trackRateLimiter = createRateLimiter(25, 15 * 60 * 1000);

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || proto === 'https';
}

function sanitizeInternalPath(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /[\r\n\\]/.test(trimmed)) return null;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalized.startsWith('//') || /^\/[a-zA-Z]+:/.test(normalized)) return null;
  return normalized;
}

function parsePackDetails(
  raw: string | null | undefined
): { labels: string[]; items: Array<{ variant_id: number; qty: number }> } {
  if (!raw) return { labels: [], items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { labels: parsed.map(String), items: [] };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        labels: Array.isArray(parsed.labels) ? parsed.labels.map(String) : [],
        items: Array.isArray(parsed.items)
          ? parsed.items
              .filter((x: unknown) => typeof x === 'object' && x !== null)
              .map((x: { variant_id?: unknown; qty?: unknown }) => ({
                variant_id: Number(x.variant_id) || 0,
                qty: Math.max(1, Number(x.qty) || 1),
              }))
              .filter((x: { variant_id: number }) => x.variant_id > 0)
          : [],
      };
    }
  } catch {
    return { labels: [], items: [] };
  }
  return { labels: [], items: [] };
}

function actorOf(req: AuthenticatedRequest): { name: string; role: string } {
  return {
    name: req.adminUser?.name || 'Admin',
    role: req.adminUser?.role || 'Super Admin',
  };
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `item-${Date.now()}`
  );
}

function computePromoDiscount(
  codeInput: string | undefined,
  subtotal: number
): {
  valid: boolean;
  code: string | null;
  discount_amount: number;
  discount_type?: 'percent' | 'fixed' | 'free_shipping';
  discount_value?: number;
  min_subtotal?: number;
  free_shipping?: boolean;
  message?: string;
} {
  if (!codeInput || !codeInput.trim()) {
    return { valid: true, code: null, discount_amount: 0 };
  }
  const normalized = codeInput.trim().toUpperCase();
  const promo = db
    .prepare(`SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1`)
    .get(normalized) as
    | {
        id: number;
        code: string;
        discount_type: 'percent' | 'fixed' | 'free_shipping';
        discount_value: number;
        min_subtotal: number;
        usage_limit: number | null;
        usage_count: number;
        expires_at: string | null;
      }
    | undefined;

  if (!promo) {
    return { valid: false, code: null, discount_amount: 0, message: 'Promo code is invalid or inactive.' };
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return { valid: false, code: null, discount_amount: 0, message: `Promo code ${promo.code} has expired.` };
  }
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return { valid: false, code: null, discount_amount: 0, message: `Promo code ${promo.code} usage limit reached.` };
  }
  if (subtotal < promo.min_subtotal) {
    return {
      valid: false,
      code: null,
      discount_amount: 0,
      message: `Minimum order of ৳${promo.min_subtotal} required for ${promo.code}.`,
    };
  }
  if (promo.discount_type === 'free_shipping') {
    return {
      valid: true,
      code: promo.code,
      discount_amount: 0,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_subtotal: promo.min_subtotal,
      free_shipping: true,
    };
  }
  const rawDiscount =
    promo.discount_type === 'percent'
      ? Math.round((subtotal * promo.discount_value) / 100)
      : promo.discount_value;
  return {
    valid: true,
    code: promo.code,
    discount_amount: Math.min(subtotal, Math.max(0, rawDiscount)),
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    min_subtotal: promo.min_subtotal,
  };
}

// ---------- PUBLIC STOREFRONT & SEO ROUTES ----------

app.get('/robots.txt', (_req, res) => {
  const cms = getCmsSettings();
  res.type('text/plain; charset=utf-8').send(cms.robots_txt || 'User-agent: *\nAllow: /\nDisallow: /admin');
});

app.get('/sitemap.xml', (req, res) => {
  const cms = getCmsSettings();
  if (!cms.sitemap_enabled) {
    res.status(404).type('text/plain').send('Sitemap disabled');
    return;
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: `${baseUrl}/` },
    { loc: `${baseUrl}/socks` },
    { loc: `${baseUrl}/men` },
    { loc: `${baseUrl}/women` },
    { loc: `${baseUrl}/kids-baby` },
    { loc: `${baseUrl}/size-chart` },
    { loc: `${baseUrl}/journal` },
  ];
  for (const p of getProducts(false, false)) {
    urls.push({ loc: `${baseUrl}/product/${p.slug}`, lastmod: p.created_at });
  }
  for (const pg of getCmsPages(false)) {
    urls.push({ loc: `${baseUrl}/page/${pg.slug}`, lastmod: pg.updated_at });
  }
  for (const post of getBlogPosts(false)) {
    urls.push({ loc: `${baseUrl}/journal/${post.slug}`, lastmod: post.updated_at });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc.replace(/&/g, '&amp;')}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>`;
  res.type('application/xml; charset=utf-8').send(xml);
});

app.get('/api/storefront', (_req, res) => {
  const fullCms = getCmsSettings();
  const publicCms = {
    ...fullCms,
    smtp_host: '',
    smtp_from: '',
    smtp_templates: [],
  };
  const publicPluginIds = new Set(['newsletter-popup', 'schema-jsonld', 'bkash-webhook']);
  const publicPlugins = getPlugins()
    .filter((pl) => publicPluginIds.has(pl.id))
    .map((pl) => ({ id: pl.id, is_enabled: pl.is_enabled, config: pl.config }));

  res.json({
    cms: publicCms,
    products: getProducts(false, false),
    promos: getPromos(false),
    pages: getCmsPages(false),
    posts: getBlogPosts(false),
    menus: getMenus(),
    plugins: publicPlugins,
    reviews: getReviews(false),
    redirects: getRedirects(),
  });
});

app.post('/api/posts/:slug/view', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug) {
    res.status(400).json({ error: 'Invalid slug.' });
    return;
  }
  db.prepare(
    `UPDATE blog_posts SET views_count = views_count + 1
     WHERE slug = ? AND (status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?))`
  ).run(slug, new Date().toISOString());
  res.json({ tracked: true });
});

app.post('/api/promos/validate', (req, res) => {
  const { code, subtotal } = req.body as { code?: string; subtotal?: number };
  const numericSubtotal = Math.max(0, Math.round(Number(subtotal) || 0));
  const result = computePromoDiscount(code, numericSubtotal);
  if (!result.valid) {
    res.status(400).json({ error: result.message || 'Invalid promo code' });
    return;
  }
  res.json({
    code: result.code,
    discount_amount: result.discount_amount,
    discount_type: result.discount_type,
    discount_value: result.discount_value,
    min_subtotal: result.min_subtotal,
    free_shipping: Boolean(result.free_shipping),
  });
});

interface CheckoutItemPayload {
  type: 'single' | 'custom_pack';
  product_id?: number;
  variant_id?: number;
  quantity: number;
  pack_tier?: 3 | 5;
  pack_items?: Array<{ product_id: number; variant_id: number }>;
}

app.post('/api/orders', (req, res) => {
  const body = req.body as {
    customer_name?: string;
    customer_phone?: string;
    delivery_zone?: DeliveryZone;
    address?: string;
    city?: string;
    notes?: string;
    payment_method?: PaymentMethod;
    wallet_sender?: string;
    wallet_trx_id?: string;
    promo_code?: string;
    items?: CheckoutItemPayload[];
  };

  const customerName = (body.customer_name || '').trim();
  const customerPhone = (body.customer_phone || '').trim();
  const address = (body.address || '').trim();
  const city = (body.city || '').trim() || (body.delivery_zone === 'dhaka' ? 'Dhaka' : '');
  const deliveryZone: DeliveryZone = body.delivery_zone === 'outside' ? 'outside' : 'dhaka';
  const paymentMethod: PaymentMethod =
    body.payment_method === 'bkash' || body.payment_method === 'nagad' ? body.payment_method : 'cod';

  if (customerName.length < 2) {
    res.status(400).json({ error: 'Please enter your full name.' });
    return;
  }
  if (customerPhone.replace(/\D/g, '').length < 10) {
    res.status(400).json({ error: 'Please enter a valid 11-digit Bangladesh mobile number.' });
    return;
  }
  if (address.length < 5 || city.length < 2) {
    res.status(400).json({ error: 'Please provide your complete delivery address and city.' });
    return;
  }
  if (paymentMethod !== 'cod') {
    if (!body.wallet_sender || body.wallet_sender.replace(/\D/g, '').length < 10) {
      res
        .status(400)
        .json({ error: `Please enter the sender mobile number used for ${paymentMethod.toUpperCase()}.` });
      return;
    }
    const cleanTrx = (body.wallet_trx_id || '').trim().toUpperCase();
    const bkashPlugin = getPlugins().find((p) => p.id === 'bkash-webhook');
    const strictTrx = Boolean(bkashPlugin?.is_enabled && bkashPlugin.config?.strict_trx_length);
    if (strictTrx ? !/^[A-Z0-9]{10}$/.test(cleanTrx) : cleanTrx.length < 4) {
      res.status(400).json({
        error: strictTrx
          ? `Please enter a valid 10-character alphanumeric ${paymentMethod.toUpperCase()} TrxID.`
          : `Please enter your ${paymentMethod.toUpperCase()} Transaction ID (TrxID).`,
      });
      return;
    }
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'Your shopping bag is empty.' });
    return;
  }

  const cms = getCmsSettings();

  if (paymentMethod === 'cod' && !cms.cod_enabled) {
    res.status(400).json({ error: 'Cash on Delivery is currently disabled in Store Configuration.' });
    return;
  }
  if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && !cms.mobile_banking_enabled) {
    res.status(400).json({ error: 'Mobile banking (bKash/Nagad) is currently disabled.' });
    return;
  }

  try {
    const createdOrder = db.transaction((): Order => {
      const variantStockDecrements = new Map<number, number>();
      const preparedItems: Array<{
        product_id: number | null;
        variant_id: number | null;
        item_name: string;
        variant_label: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        pack_details: string | null;
      }> = [];

      const getVariantRow = db.prepare(`
        SELECT v.id, v.product_id, v.sku, v.color_name, v.size, v.stock,
               p.name as product_name, COALESCE(v.price_override, p.price) as product_price, p.is_active
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ?
      `);

      type VariantJoined = {
        id: number;
        product_id: number;
        sku: string;
        color_name: string;
        size: string;
        stock: number;
        product_name: string;
        product_price: number;
        is_active: number;
      };

      let subtotal = 0;

      for (const item of body.items!) {
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));

        if (item.type === 'custom_pack') {
          const tier = item.pack_tier === 5 ? 5 : 3;
          const packSelections = item.pack_items || [];
          if (packSelections.length !== tier) {
            throw new Error(`Custom ${tier}-Pair Pack must contain exactly ${tier} pairs.`);
          }

          let rawPackSum = 0;
          const detailNames: string[] = [];
          const perPackVariantQty = new Map<number, number>();
          for (const sel of packSelections) {
            const vRow = getVariantRow.get(sel.variant_id) as VariantJoined | undefined;
            if (!vRow || !vRow.is_active) {
              throw new Error('One of the selected socks in your custom pack is no longer available.');
            }
            const pendingCount = (variantStockDecrements.get(vRow.id) ?? 0) + qty;
            if (vRow.stock < pendingCount) {
              throw new Error(`Insufficient stock for ${vRow.product_name} (${vRow.color_name}, ${vRow.size}).`);
            }
            variantStockDecrements.set(vRow.id, pendingCount);
            perPackVariantQty.set(vRow.id, (perPackVariantQty.get(vRow.id) ?? 0) + 1);
            rawPackSum += vRow.product_price;
            detailNames.push(`${vRow.product_name} (${vRow.color_name} · ${vRow.size})`);
          }

          const discountPct = tier === 5 ? cms.pack_5_discount_pct : cms.pack_3_discount_pct;
          const packUnitPrice = Math.round(rawPackSum * (1 - discountPct / 100));
          const lineTotal = packUnitPrice * qty;
          subtotal += lineTotal;

          const packItemsMeta = Array.from(perPackVariantQty.entries()).map(([variant_id, perPackQty]) => ({
            variant_id,
            qty: perPackQty,
          }));

          preparedItems.push({
            product_id: null,
            variant_id: null,
            item_name: `Custom ${tier}-Pair Essential Pack (${discountPct}% Off)`,
            variant_label: `${tier} Mixed Pairs`,
            quantity: qty,
            unit_price: packUnitPrice,
            line_total: lineTotal,
            pack_details: JSON.stringify({ labels: detailNames, items: packItemsMeta }),
          });
        } else {
          if (!item.variant_id) {
            throw new Error('Missing variant selection on cart item.');
          }
          const vRow = getVariantRow.get(item.variant_id) as VariantJoined | undefined;
          if (!vRow || !vRow.is_active) {
            throw new Error('A product in your bag is no longer available.');
          }
          const pendingCount = (variantStockDecrements.get(vRow.id) ?? 0) + qty;
          if (vRow.stock < pendingCount) {
            throw new Error(`Only ${vRow.stock} left in stock for ${vRow.product_name} (${vRow.color_name}).`);
          }
          variantStockDecrements.set(vRow.id, pendingCount);

          const lineTotal = vRow.product_price * qty;
          subtotal += lineTotal;
          preparedItems.push({
            product_id: vRow.product_id,
            variant_id: vRow.id,
            item_name: vRow.product_name,
            variant_label: `${vRow.color_name} · ${vRow.size}`,
            quantity: qty,
            unit_price: vRow.product_price,
            line_total: lineTotal,
            pack_details: null,
          });
        }
      }

      const promoResult = computePromoDiscount(body.promo_code, subtotal);
      if (!promoResult.valid) {
        throw new Error(promoResult.message || 'Promo code cannot be applied.');
      }

      const afterDiscount = Math.max(0, subtotal - promoResult.discount_amount);
      const taxAmount =
        cms.tax_rate_pct > 0 ? Math.round((afterDiscount * cms.tax_rate_pct) / 100) : 0;
      const baseShipping =
        deliveryZone === 'dhaka' ? cms.dhaka_shipping_fee : cms.outside_dhaka_shipping_fee;
      const shippingFee =
        promoResult.free_shipping ||
        (cms.free_shipping_threshold > 0 && afterDiscount >= cms.free_shipping_threshold)
          ? 0
          : baseShipping;
      const total = afterDiscount + taxAmount + shippingFee;

      const updateStockStmt = db.prepare(`UPDATE product_variants SET stock = stock - ? WHERE id = ?`);
      for (const [variantId, count] of variantStockDecrements.entries()) {
        updateStockStmt.run(count, variantId);
      }

      if (promoResult.code) {
        db.prepare(`UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = ?`).run(promoResult.code);
      }

      const lastRow = db
        .prepare(`SELECT MAX(CAST(SUBSTR(order_number, 5) AS INTEGER)) as maxNum FROM orders WHERE order_number LIKE 'MSH-%'`)
        .get() as { maxNum: number | null };
      const nextNum = Math.max(1001, (lastRow?.maxNum ?? 1000) + 1);
      const orderNumber = `MSH-${nextNum}`;
      const now = new Date().toISOString();

      const orderInsert = db
        .prepare(
          `
        INSERT INTO orders (
          order_number, customer_name, customer_phone, delivery_zone, address, city, notes,
          payment_method, payment_status, wallet_sender, wallet_trx_id, subtotal, promo_code, discount_amount,
          tax_amount, shipping_fee, total, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          orderNumber,
          customerName,
          customerPhone,
          deliveryZone,
          address,
          city,
          (body.notes || '').trim() || null,
          paymentMethod,
          'pending',
          paymentMethod === 'cod' ? null : (body.wallet_sender || '').trim(),
          paymentMethod === 'cod' ? null : (body.wallet_trx_id || '').trim().toUpperCase(),
          subtotal,
          promoResult.code,
          promoResult.discount_amount,
          taxAmount,
          shippingFee,
          total,
          'pending',
          now
        );

      const orderId = Number(orderInsert.lastInsertRowid);
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, variant_id, item_name, variant_label, quantity, unit_price, line_total, pack_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of preparedItems) {
        insertItemStmt.run(
          orderId,
          item.product_id,
          item.variant_id,
          item.item_name,
          item.variant_label,
          item.quantity,
          item.unit_price,
          item.line_total,
          item.pack_details
        );
      }

      const orderRow = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as Omit<Order, 'items'>;
      const orderItems = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(orderId) as Order['items'];
      return { ...orderRow, items: orderItems };
    })();

    logAudit(
      createdOrder.customer_name,
      'Customer',
      'order.placed',
      createdOrder.order_number,
      `${createdOrder.payment_method.toUpperCase()} · ৳${createdOrder.total}`
    );
    res.status(201).json({ order: createdOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to place order.';
    res.status(400).json({ error: message });
  }
});

app.get('/api/orders/track', trackRateLimiter, (req, res) => {
  const orderNumber = String(req.query.orderNumber || '').trim().toUpperCase();
  const phoneDigits = String(req.query.phone || '').replace(/\D/g, '');
  if (!orderNumber || phoneDigits.length < 10) {
    res.status(400).json({ error: 'Enter your Order Number (e.g. MSH-1001) and full mobile number.' });
    return;
  }

  const orderRow = db
    .prepare(`SELECT * FROM orders WHERE UPPER(order_number) = ?`)
    .get(orderNumber) as Omit<Order, 'items'> | undefined;

  if (!orderRow) {
    res.status(404).json({ error: 'No order found matching that Order Number.' });
    return;
  }

  const storedDigits = orderRow.customer_phone.replace(/\D/g, '');
  if (storedDigits.slice(-10) !== phoneDigits.slice(-10)) {
    res.status(403).json({ error: 'Phone number does not match this order.' });
    return;
  }

  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(orderRow.id) as Order['items'];
  res.json({
    order: {
      id: orderRow.id,
      order_number: orderRow.order_number,
      customer_name: orderRow.customer_name,
      customer_phone: '',
      delivery_zone: orderRow.delivery_zone,
      address: '',
      city: orderRow.city,
      notes: null,
      payment_method: orderRow.payment_method,
      payment_status: orderRow.payment_status,
      tracking_number: orderRow.tracking_number,
      wallet_sender: null,
      wallet_trx_id: null,
      subtotal: orderRow.subtotal,
      promo_code: orderRow.promo_code,
      discount_amount: orderRow.discount_amount,
      tax_amount: orderRow.tax_amount,
      shipping_fee: orderRow.shipping_fee,
      total: orderRow.total,
      status: orderRow.status,
      created_at: orderRow.created_at,
      items,
    },
  });
});

app.post('/api/reviews', (req, res) => {
  const { product_id, product_name, reviewer_name, reviewer_city, rating, title, comment } = req.body as {
    product_id?: number | null;
    product_name?: string;
    reviewer_name?: string;
    reviewer_city?: string;
    rating?: number;
    title?: string;
    comment?: string;
  };
  if (!reviewer_name?.trim() || !title?.trim() || !comment?.trim()) {
    res.status(400).json({ error: 'Name, review headline, and comment are required.' });
    return;
  }
  const safeRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
  const info = db
    .prepare(
      `INSERT INTO reviews (product_id, product_name, reviewer_name, reviewer_city, rating, title, comment, status, is_approved, admin_reply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, ?)`
    )
    .run(
      product_id || null,
      (product_name || 'Mashuka Socks').trim(),
      reviewer_name.trim(),
      (reviewer_city || 'Dhaka').trim(),
      safeRating,
      title.trim(),
      comment.trim(),
      new Date().toISOString()
    );

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    message: 'Thank you! Your review has been submitted and is awaiting store approval.',
  });
});

app.post('/api/returns', (req, res) => {
  const { order_number, customer_name, customer_phone, reason, resolution, details } = req.body as {
    order_number?: string;
    customer_name?: string;
    customer_phone?: string;
    reason?: string;
    resolution?: 'exchange' | 'refund' | 'store-credit';
    details?: string;
  };
  if (!order_number?.trim() || !customer_name?.trim() || !customer_phone?.trim() || !details?.trim()) {
    res.status(400).json({ error: 'Order number, name, phone, and details are required.' });
    return;
  }
  const last = db
    .prepare(`SELECT MAX(CAST(SUBSTR(request_number, 5) AS INTEGER)) as maxNum FROM return_requests WHERE request_number LIKE 'RET-%'`)
    .get() as { maxNum: number | null };
  const reqNum = `RET-${Math.max(101, (last?.maxNum ?? 100) + 1)}`;
  const safeResolution =
    resolution === 'refund' || resolution === 'store-credit' ? resolution : 'exchange';

  const info = db
    .prepare(
      `INSERT INTO return_requests (request_number, order_number, customer_name, customer_phone, reason, resolution, details, status, admin_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', NULL, ?)`
    )
    .run(
      reqNum,
      order_number.trim().toUpperCase(),
      customer_name.trim(),
      customer_phone.trim(),
      (reason || 'Size Exchange').trim(),
      safeResolution,
      details.trim(),
      new Date().toISOString()
    );

  const created = db.prepare(`SELECT * FROM return_requests WHERE id = ?`).get(Number(info.lastInsertRowid));
  res.status(201).json({ return_request: created });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
  };
  if (!name?.trim() || !message?.trim() || (!email?.trim() && !phone?.trim())) {
    res.status(400).json({ error: 'Please include your name, message, and phone or email.' });
    return;
  }
  db.prepare(
    `INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'unread', ?)`
  ).run(
    name.trim(),
    (email || '').trim(),
    (phone || '').trim(),
    (subject || 'Store Inquiry').trim(),
    message.trim(),
    new Date().toISOString()
  );
  res.status(201).json({ sent: true });
});

// ---------- ADMIN AUTH & ENTERPRISE CMS ROUTES ----------

app.get('/api/admin/me', (req, res) => {
  const token = extractAdminToken(req);
  const user = verifySessionToken(token);
  res.json({ authenticated: Boolean(user), user });
});

app.post('/api/admin/login', loginRateLimiter, (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!password) {
    res.status(401).json({ error: 'Password is required.' });
    return;
  }
  const auth = authenticateAdminUser(email, password);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error });
    return;
  }
  const token = signSessionToken({
    role: 'admin',
    user_id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    rbac_role: auth.user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  const secureFlag = isHttpsRequest(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `kl_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`
  );
  res.json({ authenticated: true, token, user: auth.user });
});

app.post('/api/admin/change-password', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { current_password, new_password } = req.body as {
    current_password?: string;
    new_password?: string;
  };
  const sessionUser = req.adminUser!;
  if (!current_password || !verifySessionUserPassword(sessionUser, current_password)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  const trimmedNext = (new_password || '').trim();
  if (trimmedNext.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }
  if (sessionUser.role === 'Super Admin') {
    setAdminPassword(trimmedNext, sessionUser.id);
  } else if (sessionUser.id) {
    setRbacUserPassword(sessionUser.id, trimmedNext);
  } else {
    setAdminPassword(trimmedNext);
  }
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'security.password_changed', sessionUser.email, 'Updated account password');
  res.json({ updated: true });
});

app.post('/api/admin/logout', (req, res) => {
  const secureFlag = isHttpsRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kl_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`);
  res.json({ authenticated: false });
});

app.get('/api/admin/dashboard', requireAdmin, (req: AuthenticatedRequest, res) => {
  const role = req.adminUser!.role;
  const isSuperAdmin = role === 'Super Admin';
  const includeCost = role === 'Super Admin' || role === 'Shop Manager';

  const orders = getOrders();
  const products = getProducts(true, includeCost);
  const promos = getPromos(true);
  const fullCms = getCmsSettings();
  const cms = isSuperAdmin
    ? fullCms
    : { ...fullCms, smtp_host: '', smtp_from: '', smtp_templates: [] };
  const pages = getCmsPages(true);
  const posts = getBlogPosts(true);
  const menus = getMenus();
  const redirects = getRedirects();
  const plugins = getPlugins();
  const users = isSuperAdmin ? getRbacUsers() : [];
  const auditLogs = isSuperAdmin ? getAuditLogs() : [];
  const apiKeys = isSuperAdmin ? getApiKeys() : [];
  const customers = getCustomersDirectory();
  const reviews = getReviews(true);
  const returns = getReturnRequests();
  const messages = getContactMessages();
  const media = getMediaLibrary();

  const nonCancelledOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
  const totalRevenue = nonCancelledOrders.reduce((acc, o) => acc + o.total, 0);
  const aov = nonCancelledOrders.length > 0 ? Math.round(totalRevenue / nonCancelledOrders.length) : 0;
  const totalPageViews = posts.reduce((acc, p) => acc + p.views_count, 0);

  const metrics: AdminDashboardMetrics = {
    total_revenue: totalRevenue,
    total_orders_count: orders.length,
    aov,
    total_page_views: totalPageViews,
    active_subscribers: customers.filter((c) => c.tags.includes('Subscriber')).length,
    conversion_rate: 0,
    active_orders_count: orders.filter(
      (o) => !['delivered', 'cancelled', 'refunded'].includes(o.status)
    ).length,
    pending_verification_count: orders.filter(
      (o) => o.status === 'pending' && (o.payment_method === 'bkash' || o.payment_method === 'nagad')
    ).length,
    low_stock_variants_count: products.reduce(
      (acc, p) => acc + p.variants.filter((v) => v.stock <= (cms.low_stock_threshold || 12)).length,
      0
    ),
    pending_reviews_count: reviews.filter((r) => !r.is_approved).length,
    open_returns_count: returns.filter((r) => r.status === 'requested' || r.status === 'approved').length,
    unread_messages_count: messages.filter((m) => m.status === 'unread').length,
  };

  res.json({
    currentUser: req.adminUser,
    metrics,
    orders,
    products,
    promos,
    cms,
    pages,
    posts,
    menus,
    redirects,
    plugins,
    users,
    auditLogs,
    apiKeys,
    customers,
    reviews,
    returns,
    messages,
    media,
  });
});

app.post(
  '/api/admin/upload',
  requireAdmin,
  requireRole('Super Admin', 'Shop Manager', 'Content Editor', 'Author'),
  upload.single('image'),
  (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided.' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.filename).toLowerCase();
    const mediaType = ext === '.mp4' ? 'video' : ext === '.pdf' ? 'document' : 'image';
    db.prepare(
      `INSERT OR REPLACE INTO media_metadata (url, title, alt_text, caption, media_type, updated_at) VALUES (?, ?, ?, '', ?, ?)`
    ).run(url, req.file.originalname, req.file.originalname, mediaType, new Date().toISOString());
    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'media.uploaded', req.file.filename, `Uploaded ${mediaType} asset`);
    res.json({ url });
  }
);

app.patch(
  '/api/admin/media/meta',
  requireAdmin,
  requireRole('Super Admin', 'Shop Manager', 'Content Editor', 'Author'),
  (req, res) => {
    const { url, title, alt_text, caption } = req.body as {
      url?: string;
      title?: string;
      alt_text?: string;
      caption?: string;
    };
    if (!url) {
      res.status(400).json({ error: 'Media URL is required.' });
      return;
    }
    db.prepare(
      `INSERT OR REPLACE INTO media_metadata (url, title, alt_text, caption, media_type, updated_at) VALUES (?, ?, ?, ?, 'image', ?)`
    ).run(url, title || '', alt_text || '', caption || '', new Date().toISOString());
    res.json({ updated: true });
  }
);

app.delete(
  '/api/admin/media/:filename',
  requireAdmin,
  requireRole('Super Admin', 'Shop Manager', 'Content Editor'),
  (req, res) => {
    const safeName = path.basename(String(req.params.filename || ''));
    const target = path.join(UPLOAD_DIR, safeName);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    db.prepare(`DELETE FROM media_metadata WHERE url = ?`).run(`/uploads/${safeName}`);
    res.json({ deleted: true });
  }
);

// Products CRUD + Inline Stock Adjustment
interface AdminProductInput {
  name: string;
  slug?: string;
  product_type?: ProductType;
  status?: ProductStatus;
  category: ProductCategory;
  audience: ProductAudience;
  display_pages: string[];
  sort_order: number;
  short_description: string;
  fabric_specs: string;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  sale_start?: string | null;
  sale_end?: string | null;
  tags?: string[];
  gallery_urls?: string[];
  image_url: string;
  is_featured: boolean;
  is_bundle: boolean;
  bundle_pairs: number;
  is_pack_eligible: boolean;
  is_active: boolean;
  focus_keyword?: string;
  seo_title?: string;
  seo_description?: string;
  variants: Array<{
    id?: number;
    sku: string;
    color_name: string;
    color_hex: string;
    size: string;
    material?: string;
    price_override?: number | null;
    stock: number;
    image_url?: string | null;
  }>;
}

app.post('/api/admin/products', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req: AuthenticatedRequest, res) => {
  const input = req.body as AdminProductInput;
  if (!input.name?.trim() || !input.variants?.length) {
    res.status(400).json({ error: 'Product name and at least one variant are required.' });
    return;
  }
  const baseSlug = slugify(input.slug || input.name);
  const existingSlug = db.prepare(`SELECT id FROM products WHERE slug = ?`).get(baseSlug);
  const finalSlug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
  const now = new Date().toISOString();
  const displayPages =
    Array.isArray(input.display_pages) && input.display_pages.length > 0
      ? input.display_pages
      : ['home', 'socks'];
  const status: ProductStatus = input.status || (input.is_active === false ? 'draft' : 'active');

  try {
    const productId = db.transaction(() => {
      const result = db
        .prepare(
          `
        INSERT INTO products (
          slug, name, product_type, status, category, audience, display_pages, sort_order,
          short_description, fabric_specs, price, compare_at_price, cost_price, sale_start, sale_end,
          tags, gallery_urls, image_url, is_featured, is_bundle, bundle_pairs, is_pack_eligible, is_active,
          focus_keyword, seo_title, seo_description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          finalSlug,
          input.name.trim(),
          input.product_type || 'variable',
          status,
          input.category || 'crew',
          input.audience || 'unisex',
          JSON.stringify(displayPages),
          Math.round(Number(input.sort_order) || 0),
          (input.short_description || '').trim(),
          (input.fabric_specs || '').trim(),
          Math.max(1, Math.round(Number(input.price) || 0)),
          input.compare_at_price ? Math.round(Number(input.compare_at_price)) : null,
          input.cost_price ? Math.round(Number(input.cost_price)) : null,
          input.sale_start || null,
          input.sale_end || null,
          JSON.stringify(input.tags || []),
          JSON.stringify(input.gallery_urls || [input.image_url]),
          input.image_url?.trim() || '/src/assets/images/sock_crew_ribbed_1795008504482.jpg',
          input.is_featured ? 1 : 0,
          input.is_bundle ? 1 : 0,
          Math.max(1, Math.round(Number(input.bundle_pairs) || 1)),
          input.is_pack_eligible ? 1 : 0,
          status === 'active' ? 1 : 0,
          (input.focus_keyword || '').trim(),
          (input.seo_title || input.name).trim(),
          (input.seo_description || input.short_description || '').trim(),
          now
        );

      const pid = Number(result.lastInsertRowid);
      const insertVar = db.prepare(`
        INSERT INTO product_variants (product_id, sku, color_name, color_hex, size, material, price_override, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < input.variants.length; i++) {
        const v = input.variants[i];
        const sku = (v.sku || `MSH-${pid}-${i + 1}`).trim().toUpperCase();
        insertVar.run(
          pid,
          sku,
          v.color_name.trim() || 'Black',
          v.color_hex || '#141416',
          v.size.trim() || 'UK 6-9',
          v.material || 'Combed Cotton',
          v.price_override ? Math.round(Number(v.price_override)) : null,
          Math.max(0, Math.round(Number(v.stock) || 0)),
          v.image_url || null
        );
      }
      return pid;
    })();

    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'product.created', input.name.trim(), `Created ${input.variants.length} SKU(s)`);
    const created = getProducts(true).find((p) => p.id === productId);
    res.status(201).json({ product: created });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create product.' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req: AuthenticatedRequest, res) => {
  const productId = Number(req.params.id);
  const input = req.body as AdminProductInput;
  const existing = db.prepare(`SELECT id FROM products WHERE id = ?`).get(productId);
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  if (!input.name?.trim() || !input.variants?.length) {
    res.status(400).json({ error: 'Product name and at least one variant are required.' });
    return;
  }
  const displayPages = Array.isArray(input.display_pages) ? input.display_pages : ['home', 'socks'];
  const status: ProductStatus = input.status || (input.is_active ? 'active' : 'draft');

  try {
    db.transaction(() => {
      db.prepare(
        `
        UPDATE products SET
          name = ?, slug = ?, product_type = ?, status = ?, category = ?, audience = ?, display_pages = ?, sort_order = ?,
          short_description = ?, fabric_specs = ?,
          price = ?, compare_at_price = ?, cost_price = ?, sale_start = ?, sale_end = ?,
          tags = ?, gallery_urls = ?, image_url = ?,
          is_featured = ?, is_bundle = ?, bundle_pairs = ?, is_pack_eligible = ?, is_active = ?,
          focus_keyword = ?, seo_title = ?, seo_description = ?
        WHERE id = ?
      `
      ).run(
        input.name.trim(),
        slugify(input.slug || input.name),
        input.product_type || 'variable',
        status,
        input.category || 'crew',
        input.audience || 'unisex',
        JSON.stringify(displayPages),
        Math.round(Number(input.sort_order) || 0),
        (input.short_description || '').trim(),
        (input.fabric_specs || '').trim(),
        Math.max(1, Math.round(Number(input.price) || 0)),
        input.compare_at_price ? Math.round(Number(input.compare_at_price)) : null,
        input.cost_price ? Math.round(Number(input.cost_price)) : null,
        input.sale_start || null,
        input.sale_end || null,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.gallery_urls || [input.image_url]),
        input.image_url?.trim() || '/src/assets/images/sock_crew_ribbed_1795008504482.jpg',
        input.is_featured ? 1 : 0,
        input.is_bundle ? 1 : 0,
        Math.max(1, Math.round(Number(input.bundle_pairs) || 1)),
        input.is_pack_eligible ? 1 : 0,
        status === 'active' ? 1 : 0,
        (input.focus_keyword || '').trim(),
        (input.seo_title || input.name).trim(),
        (input.seo_description || input.short_description || '').trim(),
        productId
      );

      const keepIds: number[] = [];
      const updateVar = db.prepare(`
        UPDATE product_variants SET sku = ?, color_name = ?, color_hex = ?, size = ?, material = ?, price_override = ?, stock = ?, image_url = ?
        WHERE id = ? AND product_id = ?
      `);
      const insertVar = db.prepare(`
        INSERT INTO product_variants (product_id, sku, color_name, color_hex, size, material, price_override, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < input.variants.length; i++) {
        const v = input.variants[i];
        const sku = (v.sku || `MSH-${productId}-${Date.now().toString().slice(-3)}-${i + 1}`)
          .trim()
          .toUpperCase();
        if (v.id) {
          updateVar.run(
            sku,
            v.color_name.trim() || 'Black',
            v.color_hex || '#141416',
            v.size.trim() || 'UK 6-9',
            v.material || 'Combed Cotton',
            v.price_override ? Math.round(Number(v.price_override)) : null,
            Math.max(0, Math.round(Number(v.stock) || 0)),
            v.image_url || null,
            v.id,
            productId
          );
          keepIds.push(v.id);
        } else {
          const inserted = insertVar.run(
            productId,
            sku,
            v.color_name.trim() || 'Black',
            v.color_hex || '#141416',
            v.size.trim() || 'UK 6-9',
            v.material || 'Combed Cotton',
            v.price_override ? Math.round(Number(v.price_override)) : null,
            Math.max(0, Math.round(Number(v.stock) || 0)),
            v.image_url || null
          );
          keepIds.push(Number(inserted.lastInsertRowid));
        }
      }

      const existingVars = db
        .prepare(`SELECT id FROM product_variants WHERE product_id = ?`)
        .all(productId) as Array<{ id: number }>;
      const detachOrderVar = db.prepare(`UPDATE order_items SET variant_id = NULL WHERE variant_id = ?`);
      const deleteVar = db.prepare(`DELETE FROM product_variants WHERE id = ?`);
      for (const ev of existingVars) {
        if (!keepIds.includes(ev.id)) {
          detachOrderVar.run(ev.id);
          deleteVar.run(ev.id);
        }
      }
    })();

    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'product.updated', input.name.trim(), `Updated price ৳${input.price}`);
    const updated = getProducts(true).find((p) => p.id === productId);
    res.json({ product: updated });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update product.' });
  }
});

app.patch('/api/admin/variants/:id/stock', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req: AuthenticatedRequest, res) => {
  const variantId = Number(req.params.id);
  const { stock } = req.body as { stock?: number };
  const safeStock = Math.max(0, Math.round(Number(stock) || 0));
  db.prepare(`UPDATE product_variants SET stock = ? WHERE id = ?`).run(safeStock, variantId);
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'inventory.adjusted', `Variant #${variantId}`, `Stock set to ${safeStock}`);
  res.json({ updated: true, stock: safeStock });
});

app.post('/api/admin/products/bulk', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req: AuthenticatedRequest, res) => {
  const { ids, action } = req.body as { ids?: number[]; action?: 'activate' | 'draft' | 'delete' };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Select at least one product.' });
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    db.prepare(`UPDATE order_items SET product_id = NULL, variant_id = NULL WHERE product_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'activate') {
    db.prepare(`UPDATE products SET status = 'active', is_active = 1 WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'draft') {
    db.prepare(`UPDATE products SET status = 'draft', is_active = 0 WHERE id IN (${placeholders})`).run(...ids);
  }
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, `product.bulk_${action}`, `${ids.length} products`, `Applied bulk ${action}`);
  res.json({ updated: true });
});

app.delete('/api/admin/products/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req: AuthenticatedRequest, res) => {
  const productId = Number(req.params.id);
  db.prepare(`UPDATE order_items SET product_id = NULL, variant_id = NULL WHERE product_id = ?`).run(productId);
  db.prepare(`DELETE FROM products WHERE id = ?`).run(productId);
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'product.deleted', `Product #${productId}`, 'Removed product');
  res.json({ deleted: true });
});

// Blog Posts CRUD & Revisions
app.post('/api/admin/posts', requireAdmin, requireRole('Super Admin', 'Content Editor', 'Author'), (req: AuthenticatedRequest, res) => {
  const input = req.body as {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    category?: string;
    tags?: string[];
    featured_image?: string;
    author_name?: string;
    status?: BlogPostStatus;
    scheduled_at?: string | null;
    focus_keyword?: string;
    seo_title?: string;
    seo_description?: string;
  };
  if (!input.title?.trim()) {
    res.status(400).json({ error: 'Post title is required.' });
    return;
  }
  const baseSlug = slugify(input.slug || input.title);
  const existing = db.prepare(`SELECT id FROM blog_posts WHERE slug = ?`).get(baseSlug);
  const finalSlug = existing ? `${baseSlug}-${Date.now().toString().slice(-3)}` : baseSlug;
  const now = new Date().toISOString();
  const initialRev = [
    {
      id: `rev-${Date.now()}`,
      saved_at: now,
      author: input.author_name || req.adminUser?.name || 'Fatin Hasnat',
      title: input.title.trim(),
      content: input.content || '',
    },
  ];

  const info = db
    .prepare(
      `INSERT INTO blog_posts (
        title, slug, excerpt, content, category, tags, featured_image, author_name,
        status, scheduled_at, views_count, focus_keyword, seo_title, seo_description, revisions, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title.trim(),
      finalSlug,
      (input.excerpt || '').trim(),
      input.content || '',
      input.category || 'Craft & Yarn',
      JSON.stringify(input.tags || []),
      input.featured_image || '/src/assets/images/hero_socks_campaign_1795008499974.jpg',
      input.author_name || req.adminUser?.name || 'Fatin Hasnat',
      input.status || 'draft',
      input.scheduled_at || null,
      (input.focus_keyword || '').trim(),
      (input.seo_title || input.title).trim(),
      (input.seo_description || input.excerpt || '').trim(),
      JSON.stringify(initialRev),
      now,
      now
    );

  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'post.created', input.title.trim(), `Status: ${input.status || 'draft'}`);
  const created = getBlogPosts(true).find((p) => p.id === Number(info.lastInsertRowid));
  res.status(201).json({ post: created });
});

app.put('/api/admin/posts/:id', requireAdmin, requireRole('Super Admin', 'Content Editor', 'Author'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = getBlogPosts(true).find((p) => p.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }
  const input = req.body as Partial<typeof existing>;
  const now = new Date().toISOString();
  const nextRevs = [
    {
      id: `rev-${Date.now()}`,
      saved_at: now,
      author: input.author_name || existing.author_name,
      title: input.title || existing.title,
      content: input.content ?? existing.content,
    },
    ...existing.revisions.slice(0, 9),
  ];

  try {
    db.prepare(
      `UPDATE blog_posts SET
        title = ?, slug = ?, excerpt = ?, content = ?, category = ?, tags = ?, featured_image = ?,
        author_name = ?, status = ?, scheduled_at = ?, focus_keyword = ?, seo_title = ?, seo_description = ?,
        revisions = ?, updated_at = ?
      WHERE id = ?`
    ).run(
      (input.title || existing.title).trim(),
      slugify(input.slug || input.title || existing.slug),
      input.excerpt ?? existing.excerpt,
      input.content ?? existing.content,
      input.category ?? existing.category,
      JSON.stringify(input.tags ?? existing.tags),
      input.featured_image ?? existing.featured_image,
      input.author_name ?? existing.author_name,
      input.status ?? existing.status,
      input.scheduled_at ?? existing.scheduled_at,
      input.focus_keyword ?? existing.focus_keyword,
      input.seo_title ?? existing.seo_title,
      input.seo_description ?? existing.seo_description,
      JSON.stringify(nextRevs),
      now,
      id
    );
    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'post.updated', input.title || existing.title, `Status: ${input.status || existing.status}`);
    res.json({ post: getBlogPosts(true).find((p) => p.id === id) });
  } catch {
    res.status(400).json({ error: 'Slug already exists on another article.' });
  }
});

app.delete('/api/admin/posts/:id', requireAdmin, requireRole('Super Admin', 'Content Editor', 'Author'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM blog_posts WHERE id = ?`).run(id);
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'post.deleted', `Post #${id}`, 'Deleted editorial post');
  res.json({ deleted: true });
});

// Pages CRUD
interface AdminPageInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  template: CmsPageTemplate;
  menu_location: CmsMenuLocation;
  show_products: boolean;
  focus_keyword?: string;
  seo_title?: string;
  seo_description?: string;
  is_published: boolean;
  sort_order: number;
}

app.post('/api/admin/pages', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req: AuthenticatedRequest, res) => {
  const input = req.body as AdminPageInput;
  if (!input.title?.trim()) {
    res.status(400).json({ error: 'Page title is required.' });
    return;
  }
  const baseSlug = slugify(input.slug || input.title);
  const existing = db.prepare(`SELECT id FROM cms_pages WHERE slug = ?`).get(baseSlug);
  const finalSlug = existing ? `${baseSlug}-${Date.now().toString().slice(-3)}` : baseSlug;

  const info = db
    .prepare(
      `INSERT INTO cms_pages (
        title, slug, excerpt, content, template, menu_location, show_products,
        focus_keyword, seo_title, seo_description, is_published, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title.trim(),
      finalSlug,
      (input.excerpt || '').trim(),
      (input.content || '').trim(),
      input.template || 'standard',
      input.menu_location || 'footer',
      input.show_products ? 1 : 0,
      (input.focus_keyword || '').trim(),
      (input.seo_title || input.title).trim(),
      (input.seo_description || input.excerpt || '').trim(),
      input.is_published ? 1 : 0,
      Math.round(Number(input.sort_order) || 10),
      new Date().toISOString()
    );

  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'page.created', input.title.trim(), `Slug /page/${finalSlug}`);
  const created = getCmsPages(true).find((p) => p.id === Number(info.lastInsertRowid));
  res.status(201).json({ page: created });
});

app.put('/api/admin/pages/:id', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const input = req.body as AdminPageInput;
  if (!input.title?.trim()) {
    res.status(400).json({ error: 'Page title is required.' });
    return;
  }
  const finalSlug = slugify(input.slug || input.title);
  try {
    db.prepare(
      `UPDATE cms_pages SET
        title = ?, slug = ?, excerpt = ?, content = ?, template = ?, menu_location = ?,
        show_products = ?, focus_keyword = ?, seo_title = ?, seo_description = ?, is_published = ?, sort_order = ?, updated_at = ?
      WHERE id = ?`
    ).run(
      input.title.trim(),
      finalSlug,
      (input.excerpt || '').trim(),
      (input.content || '').trim(),
      input.template || 'standard',
      input.menu_location || 'footer',
      input.show_products ? 1 : 0,
      (input.focus_keyword || '').trim(),
      (input.seo_title || input.title).trim(),
      (input.seo_description || input.excerpt || '').trim(),
      input.is_published ? 1 : 0,
      Math.round(Number(input.sort_order) || 0),
      new Date().toISOString(),
      id
    );
    const updated = getCmsPages(true).find((p) => p.id === id);
    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'page.updated', input.title.trim(), `Slug /page/${finalSlug}`);
    res.json({ page: updated });
  } catch {
    res.status(400).json({ error: 'Slug already exists on another page.' });
  }
});

app.delete('/api/admin/pages/:id', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req: AuthenticatedRequest, res) => {
  const pageId = Number(req.params.id);
  db.prepare(`DELETE FROM cms_pages WHERE id = ?`).run(pageId);
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'page.deleted', `Page #${pageId}`, 'Deleted CMS page');
  res.json({ deleted: true });
});

// Menus Builder
app.put('/api/admin/menus/:location', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req: AuthenticatedRequest, res) => {
  const location = String(req.params.location);
  if (!['header', 'footer', 'mobile'].includes(location)) {
    res.status(400).json({ error: 'Invalid menu location.' });
    return;
  }
  const { items } = req.body as { items?: NavMenuItem[] };
  db.prepare(`INSERT OR REPLACE INTO cms_menus (location, items) VALUES (?, ?)`).run(
    location,
    JSON.stringify(items || [])
  );
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'menu.updated', location, `Updated ${items?.length || 0} top-level menu items`);
  res.json({ menus: getMenus() });
});

// SEO Redirects
app.post('/api/admin/redirects', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req, res) => {
  const { from_path, to_path, status_code } = req.body as {
    from_path?: string;
    to_path?: string;
    status_code?: 301 | 302;
  };
  const safeFrom = sanitizeInternalPath(from_path);
  const safeTo = sanitizeInternalPath(to_path);
  if (!safeFrom || !safeTo) {
    res.status(400).json({ error: 'Source and target must be valid internal paths starting with /.' });
    return;
  }
  try {
    db.prepare(`INSERT INTO seo_redirects (from_path, to_path, status_code, hits, created_at) VALUES (?, ?, ?, 0, ?)`).run(
      safeFrom,
      safeTo,
      status_code === 302 ? 302 : 301,
      new Date().toISOString()
    );
    res.status(201).json({ redirects: getRedirects() });
  } catch {
    res.status(400).json({ error: 'A redirect for that source path already exists.' });
  }
});

app.delete('/api/admin/redirects/:id', requireAdmin, requireRole('Super Admin', 'Content Editor'), (req, res) => {
  db.prepare(`DELETE FROM seo_redirects WHERE id = ?`).run(Number(req.params.id));
  res.json({ deleted: true });
});

// Plugins Hub
app.patch('/api/admin/plugins/:id', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const id = String(req.params.id);
  const { is_enabled, config } = req.body as {
    is_enabled?: boolean;
    config?: Record<string, string | number | boolean>;
  };
  const existing = getPlugins().find((p) => p.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Plugin not found.' });
    return;
  }
  const nextEnabled = is_enabled !== undefined ? is_enabled : existing.is_enabled;
  const nextConfig = config !== undefined ? config : existing.config;
  db.prepare(`UPDATE cms_plugins SET is_enabled = ?, config = ? WHERE id = ?`).run(
    nextEnabled ? 1 : 0,
    JSON.stringify(nextConfig),
    id
  );
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'plugin.updated', existing.name, `Enabled: ${nextEnabled}`);
  res.json({ plugins: getPlugins() });
});

// Customers CRM Tags
app.patch('/api/admin/customers/:phone/tags', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Customer Support'), (req, res) => {
  const phone = String(req.params.phone);
  const { tags } = req.body as { tags?: string[] };
  db.prepare(`INSERT OR REPLACE INTO customer_tags (phone, tags) VALUES (?, ?)`).run(
    phone,
    JSON.stringify(tags || [])
  );
  res.json({ customers: getCustomersDirectory() });
});

function trimmedNextLengthInvalid(pwd: string): boolean {
  return pwd.length > 0 && pwd.length < 6;
}

// RBAC Users & API Keys
app.post('/api/admin/users', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const { name, email, role, password } = req.body as {
    name?: string;
    email?: string;
    role?: RbacRole;
    password?: string;
  };
  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }
  const trimmedPwd = (password || '').trim();
  if (trimmedNextLengthInvalid(trimmedPwd)) {
    res.status(400).json({ error: 'If setting an initial password, use at least 6 characters.' });
    return;
  }
  const now = new Date().toISOString();
  const status = trimmedPwd ? 'active' : 'invited';
  const pwdHash = trimmedPwd ? hashPassword(trimmedPwd) : null;
  try {
    db.prepare(
      `INSERT INTO rbac_users (name, email, role, status, password_hash, last_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(name.trim(), email.trim().toLowerCase(), role || 'Content Editor', status, pwdHash, now, now);
    const actor = actorOf(req);
    logAudit(
      actor.name,
      actor.role,
      trimmedPwd ? 'user.created' : 'user.invited',
      email.trim().toLowerCase(),
      `Assigned role ${role || 'Content Editor'} (${status})`
    );
    res.status(201).json({ users: getRbacUsers() });
  } catch {
    res.status(400).json({ error: 'User with that email already exists.' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { role, status, password } = req.body as {
    role?: RbacRole;
    status?: 'active' | 'invited';
    password?: string;
  };
  if (password !== undefined) {
    const trimmed = password.trim();
    if (trimmed.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    setRbacUserPassword(id, trimmed);
  }
  if (role) db.prepare(`UPDATE rbac_users SET role = ? WHERE id = ?`).run(role, id);
  if (status) db.prepare(`UPDATE rbac_users SET status = ? WHERE id = ?`).run(status, id);
  const actor = actorOf(req);
  logAudit(
    actor.name,
    actor.role,
    password !== undefined ? 'user.password_updated' : 'user.role_updated',
    `User #${id}`,
    `Role: ${role || 'unchanged'}${password !== undefined ? ' · password reset' : ''}`
  );
  res.json({ users: getRbacUsers() });
});

app.delete('/api/admin/users/:id', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const target = db
    .prepare(`SELECT id, email, role FROM rbac_users WHERE id = ?`)
    .get(id) as { id: number; email: string; role: RbacRole } | undefined;
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.role === 'Super Admin') {
    const superCount = db
      .prepare(`SELECT COUNT(*) as cnt FROM rbac_users WHERE role = 'Super Admin'`)
      .get() as { cnt: number };
    if (superCount.cnt <= 1) {
      res.status(400).json({ error: 'Cannot delete the last Super Admin account.' });
      return;
    }
  }
  db.prepare(`DELETE FROM rbac_users WHERE id = ?`).run(id);
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'user.deleted', target.email, `Removed ${target.role}`);
  res.json({ deleted: true });
});

app.post('/api/admin/api-keys', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const { name, permissions } = req.body as { name?: string; permissions?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Key name is required.' });
    return;
  }
  const rawSecret = `msh_live_${crypto.randomBytes(16).toString('hex')}`;
  const preview = `${rawSecret.slice(0, 12)}••••••${rawSecret.slice(-4)}`;
  const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
  db.prepare(`INSERT INTO api_keys (name, key_preview, key_hash, permissions, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    name.trim(),
    preview,
    keyHash,
    permissions || 'catalog:read, orders:read',
    new Date().toISOString()
  );
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'apikey.generated', name.trim(), 'Generated new API key');
  res.status(201).json({ secret: rawSecret, apiKeys: getApiKeys() });
});

app.delete('/api/admin/api-keys/:id', requireAdmin, requireRole('Super Admin'), (req, res) => {
  db.prepare(`DELETE FROM api_keys WHERE id = ?`).run(Number(req.params.id));
  res.json({ deleted: true });
});

// Reviews Moderation
app.patch('/api/admin/reviews/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Content Editor', 'Customer Support'), (req, res) => {
  const id = Number(req.params.id);
  const { is_approved, status, admin_reply } = req.body as {
    is_approved?: boolean;
    status?: 'approved' | 'pending' | 'spam' | 'trashed';
    admin_reply?: string | null;
  };
  const nextStatus = status || (is_approved ? 'approved' : 'pending');
  const nextApproved = nextStatus === 'approved' ? 1 : 0;
  db.prepare(`UPDATE reviews SET status = ?, is_approved = ?, admin_reply = ? WHERE id = ?`).run(
    nextStatus,
    nextApproved,
    admin_reply?.trim() || null,
    id
  );
  res.json({ updated: true });
});

app.delete('/api/admin/reviews/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Content Editor', 'Customer Support'), (req, res) => {
  db.prepare(`DELETE FROM reviews WHERE id = ?`).run(Number(req.params.id));
  res.json({ deleted: true });
});

// Return Requests Management
app.patch('/api/admin/returns/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Customer Support'), (req, res) => {
  const id = Number(req.params.id);
  const { status, admin_note } = req.body as { status?: ReturnStatus; admin_note?: string | null };
  const valid: ReturnStatus[] = ['requested', 'approved', 'pickup_scheduled', 'completed', 'rejected'];
  if (!status || !valid.includes(status)) {
    res.status(400).json({ error: 'Invalid return status.' });
    return;
  }
  db.prepare(`UPDATE return_requests SET status = ?, admin_note = ? WHERE id = ?`).run(
    status,
    admin_note?.trim() || null,
    id
  );
  res.json({ updated: true });
});

// Contact Messages Inbox
app.patch('/api/admin/messages/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Customer Support'), (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status?: 'unread' | 'replied' | 'resolved' };
  db.prepare(`UPDATE contact_messages SET status = ? WHERE id = ?`).run(status || 'resolved', id);
  res.json({ updated: true });
});

app.delete('/api/admin/messages/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Customer Support'), (req, res) => {
  db.prepare(`DELETE FROM contact_messages WHERE id = ?`).run(Number(req.params.id));
  res.json({ deleted: true });
});

// Order Status, Tracking & Notes
app.patch('/api/admin/orders/:id/status', requireAdmin, requireRole('Super Admin', 'Shop Manager', 'Customer Support'), (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const { status, tracking_number, internal_notes, payment_status } = req.body as {
    status?: OrderStatus;
    tracking_number?: string | null;
    internal_notes?: string | null;
    payment_status?: 'paid' | 'pending' | 'refunded';
  };
  const validStatuses: OrderStatus[] = [
    'pending',
    'processing',
    'confirmed',
    'packed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid order status.' });
    return;
  }

  const order = db.prepare(`SELECT id, order_number, status, promo_code FROM orders WHERE id = ?`).get(orderId) as
    | { id: number; order_number: string; status: OrderStatus; promo_code: string | null }
    | undefined;
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  try {
    db.transaction(() => {
      if (status) {
        const wasInactive = order.status === 'cancelled' || order.status === 'refunded';
        const willBeInactive = status === 'cancelled' || status === 'refunded';

        if (!wasInactive && willBeInactive) {
          const items = db
            .prepare(`SELECT variant_id, quantity, pack_details FROM order_items WHERE order_id = ?`)
            .all(orderId) as Array<{ variant_id: number | null; quantity: number; pack_details: string | null }>;
          const restore = db.prepare(`UPDATE product_variants SET stock = stock + ? WHERE id = ?`);
          for (const item of items) {
            if (item.variant_id) {
              restore.run(item.quantity, item.variant_id);
            } else if (item.pack_details) {
              const parsed = parsePackDetails(item.pack_details);
              for (const packVar of parsed.items) {
                restore.run(packVar.qty * item.quantity, packVar.variant_id);
              }
            }
          }
          if (order.promo_code) {
            db.prepare(`UPDATE promo_codes SET usage_count = MAX(0, usage_count - 1) WHERE code = ?`).run(order.promo_code);
          }
        } else if (wasInactive && !willBeInactive) {
          const items = db
            .prepare(`SELECT variant_id, quantity, pack_details FROM order_items WHERE order_id = ?`)
            .all(orderId) as Array<{ variant_id: number | null; quantity: number; pack_details: string | null }>;
          const variantAdjustments = new Map<number, number>();
          for (const item of items) {
            if (item.variant_id) {
              variantAdjustments.set(item.variant_id, (variantAdjustments.get(item.variant_id) ?? 0) + item.quantity);
            } else if (item.pack_details) {
              const parsed = parsePackDetails(item.pack_details);
              for (const packVar of parsed.items) {
                variantAdjustments.set(
                  packVar.variant_id,
                  (variantAdjustments.get(packVar.variant_id) ?? 0) + packVar.qty * item.quantity
                );
              }
            }
          }
          const getStock = db.prepare(`SELECT stock, color_name, size FROM product_variants WHERE id = ?`);
          const deduct = db.prepare(`UPDATE product_variants SET stock = stock - ? WHERE id = ?`);
          for (const [vid, needed] of variantAdjustments.entries()) {
            const vRow = getStock.get(vid) as { stock: number; color_name: string; size: string } | undefined;
            if (!vRow) continue;
            if (vRow.stock < needed) {
              throw new Error(`Insufficient stock (${vRow.stock} left, need ${needed}) to reactivate ${vRow.color_name} · ${vRow.size}.`);
            }
            deduct.run(needed, vid);
          }
          if (order.promo_code) {
            db.prepare(`UPDATE promo_codes SET usage_count = usage_count + 1 WHERE code = ?`).run(order.promo_code);
          }
        }

        db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, orderId);
      }
      if (tracking_number !== undefined) {
        db.prepare(`UPDATE orders SET tracking_number = ? WHERE id = ?`).run(tracking_number, orderId);
      }
      if (internal_notes !== undefined) {
        db.prepare(`UPDATE orders SET internal_notes = ? WHERE id = ?`).run(internal_notes, orderId);
      }
      if (payment_status !== undefined) {
        db.prepare(`UPDATE orders SET payment_status = ? WHERE id = ?`).run(payment_status, orderId);
      }
    })();

    const actor = actorOf(req);
    logAudit(actor.name, actor.role, 'order.updated', order.order_number, `Status: ${status || order.status}`);
    const updated = getOrders().find((o) => o.id === orderId);
    res.json({ order: updated });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to update order status.' });
  }
});

app.put('/api/admin/cms', requireAdmin, requireRole('Super Admin'), (req: AuthenticatedRequest, res) => {
  const body = req.body as { cms?: ReturnType<typeof getCmsSettings> };
  const updatedCms = body.cms ? updateCmsSettings(body.cms) : getCmsSettings();
  const actor = actorOf(req);
  logAudit(actor.name, actor.role, 'settings.saved', 'CMS Settings', 'Updated site configuration & theme settings');
  res.json({ cms: updatedCms });
});

app.post('/api/admin/promos', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req, res) => {
  const { code, discount_type, discount_value, min_subtotal, usage_limit, expires_at } = req.body as {
    code?: string;
    discount_type?: 'percent' | 'fixed' | 'free_shipping';
    discount_value?: number;
    min_subtotal?: number;
    usage_limit?: number | null;
    expires_at?: string | null;
  };
  const cleanCode = (code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (cleanCode.length < 3) {
    res.status(400).json({ error: 'Promo code must be at least 3 alphanumeric characters.' });
    return;
  }
  const type =
    discount_type === 'fixed' || discount_type === 'free_shipping' ? discount_type : 'percent';
  const value = type === 'free_shipping' ? 0 : Math.max(1, Math.round(Number(discount_value) || 0));
  const minSub = Math.max(0, Math.round(Number(min_subtotal) || 0));

  try {
    const info = db
      .prepare(
        `INSERT INTO promo_codes (code, discount_type, discount_value, min_subtotal, usage_limit, expires_at, is_active, usage_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)`
      )
      .run(
        cleanCode,
        type,
        value,
        minSub,
        usage_limit ? Math.round(Number(usage_limit)) : null,
        expires_at || null,
        new Date().toISOString()
      );
    const promo = getPromos(true).find((p) => p.id === Number(info.lastInsertRowid));
    res.status(201).json({ promo });
  } catch {
    res.status(400).json({ error: 'A promo code with that name already exists.' });
  }
});

app.patch('/api/admin/promos/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body as { is_active?: boolean };
  db.prepare(`UPDATE promo_codes SET is_active = ? WHERE id = ?`).run(is_active ? 1 : 0, id);
  const promo = getPromos(true).find((p) => p.id === id);
  res.json({ promo });
});

app.delete('/api/admin/promos/:id', requireAdmin, requireRole('Super Admin', 'Shop Manager'), (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM promo_codes WHERE id = ?`).run(id);
  res.json({ deleted: true });
});

// One-click JSON Backup Export
app.get('/api/admin/export', requireAdmin, requireRole('Super Admin'), (_req, res) => {
  const payload = {
    exported_at: new Date().toISOString(),
    cms: getCmsSettings(),
    products: getProducts(true),
    orders: getOrders(),
    pages: getCmsPages(true),
    posts: getBlogPosts(true),
    menus: getMenus(),
    promos: getPromos(true),
    redirects: getRedirects(),
    plugins: getPlugins(),
    users: getRbacUsers(),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="mashuka-backup.json"');
  res.json(payload);
});

// JSON error handler for Multer / request errors
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err && (req.path.startsWith('/api/') || err instanceof multer.MulterError)) {
    const message = err instanceof Error ? err.message : 'Request failed.';
    res.status(400).json({ error: message });
    return;
  }
  next(err);
});

// ---------- SEO REDIRECTS & VITE / STATIC PRODUCTION SERVING ----------

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const reqPath = req.path;
  if (
    reqPath.startsWith('/api/') ||
    reqPath.startsWith('/uploads/') ||
    reqPath.startsWith('/assets/') ||
    reqPath.startsWith('/@') ||
    reqPath.startsWith('/src/') ||
    reqPath.startsWith('/node_modules/')
  ) {
    return next();
  }
  const match = db
    .prepare(`SELECT id, to_path, status_code FROM seo_redirects WHERE from_path = ?`)
    .get(reqPath) as { id: number; to_path: string; status_code: number } | undefined;
  const safeTarget = sanitizeInternalPath(match?.to_path);
  if (match && safeTarget && safeTarget !== reqPath) {
    db.prepare(`UPDATE seo_redirects SET hits = hits + 1 WHERE id = ?`).run(match.id);
    res.redirect(match.status_code === 302 ? 302 : 301, safeTarget);
    return;
  }
  next();
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mashuka Storefront & Hybrid CMS listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
