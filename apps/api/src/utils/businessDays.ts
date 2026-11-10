const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

function toArtWallClock(date: Date): Date {
  return new Date(date.getTime() + ART_OFFSET_MS);
}

function fromArtWallClock(date: Date): Date {
  return new Date(date.getTime() - ART_OFFSET_MS);
}

export function addBusinessDays(start: Date, days: number): Date {
  const local = toArtWallClock(start);
  let remaining = Math.max(0, Math.trunc(days));

  while (remaining > 0) {
    local.setUTCDate(local.getUTCDate() + 1);
    const weekday = local.getUTCDay();

    if (weekday !== 0 && weekday !== 6) {
      remaining -= 1;
    }
  }

  return fromArtWallClock(local);
}
