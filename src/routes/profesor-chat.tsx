import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/profesor-chat")({
  head: () => ({
    meta: [
      { title: "Chat con Claude — IB Literatura" },
      { name: "description", content: "Consulta a Claude sobre criterios, textos y pedagogía IB." },
    ],
  }),
  component: ProfesorChatPage,
});

type Mensaje = {
  id?: string;
  rol: "user" | "assistant";
  contenido: string;
};

const MAX_CHARS = 4000;
const HISTORIAL_CARGA = 50;
const HISTORIAL_CONTEXTO = 20;

function ProfesorChatPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  // Cargar historial al montar
  useEffect(() => {
    if (!user || rol !== "profesor") return;
    supabase
      .from("mensajes_chat_profesor")
      .select("id, rol, contenido")
      .eq("profesor_id", user.id)
      .order("created_at", { ascending: true })
      .limit(HISTORIAL_CARGA)
      .then(({ data, error }) => {
        if (error) {
          toast.error("No se pudo cargar el historial.");
        } else {
          setMensajes(
            (data ?? []).map((m) => ({
              id: m.id,
              rol: m.rol as "user" | "assistant",
              contenido: m.contenido,
            })),
          );
        }
        setCargandoHistorial(false);
      });
  }, [user, rol]);

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    const texto = entrada.trim();
    if (!texto || cargando) return;
    if (texto.length > MAX_CHARS) {
      toast.error(`El mensaje no puede superar ${MAX_CHARS} caracteres.`);
      return;
    }

    const mensajeUsuario: Mensaje = { rol: "user", contenido: texto };
    setMensajes((prev) => [...prev, mensajeUsuario]);
    setEntrada("");
    setCargando(true);

    try {
      // Guardar mensaje del usuario en DB
      await supabase.from("mensajes_chat_profesor").insert({
        profesor_id: user!.id,
        rol: "user",
        contenido: texto,
      });

      // Enviar historial (últimos N) a la Edge Function
      const historialParaEnvio = [...mensajes, mensajeUsuario]
        .slice(-HISTORIAL_CONTEXTO)
        .map((m) => ({ rol: m.rol, contenido: m.contenido }));

      const { data, error } = await supabase.functions.invoke("teacher-chat", {
        body: { mensajes: historialParaEnvio },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);

      const respuesta = data.respuesta as string;
      const mensajeAsistente: Mensaje = { rol: "assistant", contenido: respuesta };
      setMensajes((prev) => [...prev, mensajeAsistente]);

      // Guardar respuesta en DB
      await supabase.from("mensajes_chat_profesor").insert({
        profesor_id: user!.id,
        rol: "assistant",
        contenido: respuesta,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el mensaje.");
      // Retirar el mensaje del usuario de la UI si falló completamente
      setMensajes((prev) => prev.filter((m) => m !== mensajeUsuario));
      setEntrada(texto);
    } finally {
      setCargando(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  };

  if (authLoading || !user || rol !== "profesor") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 flex flex-col py-6">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Chat con Claude
          </div>
          <h1 className="font-serif text-2xl text-ink">Asistente pedagógico IB</h1>
          <p className="text-sm text-foreground/60 mt-0.5">
            Pregunta sobre criterios, textos, ejercicios o cualquier aspecto del programa.
          </p>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[300px]">
          {cargandoHistorial ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando historial…
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <p className="text-sm">Todavía no hay mensajes.</p>
              <p className="text-xs">
                Puedes preguntar sobre criterios de evaluación, análisis de textos, diseño de
                actividades, movimientos literarios…
              </p>
            </div>
          ) : (
            mensajes.map((m, i) => (
              <div
                key={m.id ?? i}
                className={cn("flex", m.rol === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    m.rol === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm",
                  )}
                >
                  {m.contenido}
                </div>
              </div>
            ))
          )}
          {cargando && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
              rows={3}
              maxLength={MAX_CHARS}
              className="resize-none pr-16 text-sm"
              disabled={cargando}
            />
            <span
              className={cn(
                "absolute bottom-2 right-3 text-[10px] tabular-nums",
                entrada.length > MAX_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {entrada.length}/{MAX_CHARS}
            </span>
          </div>
          <Button
            onClick={() => void enviar()}
            disabled={!entrada.trim() || cargando}
            size="icon"
            className="h-[72px] w-10 shrink-0"
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </main>
    </div>
  );
}
