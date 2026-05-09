export type DevLogLevel = "error" | "warn" | "info";

export type DevLogEntry = {
  id: string;
  ts: string;
  level: DevLogLevel;
  source: string;
  message: string;
  details?: string;
  url: string;
};

const STORAGE_KEY = "ib-lit-coach:dev-logs";
const MAX_ENTRIES = 200;
const MAX_FIELD_LENGTH = 8000;

const listeners = new Set<(entries: DevLogEntry[]) => void>();
let entriesCache: DevLogEntry[] = [];
let installed = false;
let notifyScheduled = false;
let originalConsole: Pick<Console, "error" | "warn"> | null = null;
let originalFetch: typeof fetch | null = null;

type DevLoggerWindow = Window & {
  __libericoDevLoggerFetch?: typeof fetch;
  __libericoDevLoggerConsole?: Pick<Console, "error" | "warn">;
  __libericoDevLoggerErrorHandler?: (event: ErrorEvent) => void;
  __libericoDevLoggerRejectionHandler?: (event: PromiseRejectionEvent) => void;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function truncate(value: string, max = MAX_FIELD_LENGTH) {
  return value.length > max
    ? `${value.slice(0, max)}\n...[truncated ${value.length - max} chars]`
    : value;
}

function serialize(value: unknown): string {
  if (value instanceof Error) {
    return truncate(`${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`);
  }

  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return String(value);
  }

  try {
    const seen = new WeakSet<object>();
    return truncate(
      JSON.stringify(
        value,
        (_key, nested) => {
          if (nested instanceof Error) {
            return { name: nested.name, message: nested.message, stack: nested.stack };
          }
          if (typeof nested === "object" && nested !== null) {
            if (seen.has(nested)) return "[Circular]";
            seen.add(nested);
          }
          return nested;
        },
        2,
      ),
    );
  } catch {
    return truncate(String(value));
  }
}

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method;
  if (typeof input !== "string" && !(input instanceof URL)) return input.method;
  return "GET";
}

async function summarizeResponse(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.clone().text();
    if (!text) return "[Respuesta sin cuerpo]";

    if (contentType.includes("application/json")) {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        return serialize({
          error: record.error,
          message: record.message,
          code: record.code,
          details: record.details,
        });
      }
    }

    return truncate(text, 1000);
  } catch {
    return "[No se pudo leer el cuerpo de respuesta]";
  }
}

function isExpectedStaleRefreshResponse(url: string, response: Response, responseSummary: string) {
  if (response.status !== 400) return false;

  try {
    const parsed = new URL(url, window.location.href);
    if (
      !parsed.pathname.endsWith("/auth/v1/token") ||
      parsed.searchParams.get("grant_type") !== "refresh_token"
    ) {
      return false;
    }
  } catch {
    if (!url.includes("/auth/v1/token") || !url.includes("grant_type=refresh_token")) {
      return false;
    }
  }

  return (
    responseSummary.includes("refresh_token_not_found") ||
    responseSummary.includes("Invalid Refresh Token")
  );
}

function isExpectedStaleRefreshConsoleError(values: unknown[]) {
  return values.some((value) => {
    if (value instanceof Error) {
      return (
        value.name === "AuthApiError" &&
        (value.message.includes("refresh_token_not_found") ||
          value.message.includes("Invalid Refresh Token") ||
          value.message.includes("Refresh Token Not Found"))
      );
    }

    if (typeof value === "string") {
      return value.includes("AuthApiError") && value.includes("Invalid Refresh Token");
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return (
        record.name === "AuthApiError" &&
        typeof record.message === "string" &&
        (record.message.includes("refresh_token_not_found") ||
          record.message.includes("Invalid Refresh Token") ||
          record.message.includes("Refresh Token Not Found"))
      );
    }

    return false;
  });
}

function loadEntries(): DevLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DevLogEntry[]).slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist(nextEntries: DevLogEntry[]) {
  entriesCache = nextEntries.slice(-MAX_ENTRIES);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesCache));
    } catch {
      // Best effort only: logging must never break the app.
    }
  }
  notifyListenersSoon();
}

