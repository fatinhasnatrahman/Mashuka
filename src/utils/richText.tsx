import type { ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      const href = match[3].trim();
      const safeHref =
        href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/')
          ? href
          : '#';
      nodes.push(
        <a
          key={key++}
          href={safeHref}
          target={safeHref.startsWith('http') ? '_blank' : undefined}
          rel={safeHref.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-[#1D4ED8] dark:text-[#60A5FA] underline underline-offset-2 hover:text-[#111315] dark:hover:text-white"
        >
          {match[2]}
        </a>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[#111315] dark:text-white">
          {match[4]}
        </strong>
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <em key={key++} className="italic">
          {match[5]}
        </em>
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#1F2430] text-[#111315] dark:text-[#F3F4F6] font-mono text-[0.88em]"
        >
          {match[6]}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function RichContentRenderer({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  if (!content || !content.trim()) return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={key++}
          className="p-4 rounded-lg bg-[#111315] text-[#F9FAFB] font-mono text-xs overflow-x-auto"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<hr key={key++} className="border-t border-[#E4E6EB] dark:border-[#2C3344] my-4" />);
      i++;
      continue;
    }

    // Standalone image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      elements.push(
        <figure key={key++} className="my-4 space-y-1.5">
          <img
            src={imgMatch[2].trim()}
            alt={imgMatch[1] || 'Editorial image'}
            className="w-full max-h-[420px] object-cover rounded-xl border border-[#E4E6EB] dark:border-[#2C3344]"
          />
          {imgMatch[1] && (
            <figcaption className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{imgMatch[1]}</figcaption>
          )}
        </figure>
      );
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-semibold text-[#111315] dark:text-white pt-2">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-[#111315] dark:text-white pt-3">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-[#111315] dark:text-white pt-3">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="border-l-4 border-[#1D4ED8] pl-4 py-1 text-[#374151] dark:text-[#D1D5DB] italic bg-[#F6F7F8] dark:bg-[#0E1117] rounded-r-lg"
        >
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc pl-5 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (consume consecutive non-special lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        !t ||
        t.startsWith('#') ||
        t.startsWith('> ') ||
        t.startsWith('```') ||
        /^[-*_]{3,}$/.test(t) ||
        /^[-*]\s+/.test(t) ||
        /^\d+\.\s+/.test(t) ||
        /^!\[([^\]]*)\]\(([^)]+)\)$/.test(t)
      ) {
        break;
      }
      paraLines.push(t);
      i++;
    }
    elements.push(<p key={key++}>{renderInline(paraLines.join(' '))}</p>);
  }

  return (
    <div className={`space-y-4 text-[15px] leading-relaxed text-[#374151] dark:text-[#D1D5DB] ${className}`}>
      {elements}
    </div>
  );
}
