import { useEffect, useMemo, useState } from "react";
import { Bug, Clipboard, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  clearDevLogs,
  formatDevLogReport,
  getDevLogs,
  installDevLogger,
  subscribeDevLogs,
  type DevLogEntry,
} from "@/lib/devLogger";

function levelClass(level: DevLogEntry["level"]) {
  if (level === "error") return "border-red-300 bg-red-50 text-red-900";
  if (level === "warn") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-slate-300 bg-slate-50 text-slate-900";
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function DevLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<DevLogEntry[]>(() => getDevLogs());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    installDevLogger();
    return subscribeDevLogs(setLogs);
  }, []);

  const errorCount = useMemo(() => logs.filter((log) => log.level === "error").length, [logs]);

  if (!import.meta.env.DEV) return null;

  const copiar = async () => {
    try {
      await copyText(formatDevLogReport(logs));
      toast.success("Logs copiados");
    } catch {
      toast.error("No se pudieron copiar los logs.");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {!open ? (
        <Button
          type="button"
          size="sm"
          variant={errorCount > 0 ? "destructive" : "secondary"}
          className="h-10 gap-2 shadow-lg"
          onClick={() => setOpen(true)}
          title="Ver logs de desarrollo"
        >
          <Bug className="h-4 w-4" />
          <span>{logs.length}</span>
        </Button>
      ) : (
        <div className="w-[min(92vw,520px)] overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Logs de desarrollo</div>
              <div className="text-xs text-muted-foreground">
                {logs.length} entradas · {errorCount} errores
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={copiar}
                title="Copiar logs"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => clearDevLogs()}
                title="Limpiar logs"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto p-3">
            {logs.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Sin errores capturados.
              </div>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-md border p-3 ${levelClass(entry.level)}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                      <span className="font-semibold uppercase">{entry.level}</span>
                      <span className="shrink-0 opacity-80">
                        {new Date(entry.ts).toLocaleTimeString("es-ES")}
                      </span>
                    </div>
                    <div className="mb-1 text-xs opacity-80">{entry.source}</div>
                    <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
                      {entry.message}
                      {entry.details ? `\n\n${entry.details}` : ""}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
