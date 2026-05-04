import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { JuegoEsperaEvaluacion } from "@/components/JuegoEsperaEvaluacion";
import { BotónDictado } from "@/components/BotónDictado";
import { useDictado } from "@/hooks/useDictado";
import type { RevisionApuntesOral, TipoOral } from "@/lib/ib-oral";
import type { Nivel } from "@/components/SelectorNivel";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Badge helpers ─────────────────────────────────────────────────────────
const COBERTURA_LABEL_ES: Record<string, string> = { bien: "Cubierto", parcial: "Parcial", ausente: "Ausente" };
const COBERTURA_LABEL_EN: Record<string, string> = { bien: "Covered", parcial: "Partial", ausente: "Absent" };

const COBERTURA_CLS: Record<string, string> = {
  bien: "text-emerald-700",
  parcial: "text-amber-700",
  ausente: "text-rose-700",
};

const CRITERIO_CLS: Record<string, string> = {
  A: "bg-violet-100 text-violet-800",
  B: "bg-amber-100 text-amber-800",
  C: "bg-blue-100 text-blue-800",
  D: "bg-emerald-100 text-emerald-800",
};

// ── Collapsible section ────────────────────────────────────────────────────

function Seccion({
  titulo,
  children,
  defaultOpen = true,
}: {
  titulo: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0 pb-4 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-2 text-left"
      >
        <span className="text-[11px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
          {titulo}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

type Props = {
  nivel: Nivel;
  tipoOral: TipoOral;
  asuntoGlobal: string;
  obra1Titulo: string;
  obra1Autor: string;
  obra1Tipo: string;
  extracto1: string;
  obra2Titulo: string;
  obra2Autor: string;
  obra2Tipo: string;
  extracto2: string;
  disabled?: boolean;
};

export function PanelApuntesOral({
  nivel,
  tipoOral,
  asuntoGlobal,
  obra1Titulo,
  obra1Autor,
  obra1Tipo,
  extracto1,
  obra2Titulo,
  obra2Autor,
  obra2Tipo,
  extracto2,
  disabled = false,
}: Props) {
  const { courseKey } = useAuth();
  const isEN = courseKey === "english-a-literature";

  const NIVEL_PREPARACION_LABEL: Record<string, { label: string; cls: string }> = {
    alto: { label: isEN ? "High preparation" : "Preparación alta", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    medio: { label: isEN ? "Medium preparation" : "Preparación media", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    bajo: { label: isEN ? "Low preparation" : "Preparación baja", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  };
  const FORMATO_LABEL: Record<string, { label: string; cls: string }> = {
    bien: { label: isEN ? "Correct format" : "Formato correcto", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    demasiado_extenso: { label: isEN ? "Too extensive" : "Demasiado extenso", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    demasiado_vago: { label: isEN ? "Too vague" : "Demasiado vago", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    parece_guion: { label: isEN ? "Looks like a script to memorise" : "Parece guion memorizable", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  };
  const COBERTURA_LABEL = isEN ? COBERTURA_LABEL_EN : COBERTURA_LABEL_ES;

  const [apuntes, setApuntes] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState<RevisionApuntesOral | null>(null);

  const { dictando, interimTexto, toggleDictado } = useDictado((t) =>
    setApuntes((prev) => prev + (prev.trim() ? "\n" : "") + t.trim()),
  );

  const revisar = async () => {
    if (!apuntes.trim() || apuntes.trim().length < 20) {
      toast.error(isEN ? "Write some notes before reviewing." : "Escribe al menos unos apuntes antes de revisar.");
      return;
    }
    if (!asuntoGlobal.trim()) {
      toast.error(isEN ? "Complete the global issue before reviewing the notes." : "Completa el asunto global antes de revisar los apuntes.");
      return;
    }
    setLoading(true);
    setRevision(null);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-oral-notes", {
        body: {
          nivel,
          tipo_oral: tipoOral,
          asunto_global: asuntoGlobal,
          obra_1_titulo: obra1Titulo,
          obra_1_autor: obra1Autor || undefined,
          obra_1_tipo: obra1Tipo || undefined,
          extracto_1: extracto1 || undefined,
          obra_2_titulo: obra2Titulo,
          obra_2_autor: obra2Autor || undefined,
          obra_2_tipo: obra2Tipo || undefined,
          extracto_2: extracto2 || undefined,
          apuntes_oral: apuntes,
          course_key: courseKey,
        },
      });
      if (error) {
        const msg = await getFunctionErrorMessage(error, isEN ? "Error reviewing notes." : "Error al revisar los apuntes.");
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error as string);
      setRevision(data as RevisionApuntesOral);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isEN ? "Error reviewing notes." : "Error al revisar los apuntes."));
    } finally {
      setLoading(false);
    }
  };

  const nivelInfo = revision
    ? NIVEL_PREPARACION_LABEL[revision.evaluacion_global.nivel_preparacion]
    : null;
  const formatoInfo = revision ? FORMATO_LABEL[revision.cumple_formato.estado] : null;

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isEN ? "Your oral notes" : "Tus apuntes del oral"}
          </Label>
          <BotónDictado
            dictando={dictando}
            onToggle={toggleDictado}
            disabled={disabled || loading}
            isEN={isEN}
          />
        </div>
        <p className="text-xs text-muted-foreground/70">
          {isEN
            ? "Paste or write your preparation notes: bullets, references, outline. Not the full script."
            : "Pega o escribe tus apuntes de preparación: bullets, referencias, esquema. No el guion completo."}
        </p>
        <Textarea
          value={apuntes}
          onChange={(e) => setApuntes(e.target.value)}
          placeholder={isEN
            ? `• Global issue: [how it appears in extract 1]\n• Key resource Work 1 → effect\n• Transition: contrast with Work 2\n• Key resource Work 2 → different effect`
            : `• Asunto global: [cómo aparece en el extracto 1]\n• Recurso clave obra 1 → efecto\n• Transición: contraste con obra 2\n• Recurso clave obra 2 → efecto diferente`}
          rows={10}
          disabled={disabled || loading}
          className="resize-y text-sm font-mono leading-relaxed"
          maxLength={15000}
        />
        {dictando && interimTexto && (
          <p className="text-[11px] text-muted-foreground italic px-1">{interimTexto}…</p>
        )}
        {(() => {
          const palabras = apuntes.trim().split(/\s+/).filter(Boolean).length;
          const sobrePasado = palabras > 300;
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] ${sobrePasado ? "text-rose-600 font-medium" : "text-muted-foreground"}`}
                >
                  {palabras}/300 {isEN ? "words" : "palabras"}
                </span>
                <Button
                  onClick={revisar}
                  disabled={disabled || loading || !apuntes.trim() || sobrePasado}
                  size="sm"
                  className="gap-1.5"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {isEN ? "Review notes" : "Revisar apuntes"}
                </Button>
              </div>
              {sobrePasado && (
                <p className="text-[11px] text-rose-600">
                  {isEN
                    ? "Maximum 300 words. Notes should be a concise outline, not a script. Trim before sending."
                    : "Máximo 300 palabras. Los apuntes deben ser un esquema conciso, no un guion. Recorta antes de enviar."}
                </p>
              )}
              {!sobrePasado && palabras > 240 && (
                <p className="text-[11px] text-amber-700">
                  {isEN
                    ? "Close to limit. A good outline usually fits in 150-250 words."
                    : "Cerca del límite. Un buen esquema suele caber en 150-250 palabras."}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Loading */}
      {loading && <JuegoEsperaEvaluacion modo="oral" />}

      {/* Result */}
      {revision && !loading && (
        <Card className="p-5 sm:p-6 space-y-5 border-primary/20">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            {nivelInfo && (
              <span
                className={cn("text-[11px] px-2 py-0.5 rounded border font-medium", nivelInfo.cls)}
              >
                {nivelInfo.label}
              </span>
            )}
            {formatoInfo && (
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded border font-medium",
                  formatoInfo.cls,
                )}
              >
                {formatoInfo.label}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {revision.evaluacion_global.resumen}
          </p>

          <Seccion
            titulo={
              isEN ? "Format and global issue" : "Formato y asunto global"
            }
          >
            <p className="text-sm text-foreground/80">{revision.cumple_formato.comentario}</p>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isEN ? "Global issue" : "Asunto global"} —{" "}
                {revision.diagnostico_asunto_global.estado === "presente"
                  ? (isEN ? "present" : "presente")
                  : revision.diagnostico_asunto_global.estado === "parcial"
                    ? (isEN ? "partial" : "parcial")
                    : (isEN ? "absent" : "ausente")}
              </span>
              <p className="text-sm text-foreground/80">
                {revision.diagnostico_asunto_global.comentario}
              </p>
              {revision.diagnostico_asunto_global.mejora && (
                <p className="text-xs text-primary/80 mt-1">
                  → {revision.diagnostico_asunto_global.mejora}
                </p>
              )}
            </div>
          </Seccion>

          <Seccion titulo={isEN ? "Coverage" : "Cobertura"}>
            <div className="grid sm:grid-cols-2 gap-3">
              {revision.cobertura.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.titulo || item.id}
                    </span>
                    <span className={cn("text-[10px] font-medium", COBERTURA_CLS[item.estado])}>
                      · {COBERTURA_LABEL[item.estado]}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80">{item.comentario}</p>
                  {item.mejora && <p className="text-xs text-primary/80">→ {item.mejora}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-0.5 pt-1">
              <p className="text-sm text-foreground/80">{revision.equilibrio.comentario}</p>
              {revision.equilibrio.mejora && (
                <p className="text-xs text-primary/80">→ {revision.equilibrio.mejora}</p>
              )}
            </div>
          </Seccion>

          <Seccion titulo={isEN ? "Formal analysis" : "Análisis formal"}>
            <p className="text-sm text-foreground/80">{revision.analisis_formal.comentario}</p>
            {revision.analisis_formal.mejora && (
              <p className="text-xs text-primary/80">→ {revision.analisis_formal.mejora}</p>
            )}
          </Seccion>

          {revision.riesgos.length > 0 && (
            <Seccion titulo={isEN ? "Risks detected" : "Riesgos detectados"}>
              <div className="space-y-3">
                {revision.riesgos.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2.5 space-y-1 dark:border-rose-800 dark:bg-rose-950/20"
                  >
                    <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
                      {r.problema}
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-400">→ {r.solucion}</p>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          <Seccion titulo={isEN ? "Bullet improvements" : "Mejoras bullet a bullet"}>
            <p className="text-[11px] text-muted-foreground/70 -mt-1">
              {isEN
                ? "Improvements maintain bullet format. They are not phrases to memorise."
                : "Las mejoras mantienen el formato de bullet. No son frases para recitar."}
            </p>
            <div className="space-y-3">
              {revision.mejoras_bullet_a_bullet.map((m, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5",
                        CRITERIO_CLS[m.criterio_relacionado],
                      )}
                    >
                      {m.criterio_relacionado}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs text-muted-foreground line-through">
                        {m.fragmento_original}
                      </p>
                      <p className="text-[11px] text-rose-700">{m.problema}</p>
                      <p className="text-xs text-emerald-700 font-medium">
                        → {m.propuesta_bullet_mejorado}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion
            titulo={isEN ? "Probable teacher questions" : "Preguntas probables del profesor"}
            defaultOpen={tipoOral === "taught"}
          >
            <div className="space-y-3">
              {revision.preguntas_probables.map((p, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm font-medium text-foreground/90">{p.pregunta}</p>
                  <p className="text-xs text-muted-foreground">{p.por_que_te_la_harian}</p>
                  <p className="text-xs text-primary/80">→ {p.como_prepararla}</p>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion titulo={isEN ? "Three priorities before the oral" : "Tres prioridades antes del oral"}>
            <ol className="space-y-2">
              {revision.prioridades.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground/85 leading-relaxed">{p}</p>
                </li>
              ))}
            </ol>
          </Seccion>
        </Card>
      )}
    </div>
  );
}
