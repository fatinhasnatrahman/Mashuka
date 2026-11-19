export type ProductCategory = 'crew' | 'ankle' | 'no-show' | 'sports' | 'bundle' | 'kids';
export type ProductAudience = 'men' | 'women' | 'kids-baby' | 'unisex';
export type ProductType = 'simple' | 'variable';
export type ProductStatus = 'active' | 'draft' | 'archived';

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  color_name: string;
  color_hex: string;
  size: string;
  material?: string;
  price_override?: number | null;
  stock: number;
  image_url?: string | null;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  product_type: ProductType;
  status: ProductStatus;
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
  tags: string[];
  gallery_urls: string[];
  image_url: string;
  is_featured: boolean;
  is_bundle: boolean;
  bundle_pairs: number;
  is_pack_eligible: boolean;
  is_active: boolean;
  focus_keyword?: string;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  variants: ProductVariant[];
}

export interface PromoCode {
  id: number;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_subtotal: number;
  usage_limit?: number | null;
  expires_at?: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface CraftPillar {
  title: string;
  description: string;
  metric: string;
}

export interface SizeChartRow {
  group: string;
  size_label: string;
  uk_size: string;
  eu_size: string;
  us_size: string;
  foot_cm: string;
  age_note: string;
}

export interface SmtpTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface CmsSettings {
  brand_name: string;
  brand_slogan: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  header_layout: 'classic' | 'centered' | 'minimal';
  footer_layout: '4-column' | 'compact';
  currency_symbol: string;
  timezone: string;
  maintenance_mode: boolean;
  announcement_text: string;
  hero_kicker: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_image_url: string;
  craft_heading: string;
  craft_subheading: string;
  craft_pillars: CraftPillar[];
  size_chart_rows: SizeChartRow[];
  size_chart_notes: string;
  dhaka_shipping_fee: number;
  outside_dhaka_shipping_fee: number;
  free_shipping_threshold: number;
  tax_rate_pct: number;
  low_stock_threshold: number;
  pack_3_discount_pct: number;
  pack_5_discount_pct: number;
  cod_enabled: boolean;
  mobile_banking_enabled: boolean;
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  bkash_number: string;
  nagad_number: string;
  bkash_instructions: string;
  nagad_instructions: string;
  support_whatsapp: string;
  support_email: string;
  store_address: string;
  sitemap_enabled: boolean;
  robots_txt: string;
  smtp_host: string;
  smtp_from: string;
  smtp_templates: SmtpTemplate[];
}

export type CmsPageTemplate = 'default' | 'full-width' | 'landing' | 'standard' | 'collection' | 'contact' | 'size-chart';
export type CmsMenuLocation = 'none' | 'header' | 'footer' | 'both';

export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  template: CmsPageTemplate;
  menu_location: CmsMenuLocation;
  show_products: boolean;
  focus_keyword?: string;
  seo_title: string;
  seo_description: string;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
}

export interface PostRevision {
  id: string;
  saved_at: string;
  author: string;
  title: string;
  content: string;
}

export type BlogPostStatus = 'draft' | 'pending' | 'scheduled' | 'published';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  featured_image: string;
  author_name: string;
  status: BlogPostStatus;
  scheduled_at?: string | null;
  views_count: number;
  focus_keyword: string;
  seo_title: string;
  seo_description: string;
  revisions: PostRevision[];
  updated_at: string;
  created_at: string;
}

export interface NavMenuItem {
  id: string;
  label: string;
  url: string;
  type: 'page' | 'category' | 'custom';
  children: NavMenuItem[];
}

export interface NavMenu {
  location: 'header' | 'footer' | 'mobile';
  items: NavMenuItem[];
}

export interface SeoRedirect {
  id: number;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  hits: number;
  created_at: string;
}

export interface CmsPlugin {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  is_enabled: boolean;
  config: Record<string, string | number | boolean>;
}

export interface PublicPlugin {
  id: string;
  is_enabled: boolean;
  config: Record<string, string | number | boolean>;
}

export type RbacRole = 'Super Admin' | 'Shop Manager' | 'Content Editor' | 'Author' | 'Customer Support';

export interface RbacUser {
  id: number;
  name: string;
  email: string;
  role: RbacRole;
  status: 'active' | 'invited';
  has_password?: boolean;
  last_active: string;
  created_at: string;
}

export interface AdminSessionUser {
  id: number | null;
  name: string;
  email: string;
  role: RbacRole;
}

export interface AuditLogEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  target: string;
  details: string;
  created_at: string;
}

export interface ApiKeyEntry {
  id: number;
  name: string;
  key_preview: string;
  permissions: string;
  created_at: string;
}

export interface ProductReview {
  id: number;
  product_id: number | null;
  product_name: string;
  reviewer_name: string;
  reviewer_city: string;
  rating: number;
  title: string;
  comment: string;
  status?: 'approved' | 'pending' | 'spam' | 'trashed';
  is_approved: boolean;
  admin_reply: string | null;
  created_at: string;
}

export type ReturnStatus = 'requested' | 'approved' | 'pickup_scheduled' | 'completed' | 'rejected';

export interface ReturnRequest {
  id: number;
  request_number: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  reason: string;
  resolution: 'exchange' | 'refund' | 'store-credit';
  details: string;
  status: ReturnStatus;
  admin_note: string | null;
  created_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'unread' | 'replied' | 'resolved';
  created_at: string;
}

export interface MediaItem {
  name: string;
  url: string;
  source: 'brand' | 'studio' | 'upload';
  media_type: 'image' | 'video' | 'document';
  title: string;
  alt_text: string;
  caption: string;
  size_bytes: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'stripe' | 'paypal';
export type DeliveryZone = 'dhaka' | 'outside';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  item_name: string;
  variant_label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  pack_details?: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_zone: DeliveryZone;
  address: string;
  city: string;
  notes: string | null;
  payment_method: PaymentMethod;
  payment_status?: 'paid' | 'pending' | 'refunded';
  tracking_number?: string | null;
  internal_notes?: string | null;
  wallet_sender: string | null;
  wallet_trx_id: string | null;
  subtotal: number;
  promo_code: string | null;
  discount_amount: number;
  tax_amount?: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

export interface CustomerRecord {
  phone: string;
  name: string;
  city: string;
  total_orders: number;
  ltv: number;
  last_active: string;
  tags: string[];
  orders: Order[];
}

export interface PackSelection {
  product_id: number;
  variant_id: number;
  name: string;
  color_name: string;
  color_hex: string;
  size: string;
  unit_price: number;
  image_url: string;
}

export interface CartItem {
  cart_key: string;
  type: 'single' | 'custom_pack';
  product_id?: number;
  variant_id?: number;
  name: string;
  variant_label: string;
  image_url: string;
  unit_price: number;
  compare_at_price?: number | null;
  quantity: number;
  max_stock: number;
  pack_tier?: 3 | 5;
  pack_items?: PackSelection[];
}

export interface AdminDashboardMetrics {
  total_revenue: number;
  total_orders_count: number;
  aov: number;
  total_page_views: number;
  active_subscribers: number;
  conversion_rate: number;
  active_orders_count: number;
  pending_verification_count: number;
  low_stock_variants_count: number;
  pending_reviews_count: number;
  open_returns_count: number;
  unread_messages_count: number;
}
