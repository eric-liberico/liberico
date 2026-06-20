import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useRef, useState } from "react";
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
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/profesor-chat")({
  head: () => ({
    meta: [
      { title: "Chat con Claude — LIBerico" },
      { name: "description", content: "Consulta a Claude sobre criterios, textos y pedagogía IB." },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: ProfesorChatPage,
});

type Chat = { id: string; titulo: string; created_at: string };
type Mensaje = { id?: string; rol: "user" | "assistant"; contenido: string };

const MAX_CHARS = 4000;
const HISTORIAL_CONTEXTO = 20;

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--secondary": L.bg2,
  "--secondary-foreground": L.ink,
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--accent": L.primary + "10",
  "--accent-foreground": L.ink,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
};
const ctaStyle = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
};
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };

const scopedCss = `
  #profesor-chat-root .chat-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
  #profesor-chat-root .chat-soft{background:${L.bg2};border-color:${L.line};}
  #profesor-chat-root .chat-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
  #profesor-chat-root .chat-press:active{transform:scale(0.985);}
  #profesor-chat-root a:focus-visible,#profesor-chat-root button:focus-visible,#profesor-chat-root textarea:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #profesor-chat-root button:not([disabled]){cursor:pointer;}
  @media (hover:hover) and (pointer:fine){
    #profesor-chat-root .chat-row:hover{background:${L.primary}10;}
  }
  @media (prefers-reduced-motion: reduce){
    #profesor-chat-root .chat-press{transition:none !important;}
  }
`;

