'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Conversation } from '@/lib/chat';

function ChatListContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>('/conversations')
      .then((data) => setConversations(data.conversations))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar los chats')
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Chat</h1>
          <p className="text-sm text-neutral-600">Coordiná la entrega dentro de REVIA.</p>
        </div>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Inicio
        </Link>
      </header>

      {loading ? <p className="text-sm text-neutral-500">Cargando chats…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && conversations.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no tenés conversaciones. Entrá a una publicación y tocá “Contactar vendedor”.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {conversations.map((conversation) => (
          <Link
            className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={conversation.id}
            href={`/chat/${conversation.id}`}
          >
            {conversation.listingPhoto ? (
              <img
                src={conversation.listingPhoto}
                alt={conversation.listingTitle}
                className="h-14 w-14 rounded-xl border border-neutral-200 object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 text-xs text-neutral-400">
                Sin foto
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-neutral-900">
                  {conversation.otherUser?.fullName ?? 'Usuario'}
                </p>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-neutral-500">{conversation.listingTitle}</p>
              <p className="truncate text-xs text-neutral-400">
                {conversation.lastMessage ?? 'Sin mensajes todavía'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function ChatListPage() {
  return (
    <ProtectedRoute>
      <ChatListContent />
    </ProtectedRoute>
  );
}
