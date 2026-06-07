import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight, GraduationCap } from "lucide-react";

// Guía pedagógica colapsable para el Oral Individual de Spanish B.
// Replica el patrón de la guía del oral de Literatura: explica la estructura
// del examen, los minutajes y qué espera el examinador en cada parte.
export function GuiaOralB({ isEN, isHL }: { isEN: boolean; isHL: boolean }) {
  const [open, setOpen] = useState(false);

  const partes = isEN
    ? [
        {
          n: "1",
          badge: "B1",
          titulo: "Presentation (3-4 min)",
          texto: isHL
            ? "You present a literary passage from a studied work: its events, ideas and messages, and how it links to the theme. Uninterrupted."
            : "You present a visual stimulus, linking it to the culture(s) of the Spanish-speaking world and a global issue. Uninterrupted. Aim for ~400-500 words.",
        },
        {
          n: "2",
          badge: "B1",
          titulo: "Discussion of the presentation (4-5 min)",
          texto:
            "The examiner asks follow-up questions about what you presented. You must show you understand the stimulus/passage in depth.",
        },
        {
          n: "3",
          badge: "B2",
          titulo: "General discussion (5-6 min)",
          texto:
            "A broader conversation about the prescribed theme, beyond your stimulus. Bring your own opinions and develop them.",
        },
      ]
    : [
        {
          n: "1",
          badge: "B1",
          titulo: "Presentación (3-4 min)",
          texto: isHL
            ? "Presentas un pasaje literario de una obra estudiada: sus acontecimientos, ideas y mensajes, y su relación con el tema. Sin interrupciones."
            : "Presentas un estímulo visual y lo vinculas con la cultura o las culturas del mundo hispanohablante y con una cuestión global. Sin interrupciones. Objetivo: ~400-500 palabras.",
        },
        {
          n: "2",
          badge: "B1",
          titulo: "Discusión sobre la presentación (4-5 min)",
          texto:
            "El examinador hace preguntas de seguimiento sobre lo que presentaste. Debes demostrar que comprendes el estímulo/pasaje en profundidad.",
        },
        {
          n: "3",
          badge: "B2",
          titulo: "Discusión general (5-6 min)",
          texto:
            "Una conversación más amplia sobre el tema prescrito, más allá de tu estímulo. Aporta tus propias opiniones y desarróllalas.",
        },
      ];

  const consejos = isEN
    ? [
        "The global issue is your thread: state it early and keep returning to it.",
        isHL
          ? "Support every claim with the passage: quote or paraphrase specific lines."
          : "Connect the image to real cultural references (festivals, places, social realities), not generic ideas.",
        "Criterion A rewards varied vocabulary and a mix of basic and complex structures — and accuracy.",
      ]
    : [
        "La cuestión global es tu hilo conductor: enúnciala pronto y vuelve a ella.",
        isHL
          ? "Apoya cada afirmación en el pasaje: cita o parafrasea líneas concretas."
          : "Conecta la imagen con referencias culturales reales (festividades, lugares, realidades sociales), no con ideas genéricas.",
        "El criterio A premia vocabulario variado y una mezcla de estructuras básicas y complejas — y la corrección.",
      ];

  return (
    <Card className="p-0 overflow-hidden border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          {isEN ? "How the Individual Oral works" : "Cómo funciona el Oral Individual"}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
          <div className="grid gap-3 sm:grid-cols-3">
            {partes.map((p) => (
              <div key={p.n} className="rounded-md border border-border p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">{p.n}</span>
                  <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">
                    {p.badge}
                  </span>
                </div>
                <div className="text-xs font-medium text-ink">{p.titulo}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.texto}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {isEN ? "Tips" : "Consejos"}
            </div>
            <ul className="space-y-1">
              {consejos.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="text-primary shrink-0">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
