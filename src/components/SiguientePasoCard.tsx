import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const isEN = courseKey === "english-a-literature";

  const CONFIG: Record<CriterioKey, { letra: string; nombre: string; tab: string; ejercicio: string }> = {
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
    <Card className="p-5 border-l-4 border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 mb-2">
        {isEN ? "Your next step" : "Tu siguiente paso"}
      </div>
      <p className="text-sm text-foreground/80 mb-4">
        {isEN ? "Your weakest criterion is" : "Tu criterio más débil es"}{" "}
        <strong className="text-foreground">
          {isEN ? "Criterion" : "Criterio"} {cfg.letra} — {cfg.nombre}
        </strong>{" "}
        ({minScore}/5). {isEN ? "Practise this now." : "Practica esto ahora."}
      </p>
      <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
        <Link
          to="/ejercicios"
          search={{ tab: cfg.tab as "identificacion" | "efectos" | "reescritura" | "teoria" }}
        >
          {cfg.ejercicio}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </Card>
  );
}
