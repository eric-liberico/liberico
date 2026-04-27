import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Bold, Italic, Underline as UnderlineIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
};

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "180px",
  disabled = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desactivar los que no necesitamos
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      // Si el editor está vacío, devolver cadena vacía
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none text-foreground/80 leading-relaxed",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1",
        ),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
  });

  // Sync external value changes (e.g., when preloading from biblioteca)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current !== incoming && incoming !== "<p></p>") {
      editor.commands.setContent(incoming);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm ring-offset-background",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {/* Toolbar */}
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-input">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={!!editor?.isActive("bold")}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={!!editor?.isActive("italic")}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={!!editor?.isActive("underline")}
            title="Subrayado (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div
        className="px-3 py-2 overflow-y-auto"
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      >
        {!editor?.getText() && placeholder && !editor?.isFocused && (
          <p className="absolute text-muted-foreground/60 text-sm pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
