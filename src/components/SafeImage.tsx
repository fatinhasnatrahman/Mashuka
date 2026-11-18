import { useState } from 'react';
import { Package } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = '', fallbackTitle }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] text-[#525866] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-7 h-7 mb-2 opacity-50" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#525866] line-clamp-2 max-w-[180px]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
