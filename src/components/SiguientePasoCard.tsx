import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";

const ctaPrimary = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
} as const;

type CriterioKey = "a" | "b" | "c" | "d";

export function SiguientePasoCard({
  banda_a,
  banda_b,
  banda_c,
  banda_d,
}: {
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
}) {
  const { courseKey } = useAuth();
  const isEN = useUiLang() === "en";

  const CONFIG: Record<
    CriterioKey,
    { letra: string; nombre: string; tab: string; ejercicio: string }
  > = {
    a: {
      letra: "A",
      nombre: isEN ? "Understanding and interpretation" : "Comprensión e interpretación",
      tab: "identificacion",
      ejercicio: isEN ? "Device identification" : "Identificación de recursos",
    },
    b: {
      letra: "B",
      nombre: isEN ? "Analysis and evaluation" : "Análisis y evaluación",
      tab: "efectos",
      ejercicio: isEN ? "Effect analysis" : "Análisis de efectos",
    },
    c: {
      letra: "C",
      nombre: isEN ? "Focus and development" : "Focalización y desarrollo",
      tab: "reescritura",
      ejercicio: isEN ? "Rewriting" : "Reescritura",
    },
    d: {
      letra: "D",
      nombre: isEN ? "Language" : "Lenguaje",
      tab: "teoria",
      ejercicio: isEN ? "Literary devices" : "Recursos literarios",
    },
  };

  const scores: Record<CriterioKey, number> = { a: banda_a, b: banda_b, c: banda_c, d: banda_d };
  const minScore = Math.min(banda_a, banda_b, banda_c, banda_d);
  const debil = (["a", "b", "c", "d"] as CriterioKey[]).find((k) => scores[k] === minScore)!;
  const cfg = CONFIG[debil];

  return (
    <Card
      className="lib-reveal rounded-2xl border border-l-4 p-6"
      style={{
        backgroundColor: L.surface,
        borderColor: L.line,
        borderLeftColor: L.amber,
        boxShadow: cardShadow,
      }}
    >
      <div
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ ...fontMono, color: L.amberDeep }}
      >
        {isEN ? "Your next step" : "Tu siguiente paso"}
      </div>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: L.muted }}>
        {isEN ? "Your weakest criterion is" : "Tu criterio más débil es"}{" "}
        <strong style={{ color: L.ink }}>
          {isEN ? "Criterion" : "Criterio"} {cfg.letra} — {cfg.nombre}
        </strong>{" "}
        ({minScore}/5). {isEN ? "Practise this now." : "Practica esto ahora."}
      </p>
      <Button asChild size="sm" className="lib-press gap-2 rounded-2xl" style={ctaPrimary}>
        <Link
          to="/ejercicios"
          search={{ tab: cfg.tab as "identificacion" | "efectos" | "reescritura" | "teoria" }}
        >
          {cfg.ejercicio}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </Card>
  );
}
