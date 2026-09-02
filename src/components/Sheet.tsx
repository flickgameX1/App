import { useEffect, useRef, type ReactNode } from 'react';

/** Bottom sheet. Everything that isn't one of the three tabs lives in one. */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panel.current?.querySelector<HTMLElement>('input, textarea, button:not([data-no-autofocus])')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
        data-no-autofocus
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-5 pt-3 pb-safe"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-5 font-display text-xl font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}
