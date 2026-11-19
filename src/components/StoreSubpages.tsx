import { useState } from 'react';
import { Star, CheckCircle2, ArrowLeft, Phone, Mail, MapPin, RotateCcw } from 'lucide-react';
import type {
  CmsPage,
  CmsSettings,
  Product,
  ProductReview,
  ProductVariant,
  ReturnRequest,
} from '../types.ts';
import { formatShortDate } from '../utils/format.ts';
import { RichContentRenderer } from '../utils/richText.tsx';
import { ProductCard } from './ProductCard.tsx';

export function SizeChartView({
  cms,
  onBackHome,
}: {
  cms: CmsSettings;
  onBackHome: () => void;
}) {
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const formatFootMeasure = (cmText: string) => {
    if (unit === 'cm') return cmText;
    const nums = cmText.match(/\d+(\.\d+)?/g);
    if (!nums || nums.length === 0) return cmText;
    if (nums.length === 1) {
      return `${(Number(nums[0]) / 2.54).toFixed(1)} in`;
    }
    return `${(Number(nums[0]) / 2.54).toFixed(1)} - ${(Number(nums[1]) / 2.54).toFixed(1)} in`;
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525866] hover:text-[#111315]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
            <h1 className="text-3xl font-bold text-[#111315] tracking-tight">
              {cms.brand_name} Sock Size Chart
            </h1>
            <p className="text-sm text-[#525866] max-w-2xl leading-relaxed">
              {cms.size_chart_notes}
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#F6F7F8] border border-[#E4E6EB] rounded-lg self-start">
            <button
              type="button"
              onClick={() => setUnit('cm')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
                unit === 'cm' ? 'bg-white text-[#111315] shadow-xs' : 'text-[#525866]'
              }`}
            >
              Centimeters (cm)
            </button>
            <button
              type="button"
              onClick={() => setUnit('in')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
                unit === 'in' ? 'bg-white text-[#111315] shadow-xs' : 'text-[#525866]'
              }`}
            >
              Inches (in)
            </button>
          </div>
        </div>

        <div className="border border-[#E4E6EB] rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F7F8] border-b border-[#E4E6EB] text-[11px] font-semibold uppercase tracking-wider text-[#525866]">
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Mashuka Size</th>
                  <th className="py-3.5 px-4">UK Shoe</th>
                  <th className="py-3.5 px-4">EU Shoe</th>
                  <th className="py-3.5 px-4">US Shoe</th>
                  <th className="py-3.5 px-4">Foot Length</th>
                  <th className="py-3.5 px-4">Fit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E6EB] text-xs">
                {cms.size_chart_rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFA]">
                    <td className="py-3.5 px-4 font-semibold text-[#111315]">{row.group}</td>
                    <td className="py-3.5 px-4 font-medium text-[#1D4ED8]">{row.size_label}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#111315]">
                      {row.uk_size}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#111315]">
                      {row.eu_size}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#111315]">
                      {row.us_size}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#111315]">
                      {formatFootMeasure(row.foot_cm)}
                    </td>
                    <td className="py-3.5 px-4 text-[#525866]">{row.age_note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReviewsView({
  reviews,
  products,
  onBackHome,
}: {
  reviews: ProductReview[];
  products: Product[];
  onBackHome: () => void;
}) {
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('Dhaka');
  const [productId, setProductId] = useState<string>(products[0] ? String(products[0].id) : '');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    const chosenProduct = products.find((p) => String(p.id) === productId);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: chosenProduct?.id || null,
          product_name: chosenProduct?.name || 'Mashuka Socks',
          reviewer_name: reviewerName,
          reviewer_city: reviewerCity,
          rating,
          title,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit review.');
      } else {
        setFeedback(data.message);
        setReviewerName('');
        setTitle('');
        setComment('');
      }
    } catch {
      setError('Network error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E4E6EB] pb-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525866] hover:text-[#111315]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
            <h1 className="text-3xl font-bold text-[#111315] tracking-tight">Customer Reviews</h1>
            <p className="text-sm text-[#525866]">
              Verified feedback from Mashuka wearers across Bangladesh.
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#F6F7F8] border border-[#E4E6EB]">
            <div className="text-2xl font-bold font-mono tabular-nums text-[#111315]">
              {avgRating}
            </div>
            <div className="text-xs text-[#525866]">
              <div className="flex items-center gap-0.5 text-[#D97706]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <div className="mt-0.5 font-mono tabular-nums">{reviews.length} published reviews</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 rounded-xl border border-[#E4E6EB] text-center text-sm text-[#525866]">
                No reviews published yet. Be the first to review Mashuka!
              </div>
            ) : (
              reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="p-5 rounded-xl border border-[#E4E6EB] bg-white space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[#D97706]">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#525866] font-mono">
                      {formatShortDate(rev.created_at)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#111315]">{rev.title}</h3>
                  <p className="text-sm text-[#525866] leading-relaxed">{rev.comment}</p>
                  <div className="text-xs text-[#525866] pt-1">
                    <span className="font-semibold text-[#111315]">{rev.reviewer_name}</span> ·{' '}
                    {rev.reviewer_city} · Product: {rev.product_name}
                  </div>
                  {rev.admin_reply && (
                    <div className="mt-2 p-3 rounded-lg bg-[#F6F7F8] border border-[#E4E6EB] text-xs text-[#111315]">
                      <span className="font-semibold">Mashuka Team:</span> {rev.admin_reply}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Submit Review Form */}
          <div className="lg:col-span-5 bg-[#F6F7F8] border border-[#E4E6EB] rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111315]">Write a Review</h2>
            {feedback && (
              <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-xs text-[#166534]">
                {feedback}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">Your Name</label>
                  <input
                    required
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Arif Hasan"
                    className="w-full h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">City</label>
                  <input
                    required
                    type="text"
                    value={reviewerCity}
                    onChange={(e) => setReviewerCity(e.target.value)}
                    placeholder="Dhaka"
                    className="w-full h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">Product</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111315] mb-1">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  >
                    <option value={5}>5 Stars — Excellent</option>
                    <option value={4}>4 Stars — Very Good</option>
                    <option value={3}>3 Stars — Good</option>
                    <option value={2}>2 Stars — Fair</option>
                    <option value={1}>1 Star — Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Review Headline
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Comfortable all day"
                  className="w-full h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Your Experience
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share how the fabric, fit, and delivery felt..."
                  className="w-full p-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReturnRequestView({
  onBackHome,
  onOpenPolicy,
}: {
  onBackHome: () => void;
  onOpenPolicy: () => void;
}) {
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [reason, setReason] = useState('Size Exchange');
  const [resolution, setResolution] = useState<'exchange' | 'refund' | 'store-credit'>('exchange');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdRequest, setCreatedRequest] = useState<ReturnRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          reason,
          resolution,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit return request.');
      } else {
        setCreatedRequest(data.return_request);
      }
    } catch {
      setError('Network error submitting return request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525866] hover:text-[#111315]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#111315] tracking-tight">Return &amp; Exchange Request</h1>
          <p className="text-sm text-[#525866]">
            Submit a return or size exchange within 7 days of delivery.{' '}
            <button
              type="button"
              onClick={onOpenPolicy}
              className="text-[#1D4ED8] underline underline-offset-2 font-medium"
            >
              Read Return &amp; Refund Policy
            </button>
            .
          </p>
        </div>

        {createdRequest ? (
          <div className="p-6 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-3">
            <div className="flex items-center gap-2 text-[#16A34A] font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <span>Return Request {createdRequest.request_number} Received</span>
            </div>
            <p className="text-xs text-[#166534] leading-relaxed">
              We logged your {createdRequest.resolution} request for Order{' '}
              <span className="font-mono font-semibold">{createdRequest.order_number}</span>. Our
              team will call you at{' '}
              <span className="font-mono font-semibold">{createdRequest.customer_phone}</span>{' '}
              within 24 hours to coordinate pickup.
            </p>
            <button
              type="button"
              onClick={() => {
                setCreatedRequest(null);
                setOrderNumber('');
                setDetails('');
              }}
              className="px-4 py-2 rounded-lg bg-[#111315] text-white text-xs font-medium"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-[#F6F7F8] border border-[#E4E6EB] rounded-xl p-6 space-y-4"
          >
            {error && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Order Number
                </label>
                <input
                  required
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. MSH-1001"
                  className="w-full h-10 px-3 text-sm font-mono uppercase bg-white border border-[#D1D5DB] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full h-10 px-3 text-sm font-mono bg-white border border-[#D1D5DB] rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full h-10 px-3 text-sm bg-white border border-[#D1D5DB] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white border border-[#D1D5DB] rounded-lg"
                >
                  <option value="Size Exchange">Size Exchange</option>
                  <option value="Wrong Item Received">Wrong Item Received</option>
                  <option value="Damaged / Defect">Damaged / Manufacturing Defect</option>
                  <option value="Changed Mind (Unopened)">Changed Mind (Unopened)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111315] mb-1">
                  Preferred Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) =>
                    setResolution(e.target.value as 'exchange' | 'refund' | 'store-credit')
                  }
                  className="w-full h-10 px-3 text-sm bg-white border border-[#D1D5DB] rounded-lg"
                >
                  <option value="exchange">Size / Color Exchange</option>
                  <option value="refund">bKash / Nagad Refund</option>
                  <option value="store-credit">Store Credit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111315] mb-1">
                Items &amp; Details
              </label>
              <textarea
                required
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Mention which pair(s) you want to return or exchange and the new size/color needed..."
                className="w-full p-3 text-sm bg-white border border-[#D1D5DB] rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-lg bg-[#111315] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit Return Request'}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export function DynamicCmsPageView({
  page,
  cms,
  products,
  selectedCardVariant,
  onSelectCardVariant,
  onOpenDetail,
  onQuickAdd,
  onBackHome,
}: {
  page: CmsPage;
  cms: CmsSettings;
  products: Product[];
  selectedCardVariant: Record<number, number>;
  onSelectCardVariant: (productId: number, variantId: number) => void;
  onOpenDetail: (product: Product, variantId?: number) => void;
  onQuickAdd: (product: Product, variant: ProductVariant) => void;
  onBackHome: () => void;
}) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const pageProducts = products.filter(
    (p) => p.display_pages.includes(page.slug) || (page.show_products && p.is_featured)
  );

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSent(false);
    setContactSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          subject: contactSubject,
          message: contactMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactError(data.error || 'Could not send message.');
      } else {
        setContactSent(true);
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactSubject('');
        setContactMsg('');
      }
    } catch {
      setContactError('Network error while sending message.');
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6 space-y-10">
        <div className="space-y-3 border-b border-[#E4E6EB] pb-6">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525866] hover:text-[#111315]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-[#111315] tracking-tight">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="text-base text-[#525866] max-w-2xl leading-relaxed">{page.excerpt}</p>
          )}
        </div>

        {/* Rich Content Blocks */}
        <RichContentRenderer content={page.content} className="max-w-3xl" />

        {/* Contact Us Form & Studio Details */}
        {page.template === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-xl bg-[#F6F7F8] border border-[#E4E6EB] space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#111315]">Dhaka Studio</div>
                    <div className="text-[#525866] mt-0.5">{cms.store_address}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#111315]">WhatsApp &amp; Hotline</div>
                    <div className="text-[#525866] font-mono mt-0.5">{cms.support_whatsapp}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#111315]">Email Support</div>
                    <div className="text-[#525866] font-mono mt-0.5">{cms.support_email}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#F6F7F8] border border-[#E4E6EB] rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#111315]">Send Us a Message</h2>
              {contactSent && (
                <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-xs text-[#166534]">
                  Message received! Our Mashuka team will reply shortly.
                </div>
              )}
              {contactError && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {contactError}
                </div>
              )}
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    required
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full Name"
                    className="h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone (017XXXXXXXX)"
                    className="h-10 px-3 text-xs font-mono bg-white border border-[#D1D5DB] rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email Address"
                    className="h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  />
                  <input
                    required
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Subject (e.g. Wholesale / Order)"
                    className="h-10 px-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                  />
                </div>
                <textarea
                  required
                  rows={4}
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full p-3 text-xs bg-white border border-[#D1D5DB] rounded-lg"
                />
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="h-10 px-5 rounded-lg bg-[#111315] text-white text-xs font-medium hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                >
                  {contactSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Attached Products Grid (if assigned in CMS or enabled on page) */}
        {pageProducts.length > 0 && (
          <div className="pt-8 border-t border-[#E4E6EB] space-y-6">
            <h2 className="text-2xl font-bold text-[#111315]">Featured on This Page</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {pageProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectedVariantId={selectedCardVariant[product.id]}
                  onSelectVariant={onSelectCardVariant}
                  onOpenDetail={onOpenDetail}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
