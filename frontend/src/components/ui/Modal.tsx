'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  className,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Heavy Blurred Dark Backdrop covering full screen including sidebar and top header */}
      <div
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md transition-all duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Alignment Container */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 py-6 sm:py-10">
        <div
          className={cn(
            'relative w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-modal text-zinc-900 dark:text-zinc-100 transition-all duration-200 z-10 my-auto overflow-hidden flex flex-col animate-modal-pop',
            maxWidthClasses[maxWidth],
            className
          )}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 sm:px-6 py-3.5 sm:py-4 bg-white dark:bg-zinc-900 shrink-0">
              <div className="space-y-0.5 min-w-0 pr-4">
                {typeof title === 'string' ? (
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                    {title}
                  </h3>
                ) : (
                  <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {title}
                  </div>
                )}
                {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar flex-1">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
