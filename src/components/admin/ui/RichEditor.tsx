import { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Link2,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Eye,
  Edit3,
  Minus,
} from 'lucide-react';
import type { MediaItem } from '../../../types.ts';
import { RichContentRenderer } from '../../../utils/richText.tsx';
import { SafeImage } from '../../SafeImage.tsx';
import { Modal } from './Modal.tsx';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  media?: MediaItem[];
  placeholder?: string;
  minRows?: number;
}

export function RichEditor({
  value,
  onChange,
  media = [],
  placeholder = 'Write structured editorial or page content...',
  minRows = 12,
}: RichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const insertAroundSelection = (before: string, after = '', defaultText = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${before}${defaultText}${after}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || defaultText;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertBlock = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}\n\n${snippet}`);
      return;
    }
    const pos = el.selectionStart ?? value.length;
    const prefix = pos > 0 && !value.slice(0, pos).endsWith('\n') ? '\n\n' : '';
    const next = `${value.slice(0, pos)}${prefix}${snippet}\n${value.slice(pos)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
    });
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="rounded-xl border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] overflow-hidden">
      <div className="px-3 py-2 border-b border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#14171F] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            title="Heading 2"
            onClick={() => insertBlock('## Section Heading')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Heading 3"
            onClick={() => insertBlock('### Subheading')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-[#E4E6EB] dark:bg-[#2C3344] mx-1" />
          <button
            type="button"
            title="Bold"
            onClick={() => insertAroundSelection('**', '**', 'bold text')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Italic"
            onClick={() => insertAroundSelection('*', '*', 'italic text')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Insert Link"
            onClick={() => insertAroundSelection('[', '](https://mashuka.com)', 'link label')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-[#E4E6EB] dark:bg-[#2C3344] mx-1" />
          <button
            type="button"
            title="Bullet List"
            onClick={() => insertBlock('- First item\n- Second item')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => insertBlock('1. First step\n2. Second step')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Blockquote"
            onClick={() => insertBlock('> Highlighted quote or customer insight.')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Code Snippet"
            onClick={() => insertBlock('```\nCare & Yarn Specification\n```')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Divider"
            onClick={() => insertBlock('---')}
            className="p-1.5 rounded hover:bg-[#E5E7EB] dark:hover:bg-[#1F2430] text-[#374151] dark:text-[#D1D5DB]"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="ml-1 px-2.5 py-1 rounded bg-white dark:bg-[#1F2430] border border-[#E4E6EB] dark:border-[#2C3344] text-xs font-medium text-[#111315] dark:text-white inline-flex items-center gap-1.5 hover:border-[#2563EB]"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Media</span>
          </button>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#E5E7EB]/60 dark:bg-[#0E1117]">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
              mode === 'write'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
              mode === 'preview'
                ? 'bg-white dark:bg-[#1F2430] text-[#111315] dark:text-white shadow-xs'
                : 'text-[#525866] dark:text-[#9CA3AF]'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          rows={minRows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 text-sm leading-relaxed bg-transparent text-[#111315] dark:text-[#F3F4F6] placeholder:text-[#9CA3AF] focus:outline-none resize-y font-sans"
        />
      ) : (
        <div className="p-5 min-h-[240px]">
          {value.trim() ? (
            <RichContentRenderer content={value} />
          ) : (
            <p className="text-xs text-[#9CA3AF] italic">
              Nothing to preview yet. Switch to Write mode to compose content.
            </p>
          )}
        </div>
      )}

      <div className="px-4 py-2 border-t border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#14171F] flex items-center justify-between text-[11px] text-[#525866] dark:text-[#9CA3AF] font-mono tabular-nums">
        <span>Block Markdown Supported</span>
        <span>
          {wordCount} words · {value.length} chars · ~{readMinutes} min read
        </span>
      </div>

      <Modal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        title="Insert Image from Media Library"
        subtitle="Select an asset to embed inside your content block."
        size="lg"
      >
        {media.filter((m) => m.media_type === 'image').length === 0 ? (
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            No images found in Media Library. Upload assets under Content CMS → Media Library.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {media
              .filter((m) => m.media_type === 'image')
              .map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    insertBlock(`![${item.alt_text || item.title || item.name}](${item.url})`);
                    setMediaModalOpen(false);
                  }}
                  className="group text-left rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] overflow-hidden hover:border-[#2563EB] transition-colors bg-[#F9FAFB] dark:bg-[#0E1117]"
                >
                  <SafeImage
                    src={item.url}
                    alt={item.alt_text || item.name}
                    className="w-full h-28 object-cover"
                  />
                  <div className="p-2 text-[11px] font-medium truncate text-[#111315] dark:text-white">
                    {item.title || item.name}
                  </div>
                </button>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
