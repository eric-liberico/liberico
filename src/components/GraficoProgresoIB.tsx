import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { notaIBPrueba2 } from "@/lib/ib-paper2";
import { notaIBOral } from "@/lib/ib-oral";

export type DatoP1Grafico = {
  created_at: string;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  nota_ib: number;
};

export type DatoP2Grafico = {
  created_at: string;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
};

export type DatoOralGrafico = {
  created_at: string;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  puntuacion_total: number;
};

type Filtro = "nota_ib" | "A" | "B" | "C" | "D";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "nota_ib", label: "Nota IB" },
  { key: "A", label: "Criterio A" },
  { key: "B", label: "Criterio B" },
  { key: "C", label: "Criterio C" },
  { key: "D", label: "Criterio D" },
];

const COLORES = { p1: "#3b82f6", p2: "#f59e0b", oral: "#a855f7" };

// P1/P2 puntúan 0–5 por criterio. Oral puntúa 0–10.
// Todos se muestran en eje 0–10; P1/P2 ocupan la mitad inferior.
function valorP1(e: DatoP1Grafico, f: Filtro): number {
  if (f === "nota_ib") return e.nota_ib;
  if (f === "A") return e.banda_a;
  if (f === "B") return e.banda_b;
  if (f === "C") return e.banda_c;
  return e.banda_d;
}

function valorP2(e: DatoP2Grafico, f: Filtro): number {
  if (f === "nota_ib") return notaIBPrueba2(e.puntuacion_total);
  if (f === "A") return e.criterio_a;
  // B en P2 son B1+B2 (cada uno /5); se muestra la media para que sea /5 como P1
  if (f === "B") return Math.round(((e.criterio_b1 + e.criterio_b2) / 2) * 10) / 10;
  if (f === "C") return e.criterio_c;
  return e.criterio_d;
}

function valorOral(e: DatoOralGrafico, f: Filtro): number {
  if (f === "nota_ib") return notaIBOral(e.puntuacion_total);
  if (f === "A") return e.criterio_a;
  if (f === "B") return e.criterio_b;
  if (f === "C") return e.criterio_c;
  return e.criterio_d;
}

// Escala máxima del eje Y según el criterio (Oral puntúa /10, el resto /5)
function maxEje(f: Filtro): number {
  return f === "nota_ib" ? 7 : 10;
}

function ticksEje(f: Filtro): number[] {
  if (f === "nota_ib") return [1, 2, 3, 4, 5, 6, 7];
  return [0, 2, 4, 6, 8, 10];
}

type Punto = { ts: number; fecha: string; p1?: number; p2?: number; oral?: number };

type Props = {
  p1: DatoP1Grafico[];
  p2: DatoP2Grafico[];
  oral: DatoOralGrafico[];
};

export function GraficoProgresoIB({ p1, p2, oral }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("nota_ib");

  const hayDatos = p1.length > 0 || p2.length > 0 || oral.length > 0;

  const datos = useMemo((): Punto[] => {
    const puntos: Punto[] = [];
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

    p1.forEach((e) =>
      puntos.push({
        ts: new Date(e.created_at).getTime(),
        fecha: fmt(e.created_at),
        p1: valorP1(e, filtro),
      }),
    );
    p2.forEach((e) =>
      puntos.push({
        ts: new Date(e.created_at).getTime(),
        fecha: fmt(e.created_at),
        p2: valorP2(e, filtro),
      }),
    );
    oral.forEach((e) =>
      puntos.push({
        ts: new Date(e.created_at).getTime(),
        fecha: fmt(e.created_at),
        oral: valorOral(e, filtro),
      }),
    );

    return puntos.sort((a, b) => a.ts - b.ts);
  }, [p1, p2, oral, filtro]);

  if (!hayDatos) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        Completa tu primera evaluación para ver tu progresión aquí.
      </p>
    );
  }

  const esNota = filtro === "nota_ib";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filtro === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={datos} margin={{ top: 4, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
          <YAxis
            domain={[esNota ? 1 : 0, maxEje(filtro)]}
            ticks={ticksEje(filtro)}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(v: number, name: string) => {
              const label = name === "p1" ? "Prueba 1" : name === "p2" ? "Prueba 2" : "Oral";
              if (esNota) return [`${v}/7`, label];
              // Oral: /10 · P1 y P2: /5
              const max = name === "oral" ? 10 : 5;
              return [`${v}/${max}`, label];
            }}
          />
          {esNota && (
            <ReferenceLine
              y={5}
              stroke="#22c55e"
              strokeDasharray="4 3"
              label={{ value: "Nota 5", fontSize: 9, fill: "#22c55e", position: "right" }}
            />
          )}
          {!esNota && (
            <ReferenceLine
              y={5}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              label={{ value: "5/10", fontSize: 9, fill: "#94a3b8", position: "right" }}
            />
          )}
          {p1.length > 0 && (
            <Line
              type="monotone"
              dataKey="p1"
              name="p1"
              stroke={COLORES.p1}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORES.p1 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
          {p2.length > 0 && (
            <Line
              type="monotone"
              dataKey="p2"
              name="p2"
              stroke={COLORES.p2}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORES.p2 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
          {oral.length > 0 && (
            <Line
              type="monotone"
              dataKey="oral"
              name="oral"
              stroke={COLORES.oral}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORES.oral }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 items-center">
        {[
          { key: "p1", label: "Prueba 1", show: p1.length > 0 },
          { key: "p2", label: "Prueba 2", show: p2.length > 0 },
          { key: "oral", label: "Oral", show: oral.length > 0 },
        ]
          .filter((l) => l.show)
          .map((l) => (
            <div
              key={l.key}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <div
                className="h-2 w-5 rounded-sm"
                style={{ backgroundColor: COLORES[l.key as keyof typeof COLORES] }}
              />
              {l.label}
            </div>
          ))}
        {!esNota && (
          <p className="text-[10px] text-muted-foreground ml-auto">P1/P2: /5 · Oral: /10</p>
        )}
      </div>
    </div>
  );
}
