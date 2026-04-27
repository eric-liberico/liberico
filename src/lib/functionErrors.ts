type ErrorWithContext = Error & { context?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textFromValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Error && value.message.trim()) return value.message;
  if (isRecord(value)) {
    const nested = value.error ?? value.message ?? value.msg;
    return textFromValue(nested);
  }
  return null;
}

function isLikelyInterruptedRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to send a request") ||
    normalized.includes("load failed") ||
    normalized.includes("fetch") ||
    normalized.includes("network") ||
    normalized.includes("timeout")
  );
}

export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as Partial<ErrorWithContext>;
  const context = err.context;

  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      const body = (await context.clone().json()) as unknown;
      const fromBody = textFromValue(body);
      if (fromBody) return fromBody;
    } catch {
      // Keep the fallback path for non-JSON function responses.
    }
  }

  const contextMessage = textFromValue(context);
  const errorMessage = textFromValue(error);
  const message = contextMessage ?? errorMessage;

  if (message && isLikelyInterruptedRequest(message)) {
    return "La corrección tardó demasiado o se interrumpió la conexión con la función. Prueba otra vez; si se repite, exporta los logs de desarrollo.";
  }

  return message ?? fallback;
}
