'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'danger';
}

const widths = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  tone = 'default',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-[80] bg-neutral-950/50 backdrop-blur-sm" />
        <Dialog.Content
          className={`dialog-content fixed inset-x-0 bottom-0 z-[81] flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl`}
        >
          <header className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            {icon ? (
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'
                }`}
              >
                {icon}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-bold tracking-tight text-neutral-900">
                {title}
              </Dialog.Title>
              <Dialog.Description
                className={
                  description
                    ? 'mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-600'
                    : 'sr-only'
                }
              >
                {description ?? 'Diálogo de REVIA'}
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                aria-label="Cerrar"
                className="-mr-1 -mt-1 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                type="button"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </Dialog.Close>
          </header>

          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
          ) : null}

          {footer ? (
            <footer className="grid gap-2 px-5 pb-5 pt-4 sm:flex sm:justify-end sm:px-6 sm:pb-6">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
