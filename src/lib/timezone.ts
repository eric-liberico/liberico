const FALLBACK_TIME_ZONE = "Europe/Stockholm";

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function formatTimeZoneLabel(timeZone: string) {
  return timeZone.replace(/_/g, " ");
}

export function toDateInputInTimeZone(date: Date, timeZone: string) {
  return date.toLocaleDateString("sv-SE", { timeZone });
}

export function toTimeInputInTimeZone(date: Date, timeZone: string) {
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}

export function dateInputToUtcNoon(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addDaysToDateInput(dateValue: string, days: number) {
  const date = dateInputToUtcNoon(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

export function dateTimeInTimeZoneToDate(dateValue: string, timeValue: string, timeZone: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = new Date(targetUtc);

  for (let i = 0; i < 2; i += 1) {
    const offset = getTimeZoneOffsetMs(result, timeZone);
    result = new Date(targetUtc - offset);
  }

  return result;
}

export function minutesOfDayInTimeZone(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return Number(parts.hour) * 60 + Number(parts.minute);
}