function notifyListenersSoon() {
  if (!isBrowser() || notifyScheduled) return;
  notifyScheduled = true;
  window.setTimeout(() => {
    notifyScheduled = false;
    const snapshot = entriesCache;
    listeners.forEach((listener) => listener(snapshot));
  }, 0);
}

export function addDevLog(level: DevLogLevel, source: string, values: unknown[]) {
  if (!isBrowser() || !import.meta.env.DEV) return;

  const [first, ...rest] = values;
  const entry: DevLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ts: new Date().toISOString(),
    level,
    source,
    message: serialize(first ?? ""),
    details: rest.length ? rest.map(serialize).join("\n\n") : undefined,
    url: window.location.href,
  };

  persist([...entriesCache, entry]);
}

export function getDevLogs() {
  if (!entriesCache.length) entriesCache = loadEntries();
  return entriesCache;
}

export function clearDevLogs() {
  persist([]);
}

export function subscribeDevLogs(listener: (entries: DevLogEntry[]) => void) {
  listeners.add(listener);
  listener(getDevLogs());
  return () => {
    listeners.delete(listener);
  };
}

export function installDevLogger() {
  if (!isBrowser() || !import.meta.env.DEV || installed) return;
  installed = true;
  entriesCache = loadEntries();

  const win = window as DevLoggerWindow;

  if (!win.__libericoDevLoggerConsole) {
    win.__libericoDevLoggerConsole = {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
    };
  }
  originalConsole = win.__libericoDevLoggerConsole;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;

  console.error = (...args: unknown[]) => {
    if (isExpectedStaleRefreshConsoleError(args)) return;
    originalConsole?.error(...args);
    addDevLog("error", "console.error", args);
  };

  console.warn = (...args: unknown[]) => {
    originalConsole?.warn(...args);
    addDevLog("warn", "console.warn", args);
  };

  if (!win.__libericoDevLoggerFetch) {
    win.__libericoDevLoggerFetch = window.fetch.bind(window);
  }
  originalFetch = win.__libericoDevLoggerFetch;
  window.fetch = originalFetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getFetchUrl(input);
    const method = getFetchMethod(input, init);
    const started = performance.now();

    try {
      const response = await originalFetch!(input, init);
      if (!response.ok) {
        const responseSummary = await summarizeResponse(response);
        if (isExpectedStaleRefreshResponse(url, response, responseSummary)) return response;

        addDevLog("error", "fetch.response", [
          `${method} ${url} -> ${response.status} ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
            durationMs: Math.round(performance.now() - started),
            responseSummary,
          },
        ]);
      }
      return response;
    } catch (error) {
      addDevLog("error", "fetch.exception", [
        `${method} ${url} failed`,
        {
          durationMs: Math.round(performance.now() - started),
          error,
        },
      ]);
      throw error;
    }
  };

  if (win.__libericoDevLoggerErrorHandler) {
    window.removeEventListener("error", win.__libericoDevLoggerErrorHandler);
  }
  win.__libericoDevLoggerErrorHandler = (event) => {
    addDevLog("error", "window.error", [
      event.error instanceof Error ? event.error : event.message,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    ]);
  };
  window.addEventListener("error", win.__libericoDevLoggerErrorHandler);

  if (win.__libericoDevLoggerRejectionHandler) {
    window.removeEventListener("unhandledrejection", win.__libericoDevLoggerRejectionHandler);
  }
  win.__libericoDevLoggerRejectionHandler = (event) => {
    addDevLog("error", "unhandledrejection", [event.reason]);
  };
  window.addEventListener("unhandledrejection", win.__libericoDevLoggerRejectionHandler);
}

export function formatDevLogReport(logs = getDevLogs()) {
  const header = [
    "LIBerico Dev Logs",
    `Generated: ${new Date().toISOString()}`,
    isBrowser() ? `URL: ${window.location.href}` : "",
    isBrowser() ? `User agent: ${window.navigator.userAgent}` : "",
    `Entries: ${logs.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = logs
    .map((entry, index) => {
      const lines = [
        `#${index + 1} [${entry.level.toUpperCase()}] ${entry.ts}`,
        `Source: ${entry.source}`,
        `URL: ${entry.url}`,
        "Message:",
        entry.message,
      ];
      if (entry.details) lines.push("Details:", entry.details);
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  return `${header}\n\n${body || "No log entries."}`;
}
