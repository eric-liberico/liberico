import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquarePlus, Send, Trash2, ChevronLeft, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDictado } from "@/hooks/useDictado";

export const Route = createFileRoute("/profesor-chat")({
  head: () => ({
    meta: [
      { title: "Chat con Claude — IB Literatura" },
      { name: "description", content: "Consulta a Claude sobre criterios, textos y pedagogía IB." },
    ],
  }),
  component: ProfesorChatPage,
});

type Chat = { id: string; titulo: string; created_at: string };
type Mensaje = { id?: string; rol: "user" | "assistant"; contenido: string };

const MAX_CHARS = 4000;
const HISTORIAL_CONTEXTO = 20;

// ── Renderizador de markdown para las respuestas de Claude ──────────────────
function MdContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children: c }) => (
          <h1 className="text-base font-bold text-ink mt-3 mb-1 first:mt-0">{c}</h1>
        ),
        h2: ({ children: c }) => (
          <h2 className="text-sm font-bold text-ink mt-3 mb-1 first:mt-0">{c}</h2>
        ),
        h3: ({ children: c }) => (
          <h3 className="text-sm font-semibold text-ink mt-2 mb-0.5 first:mt-0">{c}</h3>
        ),
        p: ({ children: c }) => <p className="mb-2 last:mb-0 leading-relaxed">{c}</p>,
        ul: ({ children: c }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{c}</ul>,
        ol: ({ children: c }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{c}</ol>,
        li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
        strong: ({ children: c }) => <strong className="font-semibold text-ink">{c}</strong>,
        em: ({ children: c }) => <em className="italic">{c}</em>,
        code: ({ children: c, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="block bg-muted rounded px-3 py-2 text-[12px] font-mono overflow-x-auto mb-2">
              {c}
            </code>
          ) : (
            <code className="bg-muted rounded px-1 py-0.5 text-[12px] font-mono">{c}</code>
          );
        },
        pre: ({ children: c }) => <pre className="mb-2">{c}</pre>,
        blockquote: ({ children: c }) => (
          <blockquote className="border-l-2 border-border pl-3 text-foreground/70 mb-2 italic">
            {c}
          </blockquote>
        ),
        table: ({ children: c }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">{c}</table>
          </div>
        ),
        thead: ({ children: c }) => <thead className="bg-muted">{c}</thead>,
        tbody: ({ children: c }) => <tbody>{c}</tbody>,
        tr: ({ children: c }) => <tr className="border-b border-border even:bg-muted/30">{c}</tr>,
        th: ({ children: c }) => (
          <th className="text-left px-2 py-1.5 font-semibold text-ink border border-border">{c}</th>
        ),
        td: ({ children: c }) => (
          <td className="px-2 py-1.5 border border-border align-top">{c}</td>
        ),
        hr: () => <hr className="border-border my-3" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function ProfesorChatPage() {
  const { user, loading: authLoading, rol } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatActivo, setChatActivo] = useState<Chat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoChats, setCargandoChats] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [vistaMovil, setVistaMovil] = useState<"lista" | "chat">("lista");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (rol !== null && rol !== "profesor") navigate({ to: "/" });
  }, [user, authLoading, rol, navigate]);

  // Cargar lista de chats
  useEffect(() => {
    if (!user || rol !== "profesor") return;
    supabase
      .from("chats_profesor")
      .select("id, titulo, created_at")
      .eq("profesor_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("No se pudo cargar el historial de chats.");
        else setChats((data ?? []) as Chat[]);
        setCargandoChats(false);
      });
  }, [user, rol]);

  // Cargar mensajes cuando cambia el chat activo
  useEffect(() => {
    if (!chatActivo) {
      setMensajes([]);
      return;
    }
    setCargandoMensajes(true);
    supabase
      .from("mensajes_chat_profesor")
      .select("id, rol, contenido")
      .eq("chat_id", chatActivo.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("No se pudo cargar los mensajes.");
        else
          setMensajes(
            (data ?? []).map((m) => ({
              id: m.id,
              rol: m.rol as "user" | "assistant",
              contenido: m.contenido,
            })),
          );
        setCargandoMensajes(false);
      });
  }, [chatActivo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const seleccionarChat = (chat: Chat) => {
    setChatActivo(chat);
    setVistaMovil("chat");
  };

  const nuevoChat = () => {
    setChatActivo(null);
    setMensajes([]);
    setEntrada("");
    setVistaMovil("chat");
  };

  const eliminarChat = async (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("chats_profesor").delete().eq("id", chat.id);
    if (error) {
      toast.error("No se pudo eliminar el chat.");
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== chat.id));
    if (chatActivo?.id === chat.id) {
      setChatActivo(null);
      setMensajes([]);
      setVistaMovil("lista");
    }
  };

  const { dictando, interimTexto, toggleDictado } = useDictado((texto) => {
    setEntrada((prev) => {
      const sep = prev && !prev.endsWith(" ") ? " " : "";
      return prev + sep + texto;
    });
  });

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
      // Si no hay chat activo, crear uno con el primer mensaje como título
      let chatId = chatActivo?.id;
      if (!chatId) {
        const titulo = texto.slice(0, 60) + (texto.length > 60 ? "…" : "");
        const { data: nuevoC, error: chatErr } = await supabase
          .from("chats_profesor")
          .insert({ profesor_id: user!.id, titulo })
          .select("id, titulo, created_at")
          .single();
        if (chatErr || !nuevoC) throw new Error("No se pudo crear el chat.");
        const chatCreado = nuevoC as Chat;
        chatId = chatCreado.id;
        setChatActivo(chatCreado);
        setChats((prev) => [chatCreado, ...prev]);
      }

      // Guardar mensaje del usuario
      await supabase.from("mensajes_chat_profesor").insert({
        profesor_id: user!.id,
        chat_id: chatId,
        rol: "user",
        contenido: texto,
      });

      // Enviar historial a la Edge Function
      const historialParaEnvio = [...mensajes, mensajeUsuario]
        .slice(-HISTORIAL_CONTEXTO)
        .map((m) => ({ rol: m.rol, contenido: m.contenido }));

      const { data, error } = await supabase.functions.invoke("teacher-chat", {
        body: { mensajes: historialParaEnvio },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);

      const respuesta = data.respuesta as string;
      setMensajes((prev) => [...prev, { rol: "assistant", contenido: respuesta }]);

      // Guardar respuesta
      await supabase.from("mensajes_chat_profesor").insert({
        profesor_id: user!.id,
        chat_id: chatId,
        rol: "assistant",
        contenido: respuesta,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el mensaje.");
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

      <div className="flex-1 flex overflow-hidden mx-auto w-full max-w-6xl px-0 sm:px-4 sm:py-4">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-card shrink-0 w-full sm:w-64",
            // móvil: ocultar sidebar cuando estamos en vista chat
            vistaMovil === "chat" ? "hidden sm:flex" : "flex",
          )}
        >
          <div className="p-3 border-b border-border">
            <Button onClick={nuevoChat} size="sm" className="w-full gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Nuevo chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cargandoChats ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : chats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                Ningún chat todavía. Pulsa «Nuevo chat» para empezar.
              </p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => seleccionarChat(chat)}
                  className={cn(
                    "w-full text-left flex items-start justify-between gap-2 px-3 py-2.5 group hover:bg-accent/50 transition-colors border-b border-border/50",
                    chatActivo?.id === chat.id && "bg-accent",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{chat.titulo}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(chat.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => void eliminarChat(chat, e)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:text-destructive transition-all mt-0.5"
                    title="Eliminar chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Área del chat ── */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            vistaMovil === "lista" ? "hidden sm:flex" : "flex",
          )}
        >
          {/* Header móvil */}
          <div className="sm:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
            <button onClick={() => setVistaMovil("lista")} className="p-1 rounded hover:bg-accent">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-ink truncate">
              {chatActivo?.titulo ?? "Nuevo chat"}
            </span>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!chatActivo && mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-16">
                <p className="text-sm font-medium">Asistente pedagógico IB</p>
                <p className="text-xs max-w-xs">
                  Pregunta sobre criterios de evaluación, análisis de textos, diseño de actividades,
                  movimientos literarios o cualquier aspecto del programa IB.
                </p>
              </div>
            ) : cargandoMensajes ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              mensajes.map((m, i) => (
                <div
                  key={m.id ?? i}
                  className={cn("flex", m.rol === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      m.rol === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm",
                    )}
                  >
                    {m.rol === "user" ? (
                      <span className="whitespace-pre-wrap leading-relaxed">{m.contenido}</span>
                    ) : (
                      <MdContent>{m.contenido}</MdContent>
                    )}
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
          <div className="border-t border-border px-4 py-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    dictando
                      ? "Habla ahora… (se transcribirá aquí)"
                      : "Escribe tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
                  }
                  rows={3}
                  maxLength={MAX_CHARS}
                  className="resize-none text-sm pr-16"
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

              {/* Botón de dictado */}
              <Button
                onClick={toggleDictado}
                disabled={cargando}
                size="icon"
                variant={dictando ? "destructive" : "outline"}
                className={cn(
                  "h-[72px] w-10 shrink-0",
                  dictando && "animate-pulse",
                )}
                title={dictando ? "Detener dictado" : "Dictar por voz"}
              >
                {dictando ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              <Button
                onClick={() => void enviar()}
                disabled={!entrada.trim() || cargando}
                size="icon"
                className="h-[72px] w-10 shrink-0"
              >
                {cargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Texto interim del dictado */}
            {dictando && interimTexto && (
              <p className="text-xs text-muted-foreground italic mt-1.5 px-1 truncate">
                {interimTexto}…
              </p>
            )}
            {dictando && !interimTexto && (
              <p className="text-xs text-muted-foreground mt-1.5 px-1">
                Escuchando…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
