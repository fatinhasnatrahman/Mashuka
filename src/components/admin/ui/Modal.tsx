import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '../types.ts';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: ReactNode;
  footer?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div
        className={`w-full ${SIZE_CLASSES[size]} max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-[#14171F] border border-[#E4E6EB] dark:border-[#252A36] shadow-xl text-[#111315] dark:text-[#F3F4F6]`}
      >
        <div className="px-6 py-4 border-b border-[#E4E6EB] dark:border-[#252A36] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111315] dark:text-white truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#525866] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] hover:text-[#111315] dark:hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#11141B] rounded-b-xl flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface SlideOverDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

const DRAWER_WIDTHS: Record<NonNullable<SlideOverDrawerProps['width']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
};

export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  width = 'lg',
  children,
  footer,
}: SlideOverDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
    >
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
      <aside
        className={`w-full ${DRAWER_WIDTHS[width]} h-full flex flex-col bg-white dark:bg-[#14171F] border-l border-[#E4E6EB] dark:border-[#252A36] shadow-2xl text-[#111315] dark:text-[#F3F4F6]`}
      >
        <div className="px-6 py-4 border-b border-[#E4E6EB] dark:border-[#252A36] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111315] dark:text-white truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-[#525866] dark:text-[#9CA3AF] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-[#525866] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] hover:text-[#111315] dark:hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#11141B] flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const icon =
          t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
          ) : t.type === 'info' ? (
            <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          );
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg bg-white dark:bg-[#1A1F2B] border border-[#E4E6EB] dark:border-[#2C3344] shadow-lg text-xs font-medium text-[#111315] dark:text-[#F3F4F6]"
          >
            {icon}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-[#9CA3AF] hover:text-[#111315] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
