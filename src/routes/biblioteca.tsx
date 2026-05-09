import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Library, Lock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// TODO: reemplazar localStorage por tabla de entitlements cuando se integre Stripe.
// La clave es `liberico_bib_${user.id}` para que el desbloqueo sea por usuario.
const STORAGE_KEY = (userId: string) => `liberico_bib_${userId}`;

type TextoPractica = {
  id: string;
  genero: "poema" | "prosa" | "teatro";
  periodo: string | null;
  texto: string;
  pregunta: string;
  activo: boolean;
  created_at: string;
};

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "LIBerico — Practice texts library" },
      {
        name: "description",
        content: "Practice texts for IB English A Literature Paper 1.",
      },
    ],
  }),
  component: BibliotecaPage,
});

function TextoCard({
  texto,
  desbloqueado,
  onPracticar,
  onDesbloquear,
  isEN,
}: {
  texto: TextoPractica;
  desbloqueado: boolean;
  onPracticar: () => void;
  onDesbloquear: () => void;
  isEN: boolean;
}) {
  const preview = texto.texto
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 3)
    .join("\n");

  return (
    <Card className="p-5 border-border flex flex-col gap-3">
      {texto.periodo && (
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {texto.periodo}
        </div>
      )}
      <p className="font-serif text-sm leading-relaxed text-foreground/80 whitespace-pre-line line-clamp-4">
        {preview}
      </p>
      <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">
        <span className="font-medium text-foreground/60">{isEN ? "Question:" : "Pregunta:"} </span>
        {desbloqueado ? texto.pregunta : "···"}
      </p>
      {desbloqueado ? (
        <Button size="sm" className="mt-auto" onClick={onPracticar}>
          {isEN ? "Practice with this text" : "Practicar con este texto"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="mt-auto gap-1.5" onClick={onDesbloquear}>
          <Lock className="h-3.5 w-3.5" />
          {isEN ? "Unlock to practice" : "Desbloquear para practicar"}
        </Button>
      )}
    </Card>
  );
}

function BibliotecaPage() {
  const { user, loading: authLoading, rol, courseKey } = useAuth();
  const isEN = useUiLang() === "en";
  const navigate = useNavigate();
  const [textos, setTextos] = useState<TextoPractica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desbloqueado, setDesbloqueado] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol === "profesor") {
      navigate({ to: "/profesor" });
      return;
    }
    const guardado = localStorage.getItem(STORAGE_KEY(user.id));
    if (guardado === "1") setDesbloqueado(true);
    cargarTextos();
  }, [user, authLoading, rol]);

  const cargarTextos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("textos_practica_p1")
        .select("id, genero, periodo, texto, pregunta, activo, created_at")
        .eq("activo", true)
        .eq("course_key", courseKey)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      setTextos((data as TextoPractica[]) ?? []);
    } catch {
      toast.error(
        isEN ? "Could not load practice texts." : "No se pudieron cargar los textos de práctica.",
      );
    } finally {
      setCargando(false);
    }
  };

  const desbloquear = () => {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY(user.id), "1");
    setDesbloqueado(true);
    toast.success(
      isEN ? "Texts unlocked. Ready to practice!" : "Textos desbloqueados. ¡A practicar!",
    );
  };

  const irAPrueba1 = (textoId: string) => {
    navigate({ to: "/prueba-1", search: { texto_id: textoId } });
  };

  const porGenero = (genero: TextoPractica["genero"]) => textos.filter((t) => t.genero === genero);

  if (authLoading || !user || rol === "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {isEN ? "Loading…" : "Cargando…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="max-w-2xl mb-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
            <Library className="h-3.5 w-3.5" />
            {isEN ? "Practice texts" : "Biblioteca de textos"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
            {isEN ? "Paper 1 practice texts" : "Textos de práctica para Prueba 1"}
          </h1>
          <p className="mt-3 text-foreground/70 leading-relaxed">
            {isEN
              ? "Choose a text, practice your analysis, and get IB-level feedback. All texts are original and unpublished, with no copyright risk."
              : "Elige un texto, practica tu análisis y recibe feedback de nivel IB. Todos los textos son originales e inéditos, sin riesgo de copyright."}
          </p>
        </div>

        {/* CTA de desbloqueo */}
        {!desbloqueado && (
          <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Lock className="h-4 w-4" />
                {isEN ? "Practice texts locked" : "Textos de práctica bloqueados"}
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {isEN
                  ? "Unlock the library to access all texts and practice your analysis with IB feedback. Unlock is remembered on this device."
                  : "Desbloquea la biblioteca para acceder a todos los textos y poder practicar tu análisis con feedback IB. El desbloqueo se recuerda en este dispositivo."}
              </p>
            </div>
            <Button onClick={desbloquear} className="gap-2 shrink-0">
              <Sparkles className="h-4 w-4" />
              {isEN ? "Unlock practice texts" : "Desbloquear textos de práctica"}
            </Button>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEN ? "Loading texts…" : "Cargando textos…"}
          </div>
        ) : textos.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Library className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {isEN
                ? "No practice texts available yet."
                : "Aún no hay textos de práctica disponibles."}
            </p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              {isEN
                ? "The admin can generate them from the admin panel."
                : "El administrador puede generarlos desde el panel de admin."}
            </p>
          </div>
        ) : (
          <Tabs defaultValue={isEN ? "poem" : "poema"}>
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value={isEN ? "poem" : "poema"} className="flex-1 sm:flex-none">
                {isEN ? "Poem" : "Poema"} ({porGenero("poema").length})
              </TabsTrigger>
              <TabsTrigger value={isEN ? "prose" : "prosa"} className="flex-1 sm:flex-none">
                {isEN ? "Prose" : "Prosa"} ({porGenero("prosa").length})
              </TabsTrigger>
              <TabsTrigger value={isEN ? "drama" : "teatro"} className="flex-1 sm:flex-none">
                {isEN ? "Drama" : "Teatro"} ({porGenero("teatro").length})
              </TabsTrigger>
            </TabsList>

            {(isEN
              ? ([
                  { value: "poem", genero: "poema" as const },
                  { value: "prose", genero: "prosa" as const },
                  { value: "drama", genero: "teatro" as const },
                ] as const)
              : ([
                  { value: "poema", genero: "poema" as const },
                  { value: "prosa", genero: "prosa" as const },
                  { value: "teatro", genero: "teatro" as const },
                ] as const)
            ).map(({ value, genero }) => (
              <TabsContent key={value} value={value}>
                {porGenero(genero).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {isEN
                      ? `No ${genero === "poema" ? "poem" : genero === "prosa" ? "prose" : "drama"} texts available yet.`
                      : `No hay textos de ${genero} disponibles aún.`}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {porGenero(genero).map((t) => (
                      <TextoCard
                        key={t.id}
                        texto={t}
                        desbloqueado={desbloqueado}
                        onPracticar={() => irAPrueba1(t.id)}
                        onDesbloquear={desbloquear}
                        isEN={isEN}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
}