// ── Renderizador de markdown para las respuestas de Claude ──────────────────
function MdContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children: c }) => (
          <h1 className="mb-1 mt-3 text-base font-bold first:mt-0" style={{ color: L.ink }}>
            {c}
          </h1>
        ),
        h2: ({ children: c }) => (
          <h2 className="mb-1 mt-3 text-sm font-bold first:mt-0" style={{ color: L.ink }}>
            {c}
          </h2>
        ),
        h3: ({ children: c }) => (
          <h3 className="mb-0.5 mt-2 text-sm font-semibold first:mt-0" style={{ color: L.ink }}>
            {c}
          </h3>
        ),
        p: ({ children: c }) => <p className="mb-2 last:mb-0 leading-relaxed">{c}</p>,
        ul: ({ children: c }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{c}</ul>,
        ol: ({ children: c }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{c}</ol>,
        li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
        strong: ({ children: c }) => (
          <strong className="font-semibold" style={{ color: L.ink }}>
            {c}
          </strong>
        ),
        em: ({ children: c }) => <em className="italic">{c}</em>,
        code: ({ children: c, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code
              className="mb-2 block overflow-x-auto rounded-2xl px-3 py-2 font-mono text-[12px]"
              style={{ backgroundColor: L.bg2, color: L.ink }}
            >
              {c}
            </code>
          ) : (
            <code
              className="rounded px-1 py-0.5 font-mono text-[12px]"
              style={{ backgroundColor: L.bg2, color: L.ink }}
            >
              {c}
            </code>
          );
        },
        pre: ({ children: c }) => <pre className="mb-2">{c}</pre>,
        blockquote: ({ children: c }) => (
          <blockquote
            className="mb-2 border-l-2 pl-3 italic"
            style={{ borderColor: L.line, color: L.muted }}
          >
            {c}
          </blockquote>
        ),
        table: ({ children: c }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">{c}</table>
          </div>
        ),
        thead: ({ children: c }) => <thead style={{ backgroundColor: L.bg2 }}>{c}</thead>,
        tbody: ({ children: c }) => <tbody>{c}</tbody>,
        tr: ({ children: c }) => (
          <tr className="border-b even:bg-muted/30" style={{ borderColor: L.line }}>
            {c}
          </tr>
        ),
        th: ({ children: c }) => (
          <th
            className="border px-2 py-1.5 text-left font-semibold"
            style={{ borderColor: L.line, color: L.ink }}
          >
            {c}
          </th>
        ),
        td: ({ children: c }) => (
          <td className="border px-2 py-1.5 align-top" style={{ borderColor: L.line }}>
            {c}
          </td>
        ),
        hr: () => <hr className="my-3" style={{ borderColor: L.line }} />,
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
      <div className="flex min-h-screen items-center justify-center" style={rootStyle}>
        Cargando…
      </div>
    );
  }

  return (
    <div id="profesor-chat-root" className="flex min-h-screen flex-col" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />

      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden px-0 sm:px-4 sm:py-4">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "chat-card flex w-full shrink-0 flex-col border-r sm:w-64 sm:rounded-2xl sm:border",
            // móvil: ocultar sidebar cuando estamos en vista chat
            vistaMovil === "chat" ? "hidden sm:flex" : "flex",
          )}
        >
          <div className="border-b p-3" style={{ borderColor: L.line }}>
            <Button
              type="button"
              onClick={nuevoChat}
              size="sm"
              className="chat-press w-full gap-2 rounded-xl"
              style={ctaStyle}
            >
              <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />
              Nuevo chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cargandoChats ? (
              <div className="flex justify-center py-6">
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                  style={{ color: L.muted }}
                />
              </div>
            ) : chats.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs" style={{ color: L.muted }}>
                Ningún chat todavía. Pulsa «Nuevo chat» para empezar.
              </p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="chat-row group flex items-start justify-between gap-2 border-b transition-colors"
                  style={{
                    backgroundColor: chatActivo?.id === chat.id ? L.primary + "10" : "transparent",
                    borderColor: L.line,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => seleccionarChat(chat)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                  >
                    <div className="truncate text-sm" style={{ color: L.ink }}>
                      {chat.titulo}
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: L.muted }}>
                      {new Date(chat.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void eliminarChat(chat, e)}
                    className="mr-3 mt-3 shrink-0 rounded p-0.5 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    title="Eliminar chat"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Área del chat ── */}
        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            vistaMovil === "lista" ? "hidden sm:flex" : "flex",
          )}
        >
          {/* Header móvil */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2 sm:hidden"
            style={{ borderColor: L.line }}
          >
            <button
              type="button"
              onClick={() => setVistaMovil("lista")}
              className="chat-press rounded p-1 hover:bg-primary/10"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-semibold" style={{ color: L.ink }}>
              {chatActivo?.titulo ?? "Nuevo chat"}
            </span>
          </div>

          {/* Mensajes */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {!chatActivo && mensajes.length === 0 ? (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center"
                style={{ color: L.muted }}
              >
                <p className="text-sm font-medium">Asistente pedagógico IB</p>
                <p className="text-xs max-w-xs">
                  Pregunta sobre criterios de evaluación, análisis de textos, diseño de actividades,
                  movimientos literarios o cualquier aspecto del programa IB.
                </p>
              </div>
            ) : cargandoMensajes ? (
              <div className="flex justify-center py-12">
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                  style={{ color: L.muted }}
                />
              </div>
            ) : (
              mensajes.map((m, i) => (
                <div
                  key={m.id ?? i}
                  className={cn("flex", m.rol === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", {
                      "rounded-br-sm": m.rol === "user",
                      "rounded-bl-sm border": m.rol === "assistant",
                    })}
                    style={
                      m.rol === "user"
                        ? { backgroundColor: L.primary, color: "#fff" }
                        : { backgroundColor: L.surface, borderColor: L.line, color: L.ink }
                    }
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
                <div className="rounded-2xl rounded-bl-sm border px-4 py-3" style={cardStyle}>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                    style={{ color: L.muted }}
                  />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3" style={{ borderColor: L.line }}>
            <div className="flex items-end gap-2">
              <div className="relative flex-1">
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
                  className="resize-none rounded-2xl pr-16 text-sm"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                  disabled={cargando}
                />
                <span
                  className={cn(
                    "absolute bottom-2 right-3 text-[10px] tabular-nums",
                    entrada.length > MAX_CHARS * 0.9 ? "text-destructive" : "",
                  )}
                  style={{ color: entrada.length > MAX_CHARS * 0.9 ? undefined : L.muted }}
                >
                  {entrada.length}/{MAX_CHARS}
                </span>
              </div>

              {/* Botón de dictado */}
              <Button
                type="button"
                onClick={toggleDictado}
                disabled={cargando}
                size="icon"
                variant={dictando ? "destructive" : "outline"}
                className={cn(
                  "chat-press h-[72px] w-10 shrink-0 rounded-2xl",
                  dictando && "animate-pulse",
                )}
                title={dictando ? "Detener dictado" : "Dictar por voz"}
              >
                {dictando ? (
                  <MicOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Mic aria-hidden="true" className="h-4 w-4" />
                )}
              </Button>

              <Button
                type="button"
                onClick={() => void enviar()}
                disabled={!entrada.trim() || cargando}
                size="icon"
                className="chat-press h-[72px] w-10 shrink-0 rounded-2xl"
                style={ctaStyle}
              >
                {cargando ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Texto interim del dictado */}
            {dictando && interimTexto && (
              <p className="mt-1.5 truncate px-1 text-xs italic" style={{ color: L.muted }}>
                {interimTexto}…
              </p>
            )}
            {dictando && !interimTexto && (
              <p className="mt-1.5 px-1 text-xs" style={{ color: L.muted }}>
                Escuchando…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
