import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CriterioKey = "a" | "b" | "c" | "d";

const CONFIG: Record<
  CriterioKey,
  { letra: string; nombre: string; tab: string; ejercicio: string }
> = {
  a: {
    letra: "A",
    nombre: "Comprensión e interpretación",
    tab: "identificacion",
    ejercicio: "Identificación de recursos",
  },
  b: {
    letra: "B",
    nombre: "Análisis y evaluación",
    tab: "efectos",
    ejercicio: "Análisis de efectos",
  },
  c: {
    letra: "C",
    nombre: "Focalización y desarrollo",
    tab: "reescritura",
    ejercicio: "Reescritura",
  },
  d: {
    letra: "D",
    nombre: "Lenguaje",
    tab: "teoria",
    ejercicio: "Recursos literarios",
  },
};

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
  const scores: Record<CriterioKey, number> = {
    a: banda_a,
    b: banda_b,
    c: banda_c,
    d: banda_d,
  };
  const minScore = Math.min(banda_a, banda_b, banda_c, banda_d);
  const debil = (["a", "b", "c", "d"] as CriterioKey[]).find((k) => scores[k] === minScore)!;
  const cfg = CONFIG[debil];

  return (
    <Card className="p-5 border-l-4 border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 mb-2">
        Tu siguiente paso
      </div>
      <p className="text-sm text-foreground/80 mb-4">
        Tu criterio más débil es{" "}
        <strong className="text-foreground">
          Criterio {cfg.letra} — {cfg.nombre}
        </strong>{" "}
        ({minScore}/5). Practica esto ahora.
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
