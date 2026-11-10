import { formatDateTime, orderEventLabel, type OrderEvent } from '@/lib/orders';

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-900">Historial de la orden</h2>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Todavía no hay movimientos.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {events.map((event) => (
            <li className="flex gap-3" key={event.id}>
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-teal-600" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  {orderEventLabel(event.type)}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {formatDateTime(event.createdAt)}
                  {event.actor ? ` · ${event.actor.fullName}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
