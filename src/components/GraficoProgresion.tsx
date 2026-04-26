import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type EvaluacionMin = {
  created_at: string;
  puntuacion_total: number | null;
  nota_ib: number | null;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
};

const COLORES_BANDA = {
  A: "#3b82f6",
  B: "#f59e0b",
  C: "#22c55e",
  D: "#ef4444",
};

export function GraficoProgresion({ evaluaciones }: { evaluaciones: EvaluacionMin[] }) {
  if (evaluaciones.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Necesitas al menos 2 evaluaciones para ver la progresión.
      </p>
    );
  }

  const datos = [...evaluaciones]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((e) => ({
      fecha: new Date(e.created_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
      total: e.puntuacion_total ?? 0,
      notaIB: e.nota_ib,
      A: e.banda_a,
      B: e.banda_b,
      C: e.banda_c,
      D: e.banda_d,
    }));

  return (
    <div className="space-y-5">
      {/* Puntuación global */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Puntuación global (0–20)
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={datos} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
              formatter={(v: number) => [`${v}/20`, "Puntuación"]}
            />
            <ReferenceLine
              y={13}
              stroke="#22c55e"
              strokeDasharray="4 3"
              label={{ value: "5 IB", fontSize: 9, fill: "#22c55e", position: "right" }}
            />
            <ReferenceLine
              y={16}
              stroke="#3b82f6"
              strokeDasharray="4 3"
              label={{ value: "6 IB", fontSize: 9, fill: "#3b82f6", position: "right" }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Criterios A–D */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Criterios A–D (0–5)
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={datos} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            {(["A", "B", "C", "D"] as const).map((l) => (
              <Line
                key={l}
                type="monotone"
                dataKey={l}
                stroke={COLORES_BANDA[l]}
                strokeWidth={1.8}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1.5">
          {(["A", "B", "C", "D"] as const).map((l) => (
            <div key={l} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="h-2 w-5 rounded-sm" style={{ backgroundColor: COLORES_BANDA[l] }} />
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
