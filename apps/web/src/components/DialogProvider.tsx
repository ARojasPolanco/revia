'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message?: string;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface PromptOptions {
  title: string;
  message?: string;
  icon?: ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  inputType?: 'text' | 'number' | 'password';
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface AlertOptions {
  title: string;
  message: string;
  icon?: ReactNode;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions) => Promise<void>;
}

type DialogState =
  | {
      kind: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: 'prompt';
      options: PromptOptions;
      resolve: (value: string | null) => void;
    }
  | {
      kind: 'alert';
      options: AlertOptions;
      resolve: () => void;
    };

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ kind: 'confirm', options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue ?? '');
      setDialog({ kind: 'prompt', options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({ kind: 'alert', options, resolve });
    });
  }, []);

  const close = useCallback(() => {
    if (!dialog) {
      return;
    }

    if (dialog.kind === 'confirm') {
      dialog.resolve(false);
    } else if (dialog.kind === 'prompt') {
      dialog.resolve(null);
    } else {
      dialog.resolve();
    }

    setDialog(null);
  }, [dialog]);

  const value = useMemo(() => ({ confirm, prompt, alert }), [confirm, prompt, alert]);

  const title = dialog?.options.title ?? '';
  const message =
    dialog?.kind === 'confirm' || dialog?.kind === 'alert'
      ? dialog.options.message
      : dialog?.options.message;
  const tone =
    dialog?.kind === 'confirm' || dialog?.kind === 'alert' ? dialog.options.tone : undefined;
  const confirmLabel =
    dialog?.kind === 'confirm'
      ? (dialog.options.confirmLabel ?? 'Confirmar')
      : dialog?.kind === 'prompt'
        ? (dialog.options.confirmLabel ?? 'Aceptar')
        : (dialog?.options.confirmLabel ?? 'Entendido');
  const cancelLabel =
    dialog?.kind === 'confirm'
      ? (dialog.options.cancelLabel ?? 'Cancelar')
      : dialog?.kind === 'prompt'
        ? (dialog.options.cancelLabel ?? 'Cancelar')
        : null;
  const icon =
    dialog?.options.icon ??
    (tone === 'danger' ? (
      <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
    ) : (
      <Info className="h-5 w-5" strokeWidth={1.75} />
    ));

  return (
    <DialogContext.Provider value={value}>
      {children}

      <Modal
        description={message}
        icon={icon}
        footer={
          <>
            {cancelLabel ? (
              <button
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 sm:w-auto"
                type="button"
                onClick={close}
              >
                {cancelLabel}
              </button>
            ) : null}
            <button
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white sm:w-auto ${
                tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-700 hover:bg-teal-800'
              }`}
              type="button"
              onClick={() => {
                if (!dialog) {
                  return;
                }

                if (dialog.kind === 'confirm') {
                  dialog.resolve(true);
                  setDialog(null);
                } else if (dialog.kind === 'prompt') {
                  dialog.resolve(promptValue);
                  setDialog(null);
                } else {
                  dialog.resolve();
                  setDialog(null);
                }
              }}
            >
              {confirmLabel}
            </button>
          </>
        }
        onClose={close}
        open={dialog !== null}
        size={dialog?.kind === 'prompt' ? 'md' : 'sm'}
        title={title}
        tone={tone}
      >
        {dialog?.kind === 'prompt' ? (
          <div className="flex flex-col gap-2">
            {dialog.options.label ? (
              <label className="text-sm font-semibold text-neutral-700" htmlFor="dialog-input">
                {dialog.options.label}
              </label>
            ) : null}
            {dialog.options.multiline ? (
              <textarea
                autoFocus
                className="min-h-28 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                id="dialog-input"
                placeholder={dialog.options.placeholder}
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
              />
            ) : (
              <input
                autoFocus
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                id="dialog-input"
                inputMode={dialog.options.inputType === 'number' ? 'numeric' : 'text'}
                placeholder={dialog.options.placeholder}
                type={dialog.options.inputType ?? 'text'}
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && dialog.options.inputType !== 'number') {
                    dialog.resolve(promptValue);
                    setDialog(null);
                  }
                }}
              />
            )}
          </div>
        ) : null}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error('useDialog debe usarse dentro de DialogProvider');
  }

  return context;
}
