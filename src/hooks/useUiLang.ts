import { useCallback, useSyncExternalStore } from "react";
import { COURSES, parseUiLang, type CourseKey, type UiLang } from "@/lib/ib-courses";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_PREFIX = "liberico.uiLang.";

function storageKey(courseKey: CourseKey): string {
  return `${STORAGE_PREFIX}${courseKey}`;
}

function readOverride(courseKey: CourseKey): UiLang | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(courseKey));
    if (!raw) return null;
    const parsed = parseUiLang(raw);
    const supported = COURSES[courseKey].supportedUiLangs;
    return supported.includes(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function resolveLang(courseKey: CourseKey, override: UiLang | null): UiLang {
  if (override) return override;
  return COURSES[courseKey].defaultUiLang;
}

// Pequeño event-bus para sincronizar todos los componentes que leen el idioma
// de UI en la misma pestaña. localStorage `storage` events solo se disparan
// para OTRAS pestañas, así que necesitamos notificar manualmente al cambiar
// la preferencia desde dentro de la app.
const subscribers = new Set<() => void>();
function emit() {
  for (const fn of subscribers) fn();
}
function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", fn);
  }
  return () => {
    subscribers.delete(fn);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", fn);
    }
  };
}

function useOverride(courseKey: CourseKey): UiLang | null {
  return useSyncExternalStore(
    subscribe,
    () => readOverride(courseKey),
    () => null,
  );
}

/**
 * Devuelve el idioma de UI activo para el curso actual.
 * - Por defecto: `COURSES[courseKey].defaultUiLang`.
 * - El alumno puede sobrescribirlo (persistido en localStorage) si el curso
 *   declara más de un idioma soportado en `supportedUiLangs`.
 */
export function useUiLang(): UiLang {
  const { courseKey } = useAuth();
  const override = useOverride(courseKey);
  return resolveLang(courseKey, override);
}

/**
 * Devuelve `(lang, setLang)`. `setLang` solo persiste si el curso permite
 * múltiples idiomas (`supportedUiLangs.length > 1`); en caso contrario es no-op.
 * Cualquier consumidor de `useUiLang()` se re-renderiza tras `setLang`.
 */
export function useUiLangControl(): {
  lang: UiLang;
  supported: readonly UiLang[];
  canSwitch: boolean;
  setLang: (lang: UiLang) => void;
} {
  const { courseKey } = useAuth();
  const override = useOverride(courseKey);
  const supported = COURSES[courseKey].supportedUiLangs;
  const canSwitch = supported.length > 1;
  const lang = resolveLang(courseKey, override);

  const setLang = useCallback(
    (next: UiLang) => {
      if (!canSwitch) return;
      if (!supported.includes(next)) return;
      try {
        window.localStorage.setItem(storageKey(courseKey), next);
      } catch {
        /* noop */
      }
      emit();
    },
    [courseKey, canSwitch, supported],
  );

  return { lang, supported, canSwitch, setLang };
}
