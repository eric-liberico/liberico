import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { Bold, Italic, Underline as UnderlineIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { plainTextToEditorHtml } from "@/lib/textFormatting";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  showWordCount?: boolean;
  isEN?: boolean;
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
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

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "180px",
  disabled = false,
  showWordCount = false,
  isEN = false,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
    ],
    content: plainTextToEditorHtml(value || ""),
    editable: !disabled,
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    onFocus() {
      setIsFocused(true);
    },
    onBlur() {
      setIsFocused(false);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none text-foreground/80 leading-relaxed",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1",
        ),
      },
      // Strips inline styles and class attributes pasted from Word / Google Docs,
      // preserving only structural tags (bold, italic, underline, paragraphs).
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
        doc.querySelectorAll("[class]").forEach((el) => el.removeAttribute("class"));
        return doc.body.innerHTML;
      },
    },
  });

  // Sync when parent resets value externally.
  useEffect(() => {
    if (!editor) return;
    if (!value) {
      if (editor.getHTML() !== "<p></p>") editor.commands.clearContent();
      return;
    }
    const incoming = plainTextToEditorHtml(value);
    if (editor.getHTML() !== incoming) editor.commands.setContent(incoming);
  }, [value, editor]);

  const words = showWordCount && editor ? countWords(editor.getText()) : 0;
  const showPlaceholder = !!placeholder && !isFocused && !editor?.getText();

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
          {showWordCount && (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums pr-1">
              {words} {isEN ? (words === 1 ? "word" : "words") : (words === 1 ? "palabra" : "palabras")}
            </span>
          )}
        </div>
      )}

      {/* Editor area */}
      <div
        className="relative px-3 py-2 overflow-y-auto"
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      >
        {showPlaceholder && (
          <p className="absolute top-2 left-3 text-muted-foreground/50 text-sm pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
