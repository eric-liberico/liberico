import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, Lock, Unlock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — IB Literatura" },
      { name: "description", content: "Textos canónicos para practicar la Prueba 1." },
    ],
  }),
  component: BibliotecaPage,
});

type Texto = {
  id: string;
  titulo: string;
  autor: string;
  epoca: string;
  movimiento: string;
  forma_literaria: "prosa_ficcional" | "prosa_no_ficcional" | "poesia" | "teatro";
  fragmento: string;
  pregunta_orientacion: string;
  orden: number;
};

const FORMA_LABEL: Record<Texto["forma_literaria"], string> = {
  prosa_ficcional: "Prosa ficcional",
  prosa_no_ficcional: "Prosa no ficcional",
  poesia: "Poesía",
  teatro: "Teatro",
};

const FORMA_COLOR: Record<Texto["forma_literaria"], string> = {
  prosa_ficcional: "bg-blue-500/15 text-blue-700 border-blue-300",
  prosa_no_ficcional: "bg-amber-500/15 text-amber-700 border-amber-300",
  poesia: "bg-violet-500/15 text-violet-700 border-violet-300",
  teatro: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
};

const FORMAS: Texto["forma_literaria"][] = [
  "prosa_ficcional",
  "prosa_no_ficcional",
  "poesia",
  "teatro",
];

function BibliotecaPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [textos, setTextos] = useState<Texto[]>([]);
  const [vistosIds, setVistosIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Texto | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: textosData, error: textosErr }, { data: vistosData }] = await Promise.all([
      supabase
        .from("textos_biblioteca")
        .select(
          "id,titulo,autor,epoca,movimiento,forma_literaria,fragmento,pregunta_orientacion,orden",
        )
        .order("orden", { ascending: true }),
      supabase.from("textos_vistos").select("texto_id").eq("user_id", user.id),
    ]);

    if (textosErr) {
      toast.error("Error al cargar la biblioteca.");
    } else {
      setTextos((textosData ?? []) as unknown as Texto[]);
    }

    setVistosIds(new Set((vistosData ?? []).map((v) => v.texto_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const textosPorForma = useMemo(() => {
    const map = new Map<Texto["forma_literaria"], Texto[]>();
    for (const f of FORMAS) map.set(f, []);
    for (const t of textos) {
      map.get(t.forma_literaria)?.push(t);
    }
    return map;
  }, [textos]);

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando biblioteca…
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <TextoDetalle
        texto={selected}
        desbloqueado={vistosIds.has(selected.id)}
        onVolver={() => setSelected(null)}
        onAnalizar={() => navigate({ to: "/", search: { texto_id: selected.id } })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Biblioteca
          </div>
          <h1 className="font-serif text-3xl text-ink">Textos literarios</h1>
          <p className="text-foreground/70 mt-2 max-w-2xl">
            Practica la Prueba 1 con textos canónicos. Analiza un texto en el corrector y desbloquea
            el marco de análisis para comparar tu lectura.
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Unlock className="h-3.5 w-3.5 text-emerald-600" />
              {vistosIds.size} analizado{vistosIds.size !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              {textos.length - vistosIds.size} pendiente
              {textos.length - vistosIds.size !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Tabs defaultValue="prosa_ficcional">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {FORMAS.map((f) => (
              <TabsTrigger key={f} value={f} className="text-xs">
                {FORMA_LABEL[f]}
                <span className="ml-1.5 tabular-nums text-muted-foreground">
                  ({textosPorForma.get(f)?.filter((t) => vistosIds.has(t.id)).length ?? 0}/
                  {textosPorForma.get(f)?.length ?? 0})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {FORMAS.map((forma) => (
            <TabsContent key={forma} value={forma}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(textosPorForma.get(forma) ?? []).map((t) => {
                  const visto = vistosIds.has(t.id);
                  return (
                    <button key={t.id} onClick={() => setSelected(t)} className="text-left group">
                      <Card
                        className={cn(
                          "p-5 h-full flex flex-col gap-3 transition-colors",
                          "hover:border-primary/40 hover:bg-accent/20",
                          visto && "border-emerald-300/60 bg-emerald-50/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                              FORMA_COLOR[t.forma_literaria],
                            )}
                          >
                            {FORMA_LABEL[t.forma_literaria]}
                          </span>
                          {visto ? (
                            <Unlock className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="font-serif text-base text-ink leading-snug">
                            {t.titulo}
                          </div>
                          <div className="text-sm text-foreground/70 mt-1">{t.autor}</div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {t.movimiento}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {t.epoca}
                          </Badge>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function TextoDetalle({
  texto,
  desbloqueado,
  onVolver,
  onAnalizar,
}: {
  texto: Texto;
  desbloqueado: boolean;
  onVolver: () => void;
  onAnalizar: () => void;
}) {
  const [marcoAbierto, setMarcoAbierto] = useState(false);
  const [marco, setMarco] = useState<string | null>(null);
  const [marcoLoading, setMarcoLoading] = useState(false);

  const abrirMarco = async () => {
    if (!desbloqueado) return;
    if (marcoAbierto) {
      setMarcoAbierto(false);
      return;
    }
    setMarcoAbierto(true);
    if (marco !== null) return;
    setMarcoLoading(true);
    const { data, error } = await supabase
      .from("textos_biblioteca")
      .select("marco_analisis")
      .eq("id", texto.id)
      .single();
    if (error || !data) {
      toast.error("No se pudo cargar el marco de análisis.");
    } else {
      setMarco(data.marco_analisis as string);
    }
    setMarcoLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <Button variant="ghost" size="sm" onClick={onVolver} className="mb-6">
          <ChevronLeft className="h-4 w-4" />
          Volver a la biblioteca
        </Button>

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
                FORMA_COLOR[texto.forma_literaria],
              )}
            >
              {FORMA_LABEL[texto.forma_literaria]}
            </span>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {texto.movimiento}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-normal">
              {texto.epoca}
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">{texto.titulo}</h1>
          <p className="text-foreground/70 mt-1">{texto.autor}</p>
        </div>

        {/* Fragmento */}
        <Card className="p-6 mb-6 bg-parchment/40 border-border">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Fragmento
          </div>
          <p className="font-serif text-[15px] leading-relaxed text-ink whitespace-pre-line">
            {texto.fragmento}
          </p>
        </Card>

        {/* Pregunta */}
        <Card className="p-5 mb-6 border-primary/20 bg-primary/5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Pregunta de orientación
          </div>
          <p className="font-serif text-base text-ink">{texto.pregunta_orientacion}</p>
        </Card>

        {/* Acción */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <Button onClick={onAnalizar} size="lg">
            Analizar este texto en el corrector
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!desbloqueado && (
            <p className="text-xs text-muted-foreground">
              Envía tu análisis para desbloquear el marco.
            </p>
          )}
        </div>

        {/* Marco de análisis */}
        <div
          className={cn(
            "border border-border rounded-lg overflow-hidden",
            !desbloqueado && "opacity-60",
          )}
        >
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
            onClick={abrirMarco}
            disabled={!desbloqueado}
          >
            <div className="flex items-center gap-2">
              {desbloqueado ? (
                <Unlock className="h-4 w-4 text-emerald-600" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-ink">
                {desbloqueado ? "Marco de análisis" : "Marco de análisis (bloqueado)"}
              </span>
            </div>
            {desbloqueado && (
              <span className="text-xs text-muted-foreground">
                {marcoAbierto ? "Cerrar" : "Ver"}
              </span>
            )}
          </button>

          {desbloqueado && marcoAbierto && (
            <div className="px-5 pb-5 pt-2 border-t border-border">
              {marcoLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              ) : (
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                  {marco}
                </p>
              )}
            </div>
          )}

          {!desbloqueado && (
            <div className="px-5 pb-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Analiza este texto en el corrector para desbloquear el marco.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
