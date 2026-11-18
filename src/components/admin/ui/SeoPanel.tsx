import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Monitor, Smartphone, Globe } from 'lucide-react';

interface SeoPanelProps {
  title: string;
  slug: string;
  focusKeyword: string;
  seoTitle: string;
  seoDescription: string;
  contentText: string;
  basePath?: string;
  onChange: (patch: {
    slug?: string;
    focus_keyword?: string;
    seo_title?: string;
    seo_description?: string;
  }) => void;
}

export function SeoPanel({
  title,
  slug,
  focusKeyword,
  seoTitle,
  seoDescription,
  contentText,
  basePath = '',
  onChange,
}: SeoPanelProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const resolvedTitle = seoTitle.trim() || title.trim() || 'Mashuka — Desire your Wear';
  const resolvedDesc =
    seoDescription.trim() ||
    'Combed-cotton everyday socks, multi-pair bundles, and thoughtful sizing crafted in Bangladesh.';
  const kw = focusKeyword.trim().toLowerCase();

  const checks = useMemo(() => {
    const words = contentText.trim() ? contentText.trim().split(/\s+/).length : 0;
    const hasHeading = /^##\s+/m.test(contentText) || contentText.length > 160;
    const kwInTitle = !kw || resolvedTitle.toLowerCase().includes(kw);
    const kwInDesc = !kw || resolvedDesc.toLowerCase().includes(kw);
    const kwInBody = !kw || contentText.toLowerCase().includes(kw);
    const titleLenOk = resolvedTitle.length >= 30 && resolvedTitle.length <= 62;
    const descLenOk = resolvedDesc.length >= 70 && resolvedDesc.length <= 160;
    const wordsOk = words >= 80;

    return [
      {
        label: kw
          ? `Focus keyword "${focusKeyword}" in SEO title`
          : 'Set a focus keyword to evaluate relevance',
        status: !kw ? 'warn' : kwInTitle ? 'pass' : 'fail',
      },
      {
        label: kw ? `Focus keyword in meta description` : 'Meta description relevance check',
        status: !kw ? 'warn' : kwInDesc ? 'pass' : 'fail',
      },
      {
        label: kw ? `Focus keyword appears in body copy` : 'Body copy keyword check',
        status: !kw ? 'warn' : kwInBody ? 'pass' : 'warn',
      },
      {
        label: `SEO Title length (${resolvedTitle.length}/60 chars)`,
        status: titleLenOk ? 'pass' : 'warn',
      },
      {
        label: `Meta Description length (${resolvedDesc.length}/160 chars)`,
        status: descLenOk ? 'pass' : 'warn',
      },
      {
        label: `Readability & content depth (${words} words${hasHeading ? ', structured' : ''})`,
        status: wordsOk && hasHeading ? 'pass' : 'warn',
      },
    ] as Array<{ label: string; status: 'pass' | 'warn' | 'fail' }>;
  }, [kw, focusKeyword, resolvedTitle, resolvedDesc, contentText]);

  const titlePct = Math.min(100, Math.round((resolvedTitle.length / 60) * 100));
  const descPct = Math.min(100, Math.round((resolvedDesc.length / 160) * 100));

  return (
    <div className="space-y-5">
      {/* Live SERP Preview */}
      <div className="rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#111315] dark:text-white">
            <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Search Engine Snippet Preview</span>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#E5E7EB]/70 dark:bg-[#14171F]">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                device === 'desktop'
                  ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                  : 'text-[#525866] dark:text-[#9CA3AF]'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                device === 'mobile'
                  ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                  : 'text-[#525866] dark:text-[#9CA3AF]'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        <div
          className={`p-4 rounded-lg bg-white dark:bg-[#14171F] border border-[#E4E6EB] dark:border-[#252A36] space-y-1 ${
            device === 'mobile' ? 'max-w-[360px]' : 'w-full'
          }`}
        >
          <div className="text-[11px] text-[#525866] dark:text-[#9CA3AF] truncate font-mono">
            https://mashuka.com{basePath}/{slug || 'your-slug'}
          </div>
          <div className="text-base font-semibold text-[#1D4ED8] dark:text-[#60A5FA] leading-snug line-clamp-1">
            {resolvedTitle}
          </div>
          <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed line-clamp-2">
            {resolvedDesc}
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
            Focus Keyphrase
          </span>
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => onChange({ focus_keyword: e.target.value })}
            placeholder="e.g. combed cotton socks bangladesh"
            className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white focus:outline-none focus:border-[#2563EB]"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">URL Slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="url-friendly-slug"
            className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white focus:outline-none focus:border-[#2563EB]"
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">SEO Title</span>
          <span className="font-mono tabular-nums text-[11px] text-[#525866] dark:text-[#9CA3AF]">
            {resolvedTitle.length} / 60
          </span>
        </div>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => onChange({ seo_title: e.target.value })}
          placeholder={title || 'SEO Page Title'}
          className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white focus:outline-none focus:border-[#2563EB]"
        />
        <div className="h-1.5 rounded-full bg-[#E5E7EB] dark:bg-[#252A36] overflow-hidden">
          <div
            className={`h-full transition-all ${
              resolvedTitle.length > 65 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
            }`}
            style={{ width: `${titlePct}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">Meta Description</span>
          <span className="font-mono tabular-nums text-[11px] text-[#525866] dark:text-[#9CA3AF]">
            {resolvedDesc.length} / 160
          </span>
        </div>
        <textarea
          rows={2}
          value={seoDescription}
          onChange={(e) => onChange({ seo_description: e.target.value })}
          placeholder="Concise description shown in search engine results..."
          className="w-full p-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-[#111315] dark:text-white focus:outline-none focus:border-[#2563EB]"
        />
        <div className="h-1.5 rounded-full bg-[#E5E7EB] dark:bg-[#252A36] overflow-hidden">
          <div
            className={`h-full transition-all ${
              resolvedDesc.length > 165 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
            }`}
            style={{ width: `${descPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] p-4 space-y-2.5 bg-white dark:bg-[#14171F]">
        <div className="text-xs font-semibold text-[#111315] dark:text-white">
          SEO &amp; Readability Analysis
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((chk) => (
            <div
              key={chk.label}
              className="flex items-start gap-2 text-xs text-[#374151] dark:text-[#D1D5DB]"
            >
              {chk.status === 'pass' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 shrink-0" />
              ) : chk.status === 'fail' ? (
                <XCircle className="w-3.5 h-3.5 text-[#DC2626] mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] mt-0.5 shrink-0" />
              )}
              <span>{chk.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
