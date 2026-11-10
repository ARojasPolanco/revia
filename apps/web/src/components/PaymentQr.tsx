'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function PaymentQr({ value }: { value: string | null }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setSrc(null);
      return;
    }

    QRCode.toDataURL(value, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-teal-200 bg-white p-3">
      <img src={src} alt="Código QR para transferir" className="h-40 w-40" />
      <p className="text-center text-[11px] text-neutral-500">
        Escaneá desde tu banco o billetera.
      </p>
    </div>
  );
}
