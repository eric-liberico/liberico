import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Props = {
  children: string;
  className?: string;
  size?: "sm" | "base";
};

/**
 * Renderizador de Markdown para contenido generado por Claude y texto del alumno.
 * Usa el mismo patrón que MdContent en profesor-chat.tsx.
 */
export function MdProse({ children, className, size = "sm" }: Props) {
  const textBase = size === "sm" ? "text-sm" : "text-[15px]";

  return (
    <div className={cn("space-y-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: c }) => (
            <h1 className="font-serif text-base font-bold text-ink mt-4 mb-1.5 first:mt-0">{c}</h1>
          ),
          h2: ({ children: c }) => (
            <h2 className="font-serif text-[15px] font-bold text-ink mt-3 mb-1 first:mt-0">{c}</h2>
          ),
          h3: ({ children: c }) => (
            <h3 className={cn(textBase, "font-semibold text-ink mt-2 mb-0.5 first:mt-0")}>{c}</h3>
          ),
          p: ({ children: c }) => (
            <p className={cn(textBase, "leading-relaxed text-foreground/85 mb-3 last:mb-0")}>{c}</p>
          ),
          ul: ({ children: c }) => (
            <ul className={cn(textBase, "list-disc pl-5 mb-3 space-y-1 text-foreground/85")}>
              {c}
            </ul>
          ),
          ol: ({ children: c }) => (
            <ol className={cn(textBase, "list-decimal pl-5 mb-3 space-y-1 text-foreground/85")}>
              {c}
            </ol>
          ),
          li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
          strong: ({ children: c }) => <strong className="font-semibold text-ink">{c}</strong>,
          em: ({ children: c }) => <em className="italic">{c}</em>,
          blockquote: ({ children: c }) => (
            <blockquote className="border-l-2 border-border pl-4 italic text-foreground/65 my-2">
              {c}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-3" />,
          code: ({ children: c }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-[12px] font-mono">{c}</code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
