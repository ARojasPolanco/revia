'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { ChatMessage, Conversation } from '@/lib/chat';

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ChatContent() {
  const params = useParams<{ id: string }>();
  const conversationId = typeof params.id === 'string' ? params.id : '';
  const { user } = useAuth();
  const { confirm, prompt } = useDialog();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    try {
      const data = await apiFetch<{ messages: ChatMessage[] }>(
        `/conversations/${conversationId}/messages`
      );
      setMessages(data.messages);
      await apiFetch(`/conversations/${conversationId}/read`, { method: 'POST' }).catch(
        () => undefined
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar los mensajes');
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    apiFetch<{ conversation: Conversation }>(`/conversations/${conversationId}`)
      .then((data) => setConversation(data.conversation))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No encontramos esta conversación.')
      )
      .finally(() => setLoading(false));

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    setSending(true);
    setError(null);
    setWarning(null);

    try {
      const data = await apiFetch<{ message: ChatMessage; warning: string | null }>(
        `/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        }
      );
      setMessages((current) => [...current, data.message]);
      setWarning(data.warning);
      setBody('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  async function blockUser() {
    if (!conversation?.otherUser) {
      return;
    }

    const confirmed = await confirm({
      title: 'Bloquear usuario',
      message:
        'Vas a bloquear a este usuario. No podrán enviarse mensajes entre ustedes. Podés desbloquearlo desde tu perfil.',
      confirmLabel: 'Bloquear',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/users/${conversation.otherUser.id}/block`, { method: 'POST' });
      setActionMessage('Usuario bloqueado.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo bloquear');
    }
  }

  async function reportUser() {
    if (!conversation?.otherUser) {
      return;
    }

    const reason = await prompt({
      title: 'Denunciar usuario',
      message:
        'Contanos qué pasó. La denuncia se revisa por separado y no bloquea automáticamente al usuario.',
      label: 'Motivo de la denuncia',
      multiline: true,
      confirmLabel: 'Enviar denuncia',
    });

    if (!reason?.trim()) {
      return;
    }

    try {
      const data = await apiFetch<{ message?: string }>(
        `/users/${conversation.otherUser.id}/report`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      setActionMessage(data.message ?? 'Recibimos tu denuncia.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la denuncia');
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando chat…</p>
      </main>
    );
  }

  if (error && !conversation) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos esta conversación
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/chat">
          Volver a chats
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-xs font-semibold text-teal-700" href="/chat">
            Volver a chats
          </Link>
          <h1 className="text-xl font-black tracking-tight text-neutral-900">
            {conversation?.otherUser?.fullName ?? 'Chat'}
          </h1>
          {conversation ? (
            <Link
              className="text-xs text-neutral-500 underline-offset-2 hover:underline"
              href={`/publicaciones/${conversation.listingId}`}
            >
              {conversation.listingTitle}
            </Link>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
            type="button"
            onClick={blockUser}
          >
            Bloquear
          </button>
          <button
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
            type="button"
            onClick={reportUser}
          >
            Denunciar
          </button>
        </div>
      </header>

      {actionMessage ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
          {actionMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="flex max-h-[60vh] min-h-[320px] flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay mensajes. Coordiná la entrega por acá.
          </p>
        ) : null}

        {messages.map((message) => {
          const mine = message.senderId === user?.id;

          return (
            <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`} key={message.id}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-teal-700 text-white' : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                <p className="whitespace-pre-line">{message.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-teal-100' : 'text-neutral-400'}`}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
              {message.flaggedContact ? (
                <p className="mt-1 max-w-[85%] text-[11px] text-amber-700">
                  Aviso: este mensaje contiene datos de contacto (
                  {message.flaggedReasons.join(', ')}).
                </p>
              ) : null}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </section>

      {warning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {warning}
        </p>
      ) : null}

      <form className="flex gap-2" onSubmit={sendMessage}>
        <input
          className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          placeholder="Escribí un mensaje…"
        />
        <button
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={sending || !body.trim()}
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </main>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}
