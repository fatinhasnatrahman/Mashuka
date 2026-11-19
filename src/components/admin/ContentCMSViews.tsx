import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  History,
  RotateCcw,
  Upload,
  Grid,
  List,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Sliders,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import type {
  BlogPost,
  BlogPostStatus,
  CmsMenuLocation,
  CmsPage,
  CmsPageTemplate,
  CmsPlugin,
  CmsSettings,
  NavMenuItem,
  PostRevision,
  ReturnStatus,
} from '../../types.ts';
import type { AdminContextHelpers } from './types.ts';
import { formatDateTime } from '../../utils/format.ts';
import { SafeImage } from '../SafeImage.tsx';
import { DataTable } from './ui/DataTable.tsx';
import { Modal, SlideOverDrawer } from './ui/Modal.tsx';
import { RichEditor } from './ui/RichEditor.tsx';
import { SeoPanel } from './ui/SeoPanel.tsx';

// ==========================================
// 1. POSTS & EDITORIAL ENGINE VIEW
// ==========================================

export function PostsView({
  ctx,
  triggerCreate,
  onClearTrigger,
}: {
  ctx: AdminContextHelpers;
  triggerCreate?: boolean;
  onClearTrigger?: () => void;
}) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all');
  const [editingPost, setEditingPost] = useState<BlogPost | null | undefined>(
    triggerCreate ? null : undefined
  );
  const [editorTab, setEditorTab] = useState<'write' | 'seo' | 'revisions'>('write');
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Craft & Yarn');
  const [tagsStr, setTagsStr] = useState('');
  const [featuredImage, setFeaturedImage] = useState(
    '/src/assets/images/hero_socks_campaign_1795008499974.jpg'
  );
  const [authorName, setAuthorName] = useState('Fatin Hasnat');
  const [status, setStatus] = useState<BlogPostStatus>('draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [revisions, setRevisions] = useState<PostRevision[]>([]);

  const openEditor = useCallback(
    (post: BlogPost | null) => {
      setEditingPost(post);
      setEditorTab('write');
      setTitle(post?.title || '');
      setSlug(post?.slug || '');
      setExcerpt(post?.excerpt || '');
      setContent(post?.content || '');
      setCategory(post?.category || 'Craft & Yarn');
      setTagsStr((post?.tags || []).join(', '));
      setFeaturedImage(
        post?.featured_image || '/src/assets/images/hero_socks_campaign_1795008499974.jpg'
      );
      setAuthorName(post?.author_name || data.users[0]?.name || 'Fatin Hasnat');
      setStatus(post?.status || 'draft');
      setScheduledAt(post?.scheduled_at || '');
      setFocusKeyword(post?.focus_keyword || '');
      setSeoTitle(post?.seo_title || '');
      setSeoDesc(post?.seo_description || '');
      setRevisions(post?.revisions || []);
    },
    [data.users]
  );

  useEffect(() => {
    if (triggerCreate) {
      openEditor(null);
    }
  }, [triggerCreate, openEditor]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.posts.filter((p) => {
      const okSt = statusFilter === 'all' || p.status === statusFilter;
      const okQ =
        !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      return okSt && okQ;
    });
  }, [data.posts, search, statusFilter]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast('Post title is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim(),
        content,
        category,
        tags: tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        featured_image: featuredImage,
        author_name: authorName,
        status,
        scheduled_at: status === 'scheduled' ? scheduledAt || null : null,
        focus_keyword: focusKeyword,
        seo_title: seoTitle,
        seo_description: seoDesc,
      };
      const url = editingPost ? `/api/admin/posts/${editingPost.id}` : '/api/admin/posts';
      const method = editingPost ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save post');
      toast(editingPost ? 'Post updated with revision saved.' : 'Post created.');
      setEditingPost(undefined);
      onClearTrigger?.();
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Posts &amp; Editorial Engine
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Publish style guides, yarn stories, scheduled posts, and manage revision history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Post</span>
        </button>
      </div>

      <DataTable
        rows={filtered}
        getRowId={(p) => p.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search articles or categories..."
        onRowClick={(p) => openEditor(p)}
        filterSlot={
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {(['all', 'published', 'scheduled', 'pending', 'draft'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${
                  statusFilter === st
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
        columns={[
          {
            key: 'title',
            header: 'Article',
            sortValue: (p) => p.title,
            render: (p) => (
              <div className="flex items-center gap-3">
                <SafeImage
                  src={p.featured_image}
                  alt={p.title}
                  className="w-10 h-10 rounded-lg object-cover border border-[#E4E6EB] dark:border-[#2C3344] shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-[#111315] dark:text-white truncate">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {p.category} · {p.author_name}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Workflow',
            sortValue: (p) => p.status,
            render: (p) => (
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                  p.status === 'published'
                    ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                    : p.status === 'scheduled'
                    ? 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A]/50 dark:text-[#93C5FD]'
                    : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D]'
                }`}
              >
                {p.status}
              </span>
            ),
          },
          {
            key: 'views',
            header: 'Views',
            align: 'right',
            sortValue: (p) => p.views_count,
            render: (p) => (
              <span className="font-mono tabular-nums">{p.views_count.toLocaleString()}</span>
            ),
          },
          {
            key: 'updated',
            header: 'Last Updated',
            align: 'right',
            sortValue: (p) => p.updated_at,
            render: (p) => (
              <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {formatDateTime(p.updated_at)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (p) => (
              <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openEditor(p)}
                  aria-label="Edit post"
                  title="Edit post"
                  className="p-1.5 rounded border border-[#E4E6EB] dark:border-[#2C3344]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete post"
                  title="Delete post"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/posts/${p.id}`, {
                        method: 'DELETE',
                        headers: authHeaders(),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(json.error || 'Failed to delete post');
                      toast('Post deleted.');
                      await reload();
                      notifyStoreChanged();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Unable to delete post', 'error');
                    }
                  }}
                  className="p-1.5 rounded border border-[#FECACA] text-[#DC2626]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={editingPost !== undefined}
        onClose={() => {
          setEditingPost(undefined);
          onClearTrigger?.();
        }}
        title={editingPost ? `Edit Post — ${editingPost.title}` : 'Write New Editorial Post'}
        size="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditingPost(undefined);
                onClearTrigger?.();
              }}
              className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
            >
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117] w-fit">
            {[
              { id: 'write' as const, label: 'Content & Publishing' },
              { id: 'seo' as const, label: 'SEO & SERP' },
              { id: 'revisions' as const, label: `Revisions (${revisions.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditorTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  editorTab === t.id
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {editorTab === 'write' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article headline..."
                  className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short editorial excerpt for cards & RSS..."
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
                <RichEditor value={content} onChange={setContent} media={data.media} />
              </div>

              <div className="lg:col-span-4 space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-3">
                  <div className="font-bold text-[#111315] dark:text-white">Publishing</div>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">Status</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BlogPostStatus)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending Review</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>
                  </label>
                  {status === 'scheduled' && (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">
                        Publish Date &amp; Time
                      </span>
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full h-9 px-2.5 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                      />
                    </label>
                  )}
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">Author</span>
                    <select
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    >
                      {data.users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">Category</span>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">
                      Tags (comma separated)
                    </span>
                    <input
                      type="text"
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    />
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-2.5">
                  <div className="font-bold text-[#111315] dark:text-white">Featured Image</div>
                  <SafeImage
                    src={featuredImage}
                    alt={title || 'Featured'}
                    className="w-full h-32 object-cover rounded-lg border border-[#E4E6EB] dark:border-[#2C3344]"
                  />
                  <select
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                  >
                    {data.media
                      .filter((m) => m.media_type === 'image')
                      .map((m) => (
                        <option key={m.url} value={m.url}>
                          {m.title || m.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {editorTab === 'seo' && (
            <SeoPanel
              title={title}
              slug={slug}
              focusKeyword={focusKeyword}
              seoTitle={seoTitle}
              seoDescription={seoDesc}
              contentText={content}
              basePath="/journal"
              onChange={(patch) => {
                if (patch.slug !== undefined) setSlug(patch.slug);
                if (patch.focus_keyword !== undefined) setFocusKeyword(patch.focus_keyword);
                if (patch.seo_title !== undefined) setSeoTitle(patch.seo_title);
                if (patch.seo_description !== undefined) setSeoDesc(patch.seo_description);
              }}
            />
          )}

          {editorTab === 'revisions' && (
            <div className="space-y-3">
              {revisions.length === 0 ? (
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Revisions are automatically captured every time you update this post.
                </p>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-[#111315] dark:text-white flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>{rev.title}</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                        {rev.author} · {formatDateTime(rev.saved_at)}
                      </div>
                      <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] line-clamp-2">
                        {rev.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(rev.title);
                        setContent(rev.content);
                        setEditorTab('write');
                        toast('Restored revision into editor. Click Save Post to publish.');
                      }}
                      className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium inline-flex items-center gap-1.5 shrink-0 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ==========================================
// 2. PAGES & INTERACTIVE MENU BUILDER
// ==========================================

export function PagesAndMenusView({
  ctx,
  triggerCreate,
  onClearTrigger,
}: {
  ctx: AdminContextHelpers;
  triggerCreate?: boolean;
  onClearTrigger?: () => void;
}) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [subTab, setSubTab] = useState<'pages' | 'menus'>('pages');

  // Pages state
  const [editingPage, setEditingPage] = useState<CmsPage | null | undefined>(
    triggerCreate ? null : undefined
  );
  const [pageTab, setPageTab] = useState<'content' | 'seo'>('content');
  const [pTitle, setPTitle] = useState('');
  const [pSlug, setPSlug] = useState('');
  const [pExcerpt, setPExcerpt] = useState('');
  const [pContent, setPContent] = useState('');
  const [pTemplate, setPTemplate] = useState<CmsPageTemplate>('default');
  const [pMenuLoc, setPMenuLoc] = useState<CmsMenuLocation>('footer');
  const [pShowProducts, setPShowProducts] = useState(false);
  const [pPublished, setPPublished] = useState(true);
  const [pSortOrder, setPSortOrder] = useState('10');
  const [pFocusKw, setPFocusKw] = useState('');
  const [pSeoTitle, setPSeoTitle] = useState('');
  const [pSeoDesc, setPSeoDesc] = useState('');

  // Menu builder state
  const [menuLoc, setMenuLoc] = useState<'header' | 'footer' | 'mobile'>('header');
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>(
    () => data.menus.find((m) => m.location === 'header')?.items || []
  );
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const openPageEditor = useCallback((page: CmsPage | null) => {
    setEditingPage(page);
    setPageTab('content');
    setPTitle(page?.title || '');
    setPSlug(page?.slug || '');
    setPExcerpt(page?.excerpt || '');
    setPContent(page?.content || '');
    setPTemplate(page?.template || 'default');
    setPMenuLoc(page?.menu_location || 'footer');
    setPShowProducts(page?.show_products ?? false);
    setPPublished(page?.is_published ?? true);
    setPSortOrder(String(page?.sort_order ?? 10));
    setPFocusKw(page?.focus_keyword || '');
    setPSeoTitle(page?.seo_title || '');
    setPSeoDesc(page?.seo_description || '');
  }, []);

  useEffect(() => {
    if (triggerCreate) {
      openPageEditor(null);
    }
  }, [triggerCreate, openPageEditor]);

  useEffect(() => {
    setMenuItems(data.menus.find((m) => m.location === menuLoc)?.items || []);
  }, [data.menus, menuLoc]);

  const switchMenuLoc = (loc: 'header' | 'footer' | 'mobile') => {
    setMenuLoc(loc);
  };

  const handleSavePage = async () => {
    if (!pTitle.trim()) {
      toast('Page title is required.', 'error');
      return;
    }
    try {
      const payload = {
        title: pTitle.trim(),
        slug: pSlug.trim() || undefined,
        excerpt: pExcerpt.trim(),
        content: pContent,
        template: pTemplate,
        menu_location: pMenuLoc,
        show_products: pShowProducts,
        is_published: pPublished,
        sort_order: Number(pSortOrder) || 10,
        focus_keyword: pFocusKw,
        seo_title: pSeoTitle,
        seo_description: pSeoDesc,
      };
      const url = editingPage ? `/api/admin/pages/${editingPage.id}` : '/api/admin/pages';
      const method = editingPage ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save page');
      toast(editingPage ? 'Page updated.' : 'New web page published.');
      setEditingPage(undefined);
      onClearTrigger?.();
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  const handleSaveMenu = async () => {
    try {
      const res = await fetch(`/api/admin/menus/${menuLoc}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ items: menuItems }),
      });
      if (!res.ok) throw new Error('Failed to save menu');
      toast(`Saved ${menuLoc} navigation menu.`);
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...menuItems];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setMenuItems(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
          <button
            type="button"
            onClick={() => setSubTab('pages')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              subTab === 'pages'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            Static &amp; Landing Pages ({data.pages.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('menus')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              subTab === 'menus'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            Navigation Menu Builder
          </button>
        </div>

        {subTab === 'pages' && (
          <button
            type="button"
            onClick={() => openPageEditor(null)}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Page</span>
          </button>
        )}
      </div>

      {subTab === 'pages' ? (
        <DataTable
          rows={data.pages}
          getRowId={(p) => p.id}
          onRowClick={(p) => openPageEditor(p)}
          columns={[
            {
              key: 'title',
              header: 'Page Title',
              sortValue: (p) => p.title,
              render: (p) => (
                <div>
                  <div className="font-semibold text-[#111315] dark:text-white">{p.title}</div>
                  <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                    /page/{p.slug}
                  </div>
                </div>
              ),
            },
            {
              key: 'template',
              header: 'Template',
              render: (p) => <span className="capitalize text-xs">{p.template}</span>,
            },
            {
              key: 'menu',
              header: 'Menu Placement',
              render: (p) => <span className="capitalize text-xs">{p.menu_location}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (p) => (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    p.is_published
                      ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                      : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D]'
                  }`}
                >
                  {p.is_published ? 'Published' : 'Draft'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (p) => (
                <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/page/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Preview live page"
                    title="Preview live page"
                    className="p-1.5 rounded border border-[#E4E6EB] dark:border-[#2C3344] text-[#525866] hover:text-[#111315] dark:text-[#9CA3AF]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => openPageEditor(p)}
                    aria-label="Edit page"
                    title="Edit page"
                    className="p-1.5 rounded border border-[#E4E6EB] dark:border-[#2C3344]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete page"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/pages/${p.id}`, {
                          method: 'DELETE',
                          headers: authHeaders(),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to delete page');
                        toast('Page removed.');
                        await reload();
                        notifyStoreChanged();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Unable to delete page', 'error');
                      }
                    }}
                    title="Delete page"
                    className="p-1.5 rounded border border-[#FECACA] text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-3 text-xs">
              <div className="font-bold text-[#111315] dark:text-white">Menu Location</div>
              <div className="flex gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
                {(['header', 'footer', 'mobile'] as const).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => switchMenuLoc(loc)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium capitalize ${
                      menuLoc === loc
                        ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                        : 'text-[#525866] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              <div className="font-bold text-[#111315] dark:text-white pt-2">
                Add Storefront Pages
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[
                  { label: 'Men', url: '/men', type: 'category' as const },
                  { label: 'Women', url: '/women', type: 'category' as const },
                  { label: 'Kids & Baby', url: '/kids-baby', type: 'category' as const },
                  { label: 'All Socks', url: '/socks', type: 'category' as const },
                  { label: 'Size Chart', url: '/size-chart', type: 'page' as const },
                  ...data.pages.map((pg) => ({
                    label: pg.title,
                    url: `/page/${pg.slug}`,
                    type: 'page' as const,
                  })),
                ].map((link) => (
                  <button
                    key={link.url}
                    type="button"
                    onClick={() =>
                      setMenuItems((prev) => [
                        ...prev,
                        {
                          id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                          label: link.label,
                          url: link.url,
                          type: link.type,
                          children: [],
                        },
                      ])
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#1F2430]"
                  >
                    <span>{link.label}</span>
                    <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
                  </button>
                ))}
              </div>

              <div className="font-bold text-[#111315] dark:text-white pt-2">Custom Link</div>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Label (e.g. Track Order)"
                className="w-full h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="URL (e.g. /reviews)"
                className="w-full h-8 px-2.5 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!customLabel.trim() || !customUrl.trim()) return;
                  setMenuItems((prev) => [
                    ...prev,
                    {
                      id: `c-${Date.now()}`,
                      label: customLabel.trim(),
                      url: customUrl.trim(),
                      type: 'custom',
                      children: [],
                    },
                  ]);
                  setCustomLabel('');
                  setCustomUrl('');
                }}
                className="w-full h-8 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold"
              >
                Add to Menu
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#111315] dark:text-white capitalize">
                  {menuLoc} Menu Structure ({menuItems.length} items)
                </h2>
                <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
                  Reorder links or nest dropdown sub-items.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveMenu}
                className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
              >
                Save Menu
              </button>
            </div>

            <div className="space-y-2.5">
              {menuItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        setMenuItems((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, label: e.target.value } : m))
                        )
                      }
                      className="h-8 px-2.5 text-xs font-semibold rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) =>
                        setMenuItems((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, url: e.target.value } : m))
                        )
                      }
                      className="flex-1 min-w-[140px] h-8 px-2.5 text-xs font-mono rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                    />
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      aria-label="Move menu item up"
                      className="p-1.5 rounded border border-[#E4E6EB] dark:border-[#2C3344]"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      aria-label="Move menu item down"
                      className="p-1.5 rounded border border-[#E4E6EB] dark:border-[#2C3344]"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMenuItems((prev) =>
                          prev.map((m, i) =>
                            i === idx
                              ? {
                                  ...m,
                                  children: [
                                    ...m.children,
                                    {
                                      id: `sub-${Date.now()}`,
                                      label: 'Sub-link',
                                      url: '/socks',
                                      type: 'custom',
                                      children: [],
                                    },
                                  ],
                                }
                              : m
                          )
                        )
                      }
                      className="h-8 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] text-[11px] font-medium"
                    >
                      + Sub-item
                    </button>
                    <button
                      type="button"
                      aria-label="Remove menu item"
                      title="Remove menu item"
                      onClick={() => setMenuItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded border border-[#FECACA] text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {item.children.length > 0 && (
                    <div className="pl-6 space-y-1.5">
                      {item.children.map((child, cIdx) => (
                        <div key={child.id} className="flex items-center gap-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          <input
                            type="text"
                            value={child.label}
                            onChange={(e) =>
                              setMenuItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx
                                    ? {
                                        ...m,
                                        children: m.children.map((ch, ci) =>
                                          ci === cIdx ? { ...ch, label: e.target.value } : ch
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                            className="h-7 px-2 text-xs rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                          />
                          <input
                            type="text"
                            value={child.url}
                            onChange={(e) =>
                              setMenuItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx
                                    ? {
                                        ...m,
                                        children: m.children.map((ch, ci) =>
                                          ci === cIdx ? { ...ch, url: e.target.value } : ch
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                            className="flex-1 h-7 px-2 text-xs font-mono rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                          />
                          <button
                            type="button"
                            aria-label="Remove sub-item"
                            title="Remove sub-item"
                            onClick={() =>
                              setMenuItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx
                                    ? {
                                        ...m,
                                        children: m.children.filter((_, ci) => ci !== cIdx),
                                      }
                                    : m
                                )
                              )
                            }
                            className="p-1 text-[#DC2626]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Page Editor Modal */}
      <Modal
        open={editingPage !== undefined}
        onClose={() => {
          setEditingPage(undefined);
          onClearTrigger?.();
        }}
        title={editingPage ? `Edit Page — ${editingPage.title}` : 'Create New Web Page'}
        size="2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditingPage(undefined);
                onClearTrigger?.();
              }}
              className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePage}
              className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
            >
              Save Page
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117] w-fit">
            <button
              type="button"
              onClick={() => setPageTab('content')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                pageTab === 'content'
                  ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                  : 'text-[#525866] dark:text-[#9CA3AF]'
              }`}
            >
              Page Layout &amp; Content
            </button>
            <button
              type="button"
              onClick={() => setPageTab('seo')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                pageTab === 'seo'
                  ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                  : 'text-[#525866] dark:text-[#9CA3AF]'
              }`}
            >
              SEO Settings
            </button>
          </div>

          {pageTab === 'content' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-3">
                <input
                  type="text"
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  placeholder="Page Title (e.g. Eid Gift Hampers)"
                  className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
                <input
                  type="text"
                  value={pExcerpt}
                  onChange={(e) => setPExcerpt(e.target.value)}
                  placeholder="Subtitle / excerpt shown at top of page..."
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                />
                <RichEditor value={pContent} onChange={setPContent} media={data.media} minRows={10} />
              </div>

              <div className="lg:col-span-4 space-y-3 text-xs">
                <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] space-y-3">
                  <div className="font-bold">Page Attributes</div>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">Template</span>
                    <select
                      value={pTemplate}
                      onChange={(e) => setPTemplate(e.target.value as CmsPageTemplate)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    >
                      <option value="default">Default Page</option>
                      <option value="full-width">Full-Width Canvas</option>
                      <option value="landing">Landing Page</option>
                      <option value="collection">Product Collection</option>
                      <option value="contact">Contact Form Page</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">
                      Menu Placement
                    </span>
                    <select
                      value={pMenuLoc}
                      onChange={(e) => setPMenuLoc(e.target.value as CmsMenuLocation)}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    >
                      <option value="header">Header Navigation</option>
                      <option value="footer">Footer Links</option>
                      <option value="both">Header &amp; Footer</option>
                      <option value="none">Hidden (Direct Link Only)</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] text-[#525866] dark:text-[#9CA3AF]">
                      Sort Order
                    </span>
                    <input
                      type="number"
                      value={pSortOrder}
                      onChange={(e) => setPSortOrder(e.target.value)}
                      className="w-full h-9 px-2.5 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                    />
                  </label>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pShowProducts}
                      onChange={(e) => setPShowProducts(e.target.checked)}
                    />
                    <span>Show Assigned Products Grid on this Page</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pPublished}
                      onChange={(e) => setPPublished(e.target.checked)}
                    />
                    <span>Published on Storefront</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <SeoPanel
              title={pTitle}
              slug={pSlug}
              focusKeyword={pFocusKw}
              seoTitle={pSeoTitle}
              seoDescription={pSeoDesc}
              contentText={pContent}
              basePath="/page"
              onChange={(patch) => {
                if (patch.slug !== undefined) setPSlug(patch.slug);
                if (patch.focus_keyword !== undefined) setPFocusKw(patch.focus_keyword);
                if (patch.seo_title !== undefined) setPSeoTitle(patch.seo_title);
                if (patch.seo_description !== undefined) setPSeoDesc(patch.seo_description);
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

// ==========================================
// 3. MEDIA LIBRARY & ASSET INSPECTOR VIEW
// ==========================================

export function MediaLibraryView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, toast } = ctx;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedItem = useMemo(
    () => data.media.find((m) => m.url === selectedUrl) || null,
    [data.media, selectedUrl]
  );
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAlt, setMetaAlt] = useState('');
  const [metaCaption, setMetaCaption] = useState('');

  const openInspector = (url: string) => {
    const item = data.media.find((m) => m.url === url);
    if (!item) return;
    setSelectedUrl(url);
    setMetaTitle(item.title || item.name);
    setMetaAlt(item.alt_text || '');
    setMetaCaption(item.caption || '');
  };

  const filtered = useMemo(
    () => data.media.filter((m) => typeFilter === 'all' || m.media_type === typeFilter),
    [data.media, typeFilter]
  );

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) throw new Error(`Failed uploading ${file.name}`);
      }
      toast(`Uploaded ${files.length} file(s) to Media Library.`);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">Media Library</h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Upload images, edit SEO Alt Text &amp; captions, and copy direct asset URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
            {(['all', 'image', 'video', 'document'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${
                  typeFilter === t
                    ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                    : 'text-[#525866] dark:text-[#9CA3AF]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
            className="h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] inline-flex items-center gap-1.5 text-xs font-medium"
          >
            {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            <span>{viewMode === 'grid' ? 'List' : 'Grid'}</span>
          </button>

          <label className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload Media'}</span>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,.pdf"
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
          </label>
        </div>
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleUploadFiles(e.dataTransfer.files);
        }}
        className="p-4 rounded-xl border border-dashed border-[#D1D5DB] dark:border-[#374151] bg-[#F9FAFB] dark:bg-[#10131A] text-center text-xs text-[#525866] dark:text-[#9CA3AF]"
      >
        Drag and drop product photos, editorial banners, or PDFs here to upload directly into Mashuka storage.
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item.url}
              onClick={() => openInspector(item.url)}
              className="group cursor-pointer rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] overflow-hidden hover:border-[#2563EB] transition-colors"
            >
              <SafeImage
                src={item.url}
                alt={item.alt_text || item.name}
                className="w-full h-36 object-cover"
              />
              <div className="p-2.5 space-y-1">
                <div className="text-xs font-semibold text-[#111315] dark:text-white truncate">
                  {item.title || item.name}
                </div>
                <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] flex justify-between">
                  <span className="uppercase">{item.source}</span>
                  <span>{Math.round(item.size_bytes / 1024)} KB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          rows={filtered}
          getRowId={(m) => m.url}
          onRowClick={(m) => openInspector(m.url)}
          columns={[
            {
              key: 'name',
              header: 'Asset',
              render: (m) => (
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={m.url}
                    alt={m.alt_text || m.name}
                    className="w-9 h-9 rounded object-cover border border-[#E4E6EB] dark:border-[#2C3344]"
                  />
                  <div>
                    <div className="font-semibold">{m.title || m.name}</div>
                    <div className="text-[11px] font-mono text-[#6B7280]">{m.url}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'source',
              header: 'Source',
              render: (m) => <span className="capitalize">{m.source}</span>,
            },
            {
              key: 'size',
              header: 'Size',
              align: 'right',
              render: (m) => (
                <span className="font-mono tabular-nums">{Math.round(m.size_bytes / 1024)} KB</span>
              ),
            },
          ]}
        />
      )}

      <SlideOverDrawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedUrl(null)}
        title="Asset Inspector"
        subtitle={selectedItem?.name || ''}
        footer={
          selectedItem && (
            <>
              {selectedItem.source === 'upload' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/media/${encodeURIComponent(selectedItem.name)}`, {
                        method: 'DELETE',
                        headers: authHeaders(),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(json.error || 'Failed to delete file');
                      setSelectedUrl(null);
                      toast('Uploaded file deleted.');
                      await reload();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
                    }
                  }}
                  className="h-9 px-3 rounded-lg border border-[#FECACA] text-[#DC2626] text-xs font-medium mr-auto"
                >
                  Delete File
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/media/meta', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...authHeaders() },
                      body: JSON.stringify({
                        url: selectedItem.url,
                        title: metaTitle,
                        alt_text: metaAlt,
                        caption: metaCaption,
                      }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json.error || 'Failed to save metadata');
                    toast('Asset SEO metadata updated.');
                    await reload();
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Save failed', 'error');
                  }
                }}
                className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
              >
                Save Metadata
              </button>
            </>
          )
        }
      >
        {selectedItem && (
          <div className="space-y-4 text-xs">
            <SafeImage
              src={selectedItem.url}
              alt={metaAlt || selectedItem.name}
              className="w-full h-52 object-cover rounded-xl border border-[#E4E6EB] dark:border-[#2C3344]"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={selectedItem.url}
                className="flex-1 h-8 px-2.5 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117]"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(selectedItem.url);
                  setCopiedUrl(selectedItem.url);
                  setTimeout(() => setCopiedUrl(null), 1500);
                }}
                className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] inline-flex items-center gap-1"
              >
                {copiedUrl === selectedItem.url ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <label className="block space-y-1">
              <span className="font-medium">Title</span>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">SEO Alt Text</span>
              <input
                type="text"
                value={metaAlt}
                onChange={(e) => setMetaAlt(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Caption</span>
              <textarea
                rows={2}
                value={metaCaption}
                onChange={(e) => setMetaCaption(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}

// ==========================================
// 4. SEO, SITEMAP, ROBOTS & REDIRECTS VIEW
// ==========================================

export function SeoAndRedirectsView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, currentUser, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const canEditGlobalSeo = currentUser.role === 'Super Admin';
  const [sitemapEnabled, setSitemapEnabled] = useState(data.cms.sitemap_enabled);
  const [robotsTxt, setRobotsTxt] = useState(data.cms.robots_txt);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusCode, setStatusCode] = useState<301 | 302>(301);

  useEffect(() => {
    setSitemapEnabled(data.cms.sitemap_enabled);
    setRobotsTxt(data.cms.robots_txt);
  }, [data.cms.sitemap_enabled, data.cms.robots_txt]);

  const handleSaveGlobalSeo = async () => {
    if (!canEditGlobalSeo) {
      toast('Super Admin role required to update global indexing settings.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          cms: { ...data.cms, sitemap_enabled: sitemapEnabled, robots_txt: robotsTxt },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save indexing settings');
      toast('XML Sitemap and robots.txt saved.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  const handleAddRedirect = async () => {
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ from_path: fromPath, to_path: toPath, status_code: statusCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json.error || 'Redirect error', 'error');
        return;
      }
      setFromPath('');
      setToPath('');
      toast('URL Redirect rule created.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Redirect error', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-lg font-bold text-[#111315] dark:text-white">
          SEO, Sitemap &amp; 301/302 Redirects
        </h1>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
          Manage technical SEO indexing rules, XML sitemap generation, and legacy URL redirects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">XML Sitemap &amp; Robots.txt</div>
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                disabled={!canEditGlobalSeo}
                checked={sitemapEnabled}
                onChange={(e) => setSitemapEnabled(e.target.checked)}
              />
              <span>Enable XML Sitemap</span>
            </label>
          </div>
          {!canEditGlobalSeo && (
            <div className="p-2.5 rounded-lg border border-[#FDE68A] bg-[#FEF3C7]/60 dark:border-[#78350F] dark:bg-[#451A03]/30 text-[11px] text-[#92400E] dark:text-[#FCD34D]">
              Read-only: Super Admin permissions are required to update XML Sitemap and robots.txt.
            </div>
          )}
          <textarea
            rows={6}
            disabled={!canEditGlobalSeo}
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
            className="w-full p-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] disabled:opacity-60"
          />
          <button
            type="button"
            disabled={!canEditGlobalSeo}
            onClick={handleSaveGlobalSeo}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold disabled:opacity-50"
          >
            Save Indexing Settings
          </button>
        </div>

        <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4 text-xs">
          <div className="font-bold text-sm">Add 301 / 302 URL Redirect</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              placeholder="/old-sock-url"
              className="h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
            <input
              type="text"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              placeholder="/socks"
              className="h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value) as 301 | 302)}
              className="h-9 px-2.5 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            >
              <option value={301}>301 Permanent</option>
              <option value={302}>302 Temporary</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddRedirect}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold"
          >
            Add Redirect Rule
          </button>

          <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36] pt-2">
            {data.redirects.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="font-mono">
                  <span className="font-semibold">{r.from_path}</span> → <span>{r.to_path}</span>
                  <div className="text-[11px] text-[#6B7280]">
                    HTTP {r.status_code} · {r.hits} hits
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete redirect rule"
                  title="Delete redirect rule"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/redirects/${r.id}`, {
                        method: 'DELETE',
                        headers: authHeaders(),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(json.error || 'Failed to delete redirect');
                      toast('Redirect deleted.');
                      await reload();
                      notifyStoreChanged();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
                    }
                  }}
                  className="p-1.5 text-[#DC2626]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. UNIFIED MODERATION & CUSTOMER CARE HUB
// ==========================================

export function ModerationHubView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [tab, setTab] = useState<'reviews' | 'returns' | 'inbox'>('reviews');
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[#111315] dark:text-white">
          Reviews, Returns &amp; Inbox Moderation
        </h1>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
          Approve customer product reviews, manage return/exchange tickets, and answer Contact Us messages.
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117] w-fit">
        <button
          type="button"
          onClick={() => setTab('reviews')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
            tab === 'reviews'
              ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
              : 'text-[#525866] dark:text-[#9CA3AF]'
          }`}
        >
          Reviews &amp; Comments ({data.reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('returns')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
            tab === 'returns'
              ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
              : 'text-[#525866] dark:text-[#9CA3AF]'
          }`}
        >
          Return Requests ({data.returns.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('inbox')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
            tab === 'inbox'
              ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
              : 'text-[#525866] dark:text-[#9CA3AF]'
          }`}
        >
          Contact Inbox ({data.messages.length})
        </button>
      </div>

      {tab === 'reviews' && (
        <div className="space-y-3">
          {data.reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#111315] dark:text-white">{rev.title}</span>
                  <span className="text-[#6B7280] dark:text-[#9CA3AF] ml-2">
                    {rev.reviewer_name} ({rev.reviewer_city}) · {rev.rating}/5 ★ · {rev.product_name}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                    rev.is_approved
                      ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                      : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D]'
                  }`}
                >
                  {rev.status || (rev.is_approved ? 'approved' : 'pending')}
                </span>
              </div>
              <p className="text-[#374151] dark:text-[#D1D5DB]">{rev.comment}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={replyDrafts[rev.id] ?? rev.admin_reply ?? ''}
                  onChange={(e) => setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })}
                  placeholder="Write official Mashuka store reply..."
                  className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117]"
                />
                {(['approved', 'pending', 'spam', 'trashed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/reviews/${rev.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({
                            status: st,
                            is_approved: st === 'approved',
                            admin_reply: replyDrafts[rev.id] ?? rev.admin_reply,
                          }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to update review');
                        toast(`Review marked ${st}.`);
                        await reload();
                        notifyStoreChanged();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Update failed', 'error');
                      }
                    }}
                    className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] capitalize hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                  >
                    {st === 'approved' ? 'Approve' : st}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/reviews/${rev.id}`, {
                        method: 'DELETE',
                        headers: authHeaders(),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(json.error || 'Failed to delete review');
                      toast('Review permanently deleted.');
                      await reload();
                      notifyStoreChanged();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-[#FECACA] text-[#DC2626]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'returns' && (
        <div className="space-y-3">
          {data.returns.map((ret) => (
            <div
              key={ret.id}
              className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono font-bold">
                  {ret.request_number} · Order {ret.order_number} · {ret.customer_name} (
                  {ret.customer_phone})
                </div>
                <select
                  aria-label="Return request status"
                  value={ret.status}
                  onChange={async (e) => {
                    try {
                      const res = await fetch(`/api/admin/returns/${ret.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                        body: JSON.stringify({ status: e.target.value as ReturnStatus }),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(json.error || 'Failed to update return request');
                      toast('Return status updated.');
                      await reload();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Update failed', 'error');
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  {['requested', 'approved', 'pickup_scheduled', 'completed', 'rejected'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="text-[#525866] dark:text-[#9CA3AF]">
                Reason: {ret.reason} · Preferred Resolution: {ret.resolution}
              </div>
              <p>{ret.details}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'inbox' && (
        <div className="space-y-3">
          {data.messages.length === 0 ? (
            <div className="p-8 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] text-center text-xs text-[#6B7280]">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-60" />
              No Contact Us submissions yet.
            </div>
          ) : (
            data.messages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold">
                    {msg.subject} — {msg.name} ({msg.phone || msg.email})
                  </div>
                  <select
                    aria-label="Message status"
                    value={msg.status}
                    onChange={async (e) => {
                      try {
                        const res = await fetch(`/api/admin/messages/${msg.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to update message status');
                        toast('Message status updated.');
                        await reload();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Update failed', 'error');
                      }
                    }}
                    className="h-7 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                  >
                    <option value="unread">Unread</option>
                    <option value="replied">Replied</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <p className="text-[#374151] dark:text-[#D1D5DB]">{msg.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. APPEARANCE CUSTOMIZER & PLUGINS HUB
// ==========================================

export function AppearanceAndPluginsView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [subTab, setSubTab] = useState<'appearance' | 'plugins'>('appearance');
  const [draft, setDraft] = useState<CmsSettings>(data.cms);
  const [editingPlugin, setEditingPlugin] = useState<CmsPlugin | null>(null);
  const [pluginConfigDraft, setPluginConfigDraft] = useState<
    Record<string, string | number | boolean>
  >({});

  useEffect(() => {
    setDraft(data.cms);
  }, [data.cms]);

  const saveAppearance = async () => {
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cms: draft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save appearance');
      toast('Brand appearance & typography updated.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F3F4F6] dark:bg-[#0E1117]">
          <button
            type="button"
            onClick={() => setSubTab('appearance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              subTab === 'appearance'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            Theme &amp; Brand Customizer
          </button>
          <button
            type="button"
            onClick={() => setSubTab('plugins')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              subTab === 'plugins'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            Modular Plugins ({data.plugins.filter((p) => p.is_enabled).length}/{data.plugins.length})
          </button>
        </div>

        {subTab === 'appearance' && (
          <button
            type="button"
            onClick={saveAppearance}
            className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
          >
            Save Appearance
          </button>
        )}
      </div>

      {subTab === 'appearance' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
            <div className="font-bold text-sm">Brand Identity &amp; Logo</div>
            <div className="flex items-center gap-4">
              <SafeImage
                src={draft.logo_url}
                alt={draft.brand_name}
                className="w-16 h-16 rounded-xl object-cover border border-[#E4E6EB] dark:border-[#2C3344]"
              />
              <div className="flex-1 space-y-2">
                <select
                  value={draft.logo_url}
                  onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  {data.media
                    .filter((m) => m.media_type === 'image')
                    .map((m) => (
                      <option key={m.url} value={m.url}>
                        {m.title || m.name}
                      </option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={draft.brand_name}
                    onChange={(e) => setDraft({ ...draft, brand_name: e.target.value })}
                    placeholder="Brand Name"
                    className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                  />
                  <input
                    type="text"
                    value={draft.brand_slogan}
                    onChange={(e) => setDraft({ ...draft, brand_slogan: e.target.value })}
                    placeholder="Slogan"
                    className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="block space-y-1">
                <span className="font-medium">Primary Brand Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.primary_color}
                    onChange={(e) => setDraft({ ...draft, primary_color: e.target.value })}
                    className="h-9 w-12 rounded border border-[#E4E6EB]"
                  />
                  <span className="font-mono">{draft.primary_color}</span>
                </div>
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Accent Action Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.accent_color}
                    onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
                    className="h-9 w-12 rounded border border-[#E4E6EB]"
                  />
                  <span className="font-mono">{draft.accent_color}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
            <div className="font-bold text-sm">Typography &amp; Layout Presets</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-medium">Heading Font</span>
                <select
                  value={draft.heading_font}
                  onChange={(e) => setDraft({ ...draft, heading_font: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Manrope">Manrope</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Body Font</span>
                <select
                  value={draft.body_font}
                  onChange={(e) => setDraft({ ...draft, body_font: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="DM Sans">DM Sans</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Lora">Lora</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Header Layout</span>
                <select
                  value={draft.header_layout}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      header_layout: e.target.value as CmsSettings['header_layout'],
                    })
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="classic">Classic 3-Zone Bar</option>
                  <option value="centered">Centered Logo</option>
                  <option value="minimal">Minimal Compact</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Footer Layout</span>
                <select
                  value={draft.footer_layout}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      footer_layout: e.target.value as CmsSettings['footer_layout'],
                    })
                  }
                  className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                >
                  <option value="4-column">4-Column Storefront</option>
                  <option value="compact">Compact Strip</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-medium">Size Chart Care Notes</span>
              <textarea
                rows={2}
                value={draft.size_chart_notes}
                onChange={(e) => setDraft({ ...draft, size_chart_notes: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.plugins.map((pl) => (
            <div
              key={pl.id}
              className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] flex flex-col justify-between gap-4 text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-[#111315] dark:text-white">
                      {pl.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                      {pl.category} · {pl.version}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/plugins/${pl.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', ...authHeaders() },
                          body: JSON.stringify({ is_enabled: !pl.is_enabled }),
                        });
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(json.error || 'Failed to update plugin');
                        toast(`${pl.name} ${!pl.is_enabled ? 'activated' : 'deactivated'}.`);
                        await reload();
                        notifyStoreChanged();
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Update failed', 'error');
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                      pl.is_enabled
                        ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                        : 'bg-[#F3F4F6] text-[#525866] dark:bg-[#27272A] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {pl.is_enabled ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <p className="text-[#525866] dark:text-[#9CA3AF] leading-relaxed">
                  {pl.description}
                </p>
                {!['newsletter-popup', 'schema-jsonld', 'bkash-webhook'].includes(pl.id) && (
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] italic">
                    Settings are stored cleanly; background scheduling requires an external worker.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingPlugin(pl);
                  setPluginConfigDraft({ ...pl.config });
                }}
                className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Settings</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editingPlugin)}
        onClose={() => setEditingPlugin(null)}
        title={editingPlugin ? `${editingPlugin.name} Settings` : ''}
        size="sm"
        footer={
          editingPlugin && (
            <>
              <button
                type="button"
                onClick={() => setEditingPlugin(null)}
                className="h-8 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/admin/plugins/${editingPlugin.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...authHeaders() },
                      body: JSON.stringify({ config: pluginConfigDraft }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json.error || 'Failed to save plugin config');
                    toast(`${editingPlugin.name} settings saved.`);
                    setEditingPlugin(null);
                    await reload();
                    notifyStoreChanged();
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Save failed', 'error');
                  }
                }}
                className="h-8 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
              >
                Save Plugin Config
              </button>
            </>
          )
        }
      >
        {editingPlugin && (
          <div className="space-y-3 text-xs">
            {Object.entries(pluginConfigDraft).map(([k, val]) => (
              <label key={k} className="block space-y-1">
                <span className="font-medium capitalize">{k.replace(/_/g, ' ')}</span>
                {typeof val === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) =>
                      setPluginConfigDraft({ ...pluginConfigDraft, [k]: e.target.checked })
                    }
                    className="block"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(val)}
                    onChange={(e) =>
                      setPluginConfigDraft({ ...pluginConfigDraft, [k]: e.target.value })
                    }
                    className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
                  />
                )}
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
