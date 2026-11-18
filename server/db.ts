import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AdminSessionUser,
  ApiKeyEntry,
  AuditLogEntry,
  BlogPost,
  BlogPostStatus,
  CmsMenuLocation,
  CmsPage,
  CmsPageTemplate,
  CmsPlugin,
  CmsSettings,
  ContactMessage,
  CustomerRecord,
  MediaItem,
  NavMenu,
  NavMenuItem,
  Order,
  OrderItem,
  OrderStatus,
  PostRevision,
  Product,
  ProductAudience,
  ProductCategory,
  ProductReview,
  ProductStatus,
  ProductType,
  ProductVariant,
  PromoCode,
  RbacRole,
  RbacUser,
  ReturnRequest,
  ReturnStatus,
  SeoRedirect,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'store.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const MASHUKA_LOGO_URL =
  '/assets/aistudio/704406709_1464180652388606_5677980754333459053_n_b876eed7.jpg';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

const DEFAULT_CMS: CmsSettings = {
  brand_name: 'Mashuka',
  brand_slogan: 'Desire your Wear',
  logo_url: MASHUKA_LOGO_URL,
  favicon_url: MASHUKA_LOGO_URL,
  primary_color: '#0D1B54',
  accent_color: '#1D4ED8',
  heading_font: 'Plus Jakarta Sans',
  body_font: 'DM Sans',
  header_layout: 'classic',
  footer_layout: '4-column',
  currency_symbol: '৳',
  timezone: 'Asia/Dhaka',
  maintenance_mode: false,
  announcement_text:
    'Mashuka — Desire your Wear · Free delivery over ৳1,200 · Cash on Delivery, bKash & Nagad accepted',
  hero_kicker: 'Mashuka · Desire your Wear',
  hero_title: 'Everyday socks built for long commutes and clean fits.',
  hero_subtitle:
    'Combed-cotton crew, ankle, no-show, athletic, and kids pairs designed for Bangladesh comfort.',
  hero_cta_label: 'Shop Collection',
  hero_image_url: '/src/assets/images/hero_socks_campaign_1795008499974.jpg',
  craft_heading: 'Engineered from the yarn up.',
  craft_subheading:
    'Every Mashuka pair blends long-staple combed cotton with Lycra recovery spandex so cuffs never sag after fifty washes.',
  craft_pillars: [
    {
      title: 'Long-Staple Combed Cotton',
      description:
        'Short fibers are combed away for a smoother surface that resists pilling and breathes through warm weather.',
      metric: '82% Cotton',
    },
    {
      title: 'Hand-Linked Seamless Toe',
      description:
        'Zero bulky toe seam ridge inside loafers, dress shoes, or running sneakers during twelve-hour days.',
      metric: 'Zero Chafe',
    },
    {
      title: 'Anti-Slip Heel & Arch Support',
      description:
        'Medical-grade silicone heel grips on no-show cuts and targeted midfoot compression on crew and sports pairs.',
      metric: 'Stay-Put Fit',
    },
  ],
  size_chart_rows: [
    {
      group: 'Baby & Toddler',
      size_label: 'Baby S (0-12M)',
      uk_size: 'UK 0 - 3',
      eu_size: 'EU 16 - 19',
      us_size: 'US 1 - 4',
      foot_cm: '9 - 11 cm',
      age_note: '0 - 12 Months',
    },
    {
      group: 'Kids',
      size_label: 'Kids M (2-5Y)',
      uk_size: 'UK 4 - 8.5',
      eu_size: 'EU 20 - 26',
      us_size: 'US 5 - 9',
      foot_cm: '12 - 16 cm',
      age_note: '2 - 5 Years',
    },
    {
      group: 'Kids',
      size_label: 'Junior L (6-12Y)',
      uk_size: 'UK 9 - 2',
      eu_size: 'EU 27 - 34',
      us_size: 'US 10 - 3Y',
      foot_cm: '17 - 21.5 cm',
      age_note: '6 - 12 Years',
    },
    {
      group: 'Women',
      size_label: 'Women Free Size',
      uk_size: 'UK 3.5 - 7',
      eu_size: 'EU 36 - 40',
      us_size: 'US 5.5 - 9',
      foot_cm: '22 - 25.5 cm',
      age_note: 'Standard Women Fit',
    },
    {
      group: 'Men & Unisex',
      size_label: 'UK 6-9 (Regular)',
      uk_size: 'UK 6 - 9',
      eu_size: 'EU 39 - 43',
      us_size: 'US 7 - 10',
      foot_cm: '24.5 - 27.5 cm',
      age_note: 'Standard Adult Fit',
    },
    {
      group: 'Men & Unisex',
      size_label: 'UK 9-12 (Large)',
      uk_size: 'UK 9 - 12',
      eu_size: 'EU 43 - 46',
      us_size: 'US 10 - 13',
      foot_cm: '27.5 - 30 cm',
      age_note: 'Extended Adult Fit',
    },
  ],
  size_chart_notes:
    'Measure from heel to longest toe while standing flat on paper. If you are between sizes, choose the larger size for crew socks or the closer fit for invisible no-show socks.',
  dhaka_shipping_fee: 60,
  outside_dhaka_shipping_fee: 120,
  free_shipping_threshold: 1200,
  tax_rate_pct: 0,
  low_stock_threshold: 12,
  pack_3_discount_pct: 12,
  pack_5_discount_pct: 20,
  cod_enabled: true,
  mobile_banking_enabled: true,
  stripe_enabled: false,
  paypal_enabled: false,
  bkash_number: '01700-000000',
  nagad_number: '01800-000000',
  bkash_instructions:
    'Send Money (Personal) to 01700-000000 and enter your sender number and 10-character TrxID below.',
  nagad_instructions:
    'Send Money (Personal) to 01800-000000 and enter your sender number and 10-character TrxID below.',
  support_whatsapp: '+8801700000000',
  support_email: 'support@mashuka.com.bd',
  store_address: 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh',
  sitemap_enabled: true,
  robots_txt: `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://mashuka.com.bd/sitemap.xml`,
  smtp_host: 'smtp.mashuka.com.bd',
  smtp_from: 'Mashuka Store <orders@mashuka.com.bd>',
  smtp_templates: [
    {
      id: 'order_confirmation',
      name: 'Order Confirmation',
      subject: 'Order {{order_number}} Confirmed — Mashuka',
      body: 'Hi {{customer_name}}, thank you for shopping with Mashuka (Desire your Wear). Your order total is {{total}}.',
    },
    {
      id: 'shipping_update',
      name: 'Shipping Update',
      subject: 'Your Mashuka Parcel {{order_number}} Has Shipped',
      body: 'Hi {{customer_name}}, your parcel is on the way via {{courier}} (Tracking: {{tracking_number}}).',
    },
    {
      id: 'password_reset',
      name: 'Admin Password Reset',
      subject: 'Mashuka Admin Security Reset',
      body: 'Use the secure link below within 15 minutes to reset your Mashuka CMS password.',
    },
  ],
};

function addColumnIfMissing(table: string, col: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
  }
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cms_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'variable',
      status TEXT NOT NULL DEFAULT 'active',
      category TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'unisex',
      display_pages TEXT NOT NULL DEFAULT '["home","socks"]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      short_description TEXT NOT NULL,
      fabric_specs TEXT NOT NULL,
      price INTEGER NOT NULL,
      compare_at_price INTEGER,
      cost_price INTEGER,
      sale_start TEXT,
      sale_end TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      gallery_urls TEXT NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_bundle INTEGER NOT NULL DEFAULT 0,
      bundle_pairs INTEGER NOT NULL DEFAULT 1,
      is_pack_eligible INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      focus_keyword TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT UNIQUE NOT NULL,
      color_name TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      size TEXT NOT NULL,
      material TEXT NOT NULL DEFAULT 'Combed Cotton',
      price_override INTEGER,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value INTEGER NOT NULL,
      min_subtotal INTEGER NOT NULL DEFAULT 0,
      usage_limit INTEGER,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_zone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      notes TEXT,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      tracking_number TEXT,
      internal_notes TEXT,
      wallet_sender TEXT,
      wallet_trx_id TEXT,
      subtotal INTEGER NOT NULL,
      promo_code TEXT,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      shipping_fee INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      variant_id INTEGER,
      item_name TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      pack_details TEXT
    );

    CREATE TABLE IF NOT EXISTS cms_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      template TEXT NOT NULL DEFAULT 'standard',
      menu_location TEXT NOT NULL DEFAULT 'footer',
      show_products INTEGER NOT NULL DEFAULT 0,
      focus_keyword TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Craft & Yarn',
      tags TEXT NOT NULL DEFAULT '[]',
      featured_image TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT 'Fatin Hasnat',
      status TEXT NOT NULL DEFAULT 'published',
      scheduled_at TEXT,
      views_count INTEGER NOT NULL DEFAULT 0,
      focus_keyword TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      revisions TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cms_menus (
      location TEXT PRIMARY KEY,
      items TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_metadata (
      url TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      alt_text TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      status_code INTEGER NOT NULL DEFAULT 301,
      hits INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cms_plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      version TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS rbac_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_active TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key_preview TEXT NOT NULL,
      permissions TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_tags (
      phone TEXT PRIMARY KEY,
      tags TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_city TEXT NOT NULL DEFAULT 'Dhaka',
      rating INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      is_approved INTEGER NOT NULL DEFAULT 0,
      admin_reply TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS return_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT UNIQUE NOT NULL,
      order_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      reason TEXT NOT NULL,
      resolution TEXT NOT NULL DEFAULT 'exchange',
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      admin_note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL
    );
  `);

  // Safe migrations for pre-existing tables
  addColumnIfMissing('products', 'product_type', `TEXT NOT NULL DEFAULT 'variable'`);
  addColumnIfMissing('products', 'status', `TEXT NOT NULL DEFAULT 'active'`);
  addColumnIfMissing('products', 'cost_price', `INTEGER`);
  addColumnIfMissing('products', 'sale_start', `TEXT`);
  addColumnIfMissing('products', 'sale_end', `TEXT`);
  addColumnIfMissing('products', 'tags', `TEXT NOT NULL DEFAULT '[]'`);
  addColumnIfMissing('products', 'gallery_urls', `TEXT NOT NULL DEFAULT '[]'`);
  addColumnIfMissing('products', 'focus_keyword', `TEXT NOT NULL DEFAULT ''`);
  addColumnIfMissing('products', 'seo_title', `TEXT NOT NULL DEFAULT ''`);
  addColumnIfMissing('products', 'seo_description', `TEXT NOT NULL DEFAULT ''`);

  addColumnIfMissing('product_variants', 'material', `TEXT NOT NULL DEFAULT 'Combed Cotton'`);
  addColumnIfMissing('product_variants', 'price_override', `INTEGER`);

  addColumnIfMissing('promo_codes', 'usage_limit', `INTEGER`);
  addColumnIfMissing('promo_codes', 'expires_at', `TEXT`);

  addColumnIfMissing('orders', 'payment_status', `TEXT NOT NULL DEFAULT 'pending'`);
  addColumnIfMissing('orders', 'tracking_number', `TEXT`);
  addColumnIfMissing('orders', 'internal_notes', `TEXT`);
  addColumnIfMissing('orders', 'tax_amount', `INTEGER NOT NULL DEFAULT 0`);

  addColumnIfMissing('cms_pages', 'focus_keyword', `TEXT NOT NULL DEFAULT ''`);
  addColumnIfMissing('reviews', 'status', `TEXT NOT NULL DEFAULT 'approved'`);
  addColumnIfMissing('rbac_users', 'password_hash', `TEXT`);

  const existingCms = db.prepare(`SELECT value FROM cms_settings WHERE key = 'public_cms'`).get() as
    | { value: string }
    | undefined;
  if (!existingCms) {
    db.prepare(`INSERT INTO cms_settings (key, value) VALUES (?, ?)`).run(
      'public_cms',
      JSON.stringify(DEFAULT_CMS)
    );
  } else {
    try {
      const parsed = JSON.parse(existingCms.value) as Partial<CmsSettings>;
      const merged = { ...DEFAULT_CMS, ...parsed };
      db.prepare(`INSERT OR REPLACE INTO cms_settings (key, value) VALUES ('public_cms', ?)`).run(
        JSON.stringify(merged)
      );
    } catch {
      // keep existing
    }
  }

  const existingAuth = db.prepare(`SELECT value FROM cms_settings WHERE key = 'admin_password_hash'`).get() as
    | { value: string }
    | undefined;
  if (!existingAuth) {
    db.prepare(`INSERT INTO cms_settings (key, value) VALUES (?, ?)`).run(
      'admin_password_hash',
      hashPassword('admin123')
    );
  }

  seedEnterpriseCmsIfNeeded();
}

function seedEnterpriseCmsIfNeeded(): void {
  const now = new Date().toISOString();

  // Seed blog posts
  const postCount = (db.prepare(`SELECT COUNT(*) as cnt FROM blog_posts`).get() as { cnt: number }).cnt;
  if (postCount === 0) {
    const insertPost = db.prepare(`
      INSERT INTO blog_posts (
        title, slug, excerpt, content, category, tags, featured_image, author_name,
        status, scheduled_at, views_count, focus_keyword, seo_title, seo_description,
        revisions, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const samplePosts = [
      {
        title: 'Why 82% Combed Cotton Beats Synthetic Blends in Dhaka Humidity',
        slug: 'why-combed-cotton-beats-synthetic-blends',
        excerpt:
          'Long-staple combed cotton allows airflow and moisture absorption without trapping heat inside leather shoes or sneakers.',
        content: `## Breathability Matters in Tropical Commutes\n\nWalking through Dhaka traffic or spending ten hours at the office demands yarn that breathes. Standard polyester-heavy socks trap heat and cause odor by midday.\n\n## What Makes Combed Cotton Different\n\n- **Long-Staple Fibers:** Short, brittle fibers are combed out before spinning, leaving a smoother and stronger thread.\n- **Lycra Recovery:** Blending 3% elastane keeps the ribbed cuff snug without digging into your ankle.\n\n> Comfort starts from the ground up — Desire your Wear with breathable everyday essentials.`,
        category: 'Craft & Yarn',
        tags: ['combed-cotton', 'dhaka', 'breathability'],
        featured_image: '/src/assets/images/hero_socks_campaign_1795008499974.jpg',
        author_name: 'Fatin Hasnat',
        status: 'published',
        views_count: 1420,
        focus_keyword: 'combed cotton socks',
      },
      {
        title: 'Crew vs. Ankle vs. No-Show: Picking the Right Cut for Every Shoe',
        slug: 'crew-vs-ankle-vs-noshow-guide',
        excerpt:
          'A clean styling and comfort breakdown for loafers, running sneakers, formal derbies, and daily casual wear.',
        content: `## Matching Socks to Footwear\n\nChoosing the right sock height keeps your silhouette clean and prevents heel blisters.\n\n### 1. Ribbed Crew Socks\n\nBest paired with formal trousers, chinos, boots, or retro court sneakers.\n\n### 2. Invisible No-Show Socks\n\nEngineered with triple silicone heel grips so your loafers stay sockless-looking without slipping.`,
        category: 'Style Guide',
        tags: ['style-guide', 'no-show', 'crew-socks'],
        featured_image: '/src/assets/images/sock_noshow_invisible_1795008501930.jpg',
        author_name: 'Nadia Karim',
        status: 'published',
        views_count: 980,
        focus_keyword: 'no-show socks guide',
      },
      {
        title: 'Inside Mashuka 200-Needle Seamless Toe Knitting',
        slug: 'inside-mashuka-seamless-toe-knitting',
        excerpt:
          'How finer gauge needles and hand-linked toe closures eliminate the bulky ridge inside tight dress shoes.',
        content: `## Precision Knitting in Action\n\nHigher needle counts mean denser stitches, sharper ribbing, and a softer hand-feel against sensitive toes.\n\n- Zero bulky toe seam friction\n- Reinforced heel pocket for longer wear life`,
        category: 'Manufacturing',
        tags: ['knitting', 'seamless-toe'],
        featured_image: '/src/assets/images/sock_crew_ribbed_1795008504482.jpg',
        author_name: 'Fatin Hasnat',
        status: 'published',
        views_count: 745,
        focus_keyword: 'seamless toe socks',
      },
      {
        title: 'Eid Gift Box Launch: Curating 4-Pair Essentials Sets',
        slug: 'eid-gift-box-essentials-launch',
        excerpt:
          'Previewing our upcoming rigid matte charcoal gift box designed for corporate and family gifting across Bangladesh.',
        content: `## Thoughtful Everyday Gifting\n\nOur 4-Pair Everyday Essentials Box pairs four timeless tones — Jet Black, Olive, Warm Oatmeal, and Deep Navy — in a presentation-ready box.`,
        category: 'Announcements',
        tags: ['gift-box', 'bundles'],
        featured_image: '/src/assets/images/sock_bundle_box_1795008503521.jpg',
        author_name: 'Tasnim Akter',
        status: 'scheduled',
        views_count: 112,
        focus_keyword: 'sock gift box bangladesh',
      },
    ];

    for (const p of samplePosts) {
      const revs: PostRevision[] = [
        {
          id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          saved_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          author: p.author_name,
          title: p.title,
          content: p.content,
        },
      ];
      insertPost.run(
        p.title,
        p.slug,
        p.excerpt,
        p.content,
        p.category,
        JSON.stringify(p.tags),
        p.featured_image,
        p.author_name,
        p.status,
        p.status === 'scheduled' ? new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString() : null,
        p.views_count,
        p.focus_keyword,
        `${p.title} | Mashuka`,
        p.excerpt,
        JSON.stringify(revs),
        now,
        now
      );
    }
  }

  // Seed Menus
  const menuCount = (db.prepare(`SELECT COUNT(*) as cnt FROM cms_menus`).get() as { cnt: number }).cnt;
  if (menuCount === 0) {
    const headerMenu: NavMenuItem[] = [
      { id: 'm1', label: 'Men', url: '/men', type: 'category', children: [] },
      { id: 'm2', label: 'Women', url: '/women', type: 'category', children: [] },
      { id: 'm3', label: 'Kids & Baby', url: '/kids-baby', type: 'category', children: [] },
      {
        id: 'm4',
        label: 'Socks',
        url: '/socks',
        type: 'category',
        children: [
          { id: 'm4-1', label: 'Crew Socks', url: '/socks', type: 'category', children: [] },
          { id: 'm4-2', label: 'No-Show Socks', url: '/socks', type: 'category', children: [] },
        ],
      },
      { id: 'm5', label: 'Size Chart', url: '/size-chart', type: 'page', children: [] },
    ];
    const footerMenu: NavMenuItem[] = [
      { id: 'f1', label: 'About Us', url: '/page/about-us', type: 'page', children: [] },
      { id: 'f2', label: 'Contact Us', url: '/page/contact-us', type: 'page', children: [] },
      { id: 'f3', label: 'Privacy Policy', url: '/page/privacy-policy', type: 'page', children: [] },
      { id: 'f4', label: 'Terms & Conditions', url: '/page/terms-and-conditions', type: 'page', children: [] },
      { id: 'f5', label: 'Return & Refund Policy', url: '/page/return-refund-policy', type: 'page', children: [] },
    ];
    const mobileMenu: NavMenuItem[] = [...headerMenu];

    db.prepare(`INSERT INTO cms_menus (location, items) VALUES (?, ?)`).run('header', JSON.stringify(headerMenu));
    db.prepare(`INSERT INTO cms_menus (location, items) VALUES (?, ?)`).run('footer', JSON.stringify(footerMenu));
    db.prepare(`INSERT INTO cms_menus (location, items) VALUES (?, ?)`).run('mobile', JSON.stringify(mobileMenu));
  }

  // Seed Redirects
  const redirCount = (db.prepare(`SELECT COUNT(*) as cnt FROM seo_redirects`).get() as { cnt: number }).cnt;
  if (redirCount === 0) {
    db.prepare(`INSERT INTO seo_redirects (from_path, to_path, status_code, hits, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      '/old-crew-socks',
      '/socks',
      301,
      48,
      now
    );
    db.prepare(`INSERT INTO seo_redirects (from_path, to_path, status_code, hits, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      '/sizing',
      '/size-chart',
      301,
      119,
      now
    );
  }

  // Seed Plugins
  const pluginCount = (db.prepare(`SELECT COUNT(*) as cnt FROM cms_plugins`).get() as { cnt: number }).cnt;
  if (pluginCount === 0) {
    const insertPlugin = db.prepare(
      `INSERT INTO cms_plugins (id, name, description, category, version, is_enabled, config) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const plugins: CmsPlugin[] = [
      {
        id: 'newsletter-popup',
        name: 'Newsletter & First-Order Popup',
        description: 'Capture shopper emails after 10s dwell and issue an automatic WELCOME10 coupon.',
        category: 'Marketing',
        version: '2.1.0',
        is_enabled: false,
        config: { delay_seconds: 12, offer_code: 'WELCOME10', headline: 'Get 10% off your first Mashuka pack' },
      },
      {
        id: 'abandoned-cart',
        name: 'Abandoned Cart Recovery',
        description: 'Send automated WhatsApp/Email reminders when checkout is started but not completed.',
        category: 'Conversion',
        version: '1.4.2',
        is_enabled: true,
        config: { trigger_minutes: 45, include_coupon: false },
      },
      {
        id: 'auto-backups',
        name: 'Automated SQLite Snapshots',
        description: 'Schedule daily snapshots of data/store.db and uploaded media assets.',
        category: 'Operations',
        version: '1.0.8',
        is_enabled: true,
        config: { frequency: 'daily', retain_copies: 7 },
      },
      {
        id: 'schema-jsonld',
        name: 'Rich Product Schema (JSON-LD)',
        description: 'Inject Google Merchant BDT price, stock availability, and review stars automatically.',
        category: 'SEO',
        version: '3.0.1',
        is_enabled: true,
        config: { include_reviews: true, currency: 'BDT' },
      },
      {
        id: 'bkash-webhook',
        name: 'bKash & Nagad Reference Helper',
        description: 'Format and validate 10-character TrxID patterns during mobile wallet checkout.',
        category: 'Payments',
        version: '1.2.0',
        is_enabled: true,
        config: { strict_trx_length: true },
      },
    ];
    for (const pl of plugins) {
      insertPlugin.run(pl.id, pl.name, pl.description, pl.category, pl.version, pl.is_enabled ? 1 : 0, JSON.stringify(pl.config));
    }
  }

  // Seed RBAC Users
  const userCount = (db.prepare(`SELECT COUNT(*) as cnt FROM rbac_users`).get() as { cnt: number }).cnt;
  if (userCount === 0) {
    const insertUser = db.prepare(
      `INSERT INTO rbac_users (name, email, role, status, last_active, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertUser.run('Fatin Hasnat', 'fatinhasnatdjs@gmail.com', 'Super Admin', 'active', now, now);
    insertUser.run('Nadia Karim', 'nadia@mashuka.com.bd', 'Shop Manager', 'active', new Date(Date.now() - 3600 * 1000 * 2).toISOString(), now);
    insertUser.run('Tasnim Akter', 'tasnim@mashuka.com.bd', 'Content Editor', 'active', new Date(Date.now() - 3600 * 1000 * 5).toISOString(), now);
    insertUser.run('Rafiq Ahmed', 'rafiq@mashuka.com.bd', 'Author', 'active', new Date(Date.now() - 3600 * 1000 * 24).toISOString(), now);
    insertUser.run('Sabbir Hossain', 'support@mashuka.com.bd', 'Customer Support', 'active', new Date(Date.now() - 3600 * 1000 * 3).toISOString(), now);
  }

  // Seed Audit Logs
  const logCount = (db.prepare(`SELECT COUNT(*) as cnt FROM audit_logs`).get() as { cnt: number }).cnt;
  if (logCount === 0) {
    const insertLog = db.prepare(
      `INSERT INTO audit_logs (actor_name, actor_role, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertLog.run('Fatin Hasnat', 'Super Admin', 'brand.updated', 'Mashuka Identity', 'Updated brand name to Mashuka and slogan to Desire your Wear', new Date(Date.now() - 1000 * 60 * 30).toISOString());
    insertLog.run('Nadia Karim', 'Shop Manager', 'product.stock_adjusted', 'Signature Ribbed Crew Socks', 'Updated UK 6-9 Jet Black stock to 42 units', new Date(Date.now() - 1000 * 60 * 120).toISOString());
    insertLog.run('Tasnim Akter', 'Content Editor', 'post.published', 'Why 82% Combed Cotton Beats Synthetic Blends', 'Published article to Craft & Yarn category', new Date(Date.now() - 1000 * 60 * 240).toISOString());
    insertLog.run('Sabbir Hossain', 'Customer Support', 'order.status_changed', 'MSH-1002', 'Confirmed Cash on Delivery dispatch to Uttara', new Date(Date.now() - 1000 * 60 * 360).toISOString());
  }

  // Seed API Keys
  const keyCount = (db.prepare(`SELECT COUNT(*) as cnt FROM api_keys`).get() as { cnt: number }).cnt;
  if (keyCount === 0) {
    db.prepare(`INSERT INTO api_keys (name, key_preview, permissions, created_at) VALUES (?, ?, ?, ?)`).run(
      'Courier Dispatch Webhook',
      'msh_live_9a4f••••••c812',
      'orders:read, orders:tracking',
      now
    );
    db.prepare(`INSERT INTO api_keys (name, key_preview, permissions, created_at) VALUES (?, ?, ?, ?)`).run(
      'Mobile App Storefront Sync',
      'msh_pub_31d0••••••77e1',
      'catalog:read, cms:read',
      now
    );
  }

  // Seed Customer Tags
  const tagCount = (db.prepare(`SELECT COUNT(*) as cnt FROM customer_tags`).get() as { cnt: number }).cnt;
  if (tagCount === 0) {
    db.prepare(`INSERT OR IGNORE INTO customer_tags (phone, tags) VALUES (?, ?)`).run('01712345678', JSON.stringify(['VIP', 'Subscriber']));
    db.prepare(`INSERT OR IGNORE INTO customer_tags (phone, tags) VALUES (?, ?)`).run('01819876543', JSON.stringify(['Repeat Buyer']));
  }
}

export function logAudit(actorName: string, actorRole: string, action: string, target: string, details: string): void {
  db.prepare(
    `INSERT INTO audit_logs (actor_name, actor_role, action, target, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(actorName, actorRole, action, target, details, new Date().toISOString());
}

export function getCmsSettings(): CmsSettings {
  const row = db.prepare(`SELECT value FROM cms_settings WHERE key = 'public_cms'`).get() as
    | { value: string }
    | undefined;
  if (!row) return DEFAULT_CMS;
  try {
    return { ...DEFAULT_CMS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_CMS;
  }
}

export function updateCmsSettings(next: CmsSettings): CmsSettings {
  const sanitized: CmsSettings = {
    ...DEFAULT_CMS,
    ...next,
    dhaka_shipping_fee: Math.max(0, Math.round(Number(next.dhaka_shipping_fee) || 0)),
    outside_dhaka_shipping_fee: Math.max(0, Math.round(Number(next.outside_dhaka_shipping_fee) || 0)),
    free_shipping_threshold: Math.max(0, Math.round(Number(next.free_shipping_threshold) || 0)),
    tax_rate_pct: Math.min(50, Math.max(0, Number(next.tax_rate_pct) || 0)),
    low_stock_threshold: Math.max(1, Math.round(Number(next.low_stock_threshold) || 10)),
    pack_3_discount_pct: Math.min(50, Math.max(0, Math.round(Number(next.pack_3_discount_pct) || 0))),
    pack_5_discount_pct: Math.min(60, Math.max(0, Math.round(Number(next.pack_5_discount_pct) || 0))),
  };
  db.prepare(`INSERT OR REPLACE INTO cms_settings (key, value) VALUES ('public_cms', ?)`).run(
    JSON.stringify(sanitized)
  );
  return sanitized;
}

export function getAdminPasswordHash(): string {
  const row = db.prepare(`SELECT value FROM cms_settings WHERE key = 'admin_password_hash'`).get() as
    | { value: string }
    | undefined;
  return row?.value ?? hashPassword('admin123');
}

export function setAdminPassword(newPassword: string, userId?: number | null): void {
  const nextHash = hashPassword(newPassword);
  db.prepare(`INSERT OR REPLACE INTO cms_settings (key, value) VALUES ('admin_password_hash', ?)`).run(
    nextHash
  );
  if (userId) {
    db.prepare(`UPDATE rbac_users SET password_hash = ? WHERE id = ?`).run(nextHash, userId);
  } else {
    db.prepare(
      `UPDATE rbac_users SET password_hash = ? WHERE id = (SELECT id FROM rbac_users WHERE role = 'Super Admin' ORDER BY id ASC LIMIT 1)`
    ).run(nextHash);
  }
}

export function setRbacUserPassword(userId: number, newPassword: string): void {
  const nextHash = hashPassword(newPassword);
  db.prepare(`UPDATE rbac_users SET password_hash = ?, status = 'active' WHERE id = ?`).run(
    nextHash,
    userId
  );
  const primarySuper = db
    .prepare(`SELECT id FROM rbac_users WHERE role = 'Super Admin' ORDER BY id ASC LIMIT 1`)
    .get() as { id: number } | undefined;
  if (primarySuper && primarySuper.id === userId) {
    db.prepare(`INSERT OR REPLACE INTO cms_settings (key, value) VALUES ('admin_password_hash', ?)`).run(
      nextHash
    );
  }
}

export function authenticateAdminUser(
  emailInput: string | undefined,
  password: string
): { ok: true; user: AdminSessionUser } | { ok: false; error: string } {
  const cleanEmail = (emailInput || '').trim().toLowerCase();
  const now = new Date().toISOString();

  if (cleanEmail) {
    const row = db
      .prepare(`SELECT id, name, email, role, status, password_hash FROM rbac_users WHERE LOWER(email) = ?`)
      .get(cleanEmail) as
      | {
          id: number;
          name: string;
          email: string;
          role: RbacRole;
          status: 'active' | 'invited';
          password_hash: string | null;
        }
      | undefined;

    if (!row) {
      return { ok: false, error: 'No team account found for that email address.' };
    }
    if (row.status !== 'active') {
      return {
        ok: false,
        error: 'This account is pending activation. Ask a Super Admin to set a password or activate it.',
      };
    }
    const valid = row.password_hash
      ? verifyPassword(password, row.password_hash)
      : row.role === 'Super Admin' && verifyPassword(password, getAdminPasswordHash());

    if (!valid) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    db.prepare(`UPDATE rbac_users SET last_active = ? WHERE id = ?`).run(now, row.id);
    return {
      ok: true,
      user: { id: row.id, name: row.name, email: row.email, role: row.role },
    };
  }

  // Password-only login falls back to primary Super Admin credentials
  if (!verifyPassword(password, getAdminPasswordHash())) {
    return { ok: false, error: 'Invalid admin password.' };
  }
  const superRow = db
    .prepare(`SELECT id, name, email, role FROM rbac_users WHERE role = 'Super Admin' ORDER BY id ASC LIMIT 1`)
    .get() as { id: number; name: string; email: string; role: RbacRole } | undefined;
  if (superRow) {
    db.prepare(`UPDATE rbac_users SET last_active = ? WHERE id = ?`).run(now, superRow.id);
    return { ok: true, user: superRow };
  }
  return {
    ok: true,
    user: { id: null, name: 'Fatin Hasnat', email: 'fatinhasnatdjs@gmail.com', role: 'Super Admin' },
  };
}

export function verifySessionUserPassword(user: AdminSessionUser, currentPassword: string): boolean {
  if (user.id) {
    const row = db
      .prepare(`SELECT password_hash, role FROM rbac_users WHERE id = ?`)
      .get(user.id) as { password_hash: string | null; role: RbacRole } | undefined;
    if (row?.password_hash) {
      return verifyPassword(currentPassword, row.password_hash);
    }
  }
  if (user.role === 'Super Admin') {
    return verifyPassword(currentPassword, getAdminPasswordHash());
  }
  return false;
}

interface RawProductRow {
  id: number;
  slug: string;
  name: string;
  product_type: string;
  status: string;
  category: string;
  audience: string;
  display_pages: string;
  sort_order: number;
  short_description: string;
  fabric_specs: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  tags: string;
  gallery_urls: string;
  image_url: string;
  is_featured: number;
  is_bundle: number;
  bundle_pairs: number;
  is_pack_eligible: number;
  is_active: number;
  focus_keyword: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
}

export function getProducts(includeInactive = false): Product[] {
  const products = (
    includeInactive
      ? db.prepare(`SELECT * FROM products ORDER BY sort_order ASC, is_featured DESC, id DESC`).all()
      : db
          .prepare(`SELECT * FROM products WHERE is_active = 1 AND status = 'active' ORDER BY sort_order ASC, is_featured DESC, id DESC`)
          .all()
  ) as RawProductRow[];

  const variants = db.prepare(`SELECT * FROM product_variants ORDER BY id ASC`).all() as ProductVariant[];
  const byProduct = new Map<number, ProductVariant[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.product_id) ?? [];
    arr.push(v);
    byProduct.set(v.product_id, arr);
  }

  return products.map((p) => {
    const parseJsonArray = (raw: string, fallback: string[]) => {
      try {
        const res = JSON.parse(raw);
        return Array.isArray(res) ? res : fallback;
      } catch {
        return fallback;
      }
    };
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      product_type: (p.product_type || 'variable') as ProductType,
      status: (p.status || (p.is_active ? 'active' : 'draft')) as ProductStatus,
      category: p.category as ProductCategory,
      audience: (p.audience || 'unisex') as ProductAudience,
      display_pages: parseJsonArray(p.display_pages, ['home', 'socks']),
      sort_order: p.sort_order ?? 0,
      short_description: p.short_description,
      fabric_specs: p.fabric_specs,
      price: p.price,
      compare_at_price: p.compare_at_price,
      cost_price: p.cost_price ?? Math.round(p.price * 0.48),
      sale_start: p.sale_start,
      sale_end: p.sale_end,
      tags: parseJsonArray(p.tags, []),
      gallery_urls: parseJsonArray(p.gallery_urls, [p.image_url]),
      image_url: p.image_url,
      is_featured: Boolean(p.is_featured),
      is_bundle: Boolean(p.is_bundle),
      bundle_pairs: p.bundle_pairs,
      is_pack_eligible: Boolean(p.is_pack_eligible),
      is_active: Boolean(p.is_active),
      focus_keyword: p.focus_keyword || '',
      seo_title: p.seo_title || p.name,
      seo_description: p.seo_description || p.short_description,
      created_at: p.created_at,
      variants: byProduct.get(p.id) ?? [],
    };
  });
}

interface RawPageRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  template: string;
  menu_location: string;
  show_products: number;
  focus_keyword: string;
  seo_title: string;
  seo_description: string;
  is_published: number;
  sort_order: number;
  updated_at: string;
}

export function getCmsPages(includeDrafts = false): CmsPage[] {
  const rows = (
    includeDrafts
      ? db.prepare(`SELECT * FROM cms_pages ORDER BY sort_order ASC, id ASC`).all()
      : db.prepare(`SELECT * FROM cms_pages WHERE is_published = 1 ORDER BY sort_order ASC, id ASC`).all()
  ) as RawPageRow[];

  return rows.map((r) => ({
    ...r,
    template: r.template as CmsPageTemplate,
    menu_location: r.menu_location as CmsMenuLocation,
    show_products: Boolean(r.show_products),
    is_published: Boolean(r.is_published),
  }));
}

interface RawPostRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  featured_image: string;
  author_name: string;
  status: string;
  scheduled_at: string | null;
  views_count: number;
  focus_keyword: string;
  seo_title: string;
  seo_description: string;
  revisions: string;
  updated_at: string;
  created_at: string;
}

export function getBlogPosts(includeUnpublished = false): BlogPost[] {
  const rows = (
    includeUnpublished
      ? db.prepare(`SELECT * FROM blog_posts ORDER BY id DESC`).all()
      : db.prepare(`SELECT * FROM blog_posts WHERE status = 'published' ORDER BY id DESC`).all()
  ) as RawPostRow[];

  return rows.map((r) => {
    let parsedTags: string[] = [];
    let parsedRevs: PostRevision[] = [];
    try {
      parsedTags = JSON.parse(r.tags);
    } catch {
      parsedTags = [];
    }
    try {
      parsedRevs = JSON.parse(r.revisions);
    } catch {
      parsedRevs = [];
    }
    return {
      ...r,
      status: r.status as BlogPostStatus,
      tags: Array.isArray(parsedTags) ? parsedTags : [],
      revisions: Array.isArray(parsedRevs) ? parsedRevs : [],
    };
  });
}

export function getMenus(): NavMenu[] {
  const rows = db.prepare(`SELECT location, items FROM cms_menus`).all() as Array<{
    location: 'header' | 'footer' | 'mobile';
    items: string;
  }>;
  return rows.map((r) => ({
    location: r.location,
    items: JSON.parse(r.items) as NavMenuItem[],
  }));
}

export function getRedirects(): SeoRedirect[] {
  return db.prepare(`SELECT * FROM seo_redirects ORDER BY id DESC`).all() as SeoRedirect[];
}

export function getPlugins(): CmsPlugin[] {
  const rows = db.prepare(`SELECT * FROM cms_plugins`).all() as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    is_enabled: number;
    config: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    version: r.version,
    is_enabled: Boolean(r.is_enabled),
    config: JSON.parse(r.config || '{}'),
  }));
}

export function getRbacUsers(): RbacUser[] {
  const rows = db
    .prepare(
      `SELECT id, name, email, role, status, last_active, created_at,
              CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 ELSE 0 END AS has_password
       FROM rbac_users ORDER BY id ASC`
    )
    .all() as Array<
    Omit<RbacUser, 'role' | 'status' | 'has_password'> & {
      role: RbacRole;
      status: 'active' | 'invited';
      has_password: number;
    }
  >;
  return rows.map((r) => ({
    ...r,
    has_password: Boolean(r.has_password) || r.role === 'Super Admin',
  }));
}

export function getAuditLogs(): AuditLogEntry[] {
  return db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100`).all() as AuditLogEntry[];
}

export function getApiKeys(): ApiKeyEntry[] {
  return db.prepare(`SELECT * FROM api_keys ORDER BY id DESC`).all() as ApiKeyEntry[];
}

interface RawReviewRow {
  id: number;
  product_id: number | null;
  product_name: string;
  reviewer_name: string;
  reviewer_city: string;
  rating: number;
  title: string;
  comment: string;
  status: string;
  is_approved: number;
  admin_reply: string | null;
  created_at: string;
}

export function getReviews(includeUnapproved = false): ProductReview[] {
  const rows = (
    includeUnapproved
      ? db.prepare(`SELECT * FROM reviews ORDER BY id DESC`).all()
      : db.prepare(`SELECT * FROM reviews WHERE is_approved = 1 ORDER BY id DESC`).all()
  ) as RawReviewRow[];
  return rows.map((r) => ({
    ...r,
    status: (r.status || (r.is_approved ? 'approved' : 'pending')) as ProductReview['status'],
    is_approved: Boolean(r.is_approved),
  }));
}

export function getReturnRequests(): ReturnRequest[] {
  const rows = db.prepare(`SELECT * FROM return_requests ORDER BY id DESC`).all() as Array<
    Omit<ReturnRequest, 'status'> & { status: string }
  >;
  return rows.map((r) => ({ ...r, status: r.status as ReturnStatus }));
}

export function getContactMessages(): ContactMessage[] {
  return db.prepare(`SELECT * FROM contact_messages ORDER BY id DESC`).all() as ContactMessage[];
}

interface RawPromoRow {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_subtotal: number;
  usage_limit: number | null;
  expires_at: string | null;
  is_active: number;
  usage_count: number;
  created_at: string;
}

export function getPromos(includeInactive = false): PromoCode[] {
  const rows = (
    includeInactive
      ? db.prepare(`SELECT * FROM promo_codes ORDER BY id DESC`).all()
      : db.prepare(`SELECT * FROM promo_codes WHERE is_active = 1 ORDER BY id DESC`).all()
  ) as RawPromoRow[];
  return rows.map((r) => ({ ...r, is_active: Boolean(r.is_active) }));
}

export function getOrders(): Order[] {
  const orders = db.prepare(`SELECT * FROM orders ORDER BY id DESC`).all() as Array<
    Omit<Order, 'items'>
  >;
  const items = db.prepare(`SELECT * FROM order_items ORDER BY id ASC`).all() as OrderItem[];
  const itemsByOrder = new Map<number, OrderItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }
  return orders.map((o) => ({
    ...o,
    status: o.status as OrderStatus,
    payment_status: (o.payment_status || (o.status === 'delivered' ? 'paid' : 'pending')) as Order['payment_status'],
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export function getCustomersDirectory(): CustomerRecord[] {
  const orders = getOrders();
  const tagRows = db.prepare(`SELECT phone, tags FROM customer_tags`).all() as Array<{
    phone: string;
    tags: string;
  }>;
  const tagMap = new Map<string, string[]>();
  for (const r of tagRows) {
    try {
      tagMap.set(r.phone, JSON.parse(r.tags));
    } catch {
      tagMap.set(r.phone, []);
    }
  }

  const byPhone = new Map<string, CustomerRecord>();
  for (const o of orders) {
    const existing = byPhone.get(o.customer_phone);
    if (!existing) {
      byPhone.set(o.customer_phone, {
        phone: o.customer_phone,
        name: o.customer_name,
        city: o.city,
        total_orders: 1,
        ltv: o.status === 'cancelled' || o.status === 'refunded' ? 0 : o.total,
        last_active: o.created_at,
        tags: tagMap.get(o.customer_phone) || [],
        orders: [o],
      });
    } else {
      existing.total_orders += 1;
      if (o.status !== 'cancelled' && o.status !== 'refunded') existing.ltv += o.total;
      if (o.created_at > existing.last_active) existing.last_active = o.created_at;
      existing.orders.push(o);
    }
  }

  return Array.from(byPhone.values()).sort((a, b) => b.ltv - a.ltv);
}

export function getMediaLibrary(): MediaItem[] {
  const metaRows = db.prepare(`SELECT * FROM media_metadata`).all() as Array<{
    url: string;
    title: string;
    alt_text: string;
    caption: string;
    media_type: 'image' | 'video' | 'document';
  }>;
  const metaMap = new Map(metaRows.map((m) => [m.url, m]));

  const enrich = (
    name: string,
    url: string,
    source: 'brand' | 'studio' | 'upload',
    size_bytes: number
  ): MediaItem => {
    const meta = metaMap.get(url);
    return {
      name,
      url,
      source,
      media_type: meta?.media_type || 'image',
      title: meta?.title || name.replace(/[-_]/g, ' ').replace(/\.\w+$/, ''),
      alt_text: meta?.alt_text || name.replace(/[-_]/g, ' ').replace(/\.\w+$/, ''),
      caption: meta?.caption || '',
      size_bytes,
    };
  };

  const items: MediaItem[] = [
    enrich('Mashuka Official Logo', MASHUKA_LOGO_URL, 'brand', 48200),
  ];

  const studioDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
  if (fs.existsSync(studioDir)) {
    for (const file of fs.readdirSync(studioDir)) {
      if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
        const stat = fs.statSync(path.join(studioDir, file));
        items.push(enrich(file, `/src/assets/images/${file}`, 'studio', stat.size));
      }
    }
  }

  const uploadDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadDir)) {
    for (const file of fs.readdirSync(uploadDir)) {
      if (/\.(jpg|jpeg|png|webp|mp4|pdf)$/i.test(file)) {
        const stat = fs.statSync(path.join(uploadDir, file));
        items.push(enrich(file, `/uploads/${file}`, 'upload', stat.size));
      }
    }
  }

  return items;
}
