import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TareaMin = {
  semana: number;
  completada: boolean | null;
};

export function GraficoPlan({ tareas }: { tareas: TareaMin[] }) {
  if (tareas.length === 0) return null;

  const porSemana = new Map<number, { total: number; completadas: number }>();
  for (const t of tareas) {
    if (!porSemana.has(t.semana)) porSemana.set(t.semana, { total: 0, completadas: 0 });
    const s = porSemana.get(t.semana)!;
    s.total++;
    if (t.completada) s.completadas++;
  }

  const datos = Array.from(porSemana.entries())
    .sort(([a], [b]) => a - b)
    .map(([semana, { total, completadas }]) => ({
      semana: `S${semana}`,
      pct: Math.round((completadas / total) * 100),
      completadas,
      total,
    }));

  const colorBarra = (pct: number) => {
    if (pct === 100) return "#22c55e";
    if (pct >= 50) return "hsl(var(--primary))";
    return "hsl(var(--border))";
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Progreso por semana
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={datos} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(
              value: number,
              _: string,
              props: { payload?: { completadas?: number; total?: number } },
            ) => [
              `${props.payload?.completadas ?? 0}/${props.payload?.total ?? 0} (${value}%)`,
              "Completado",
            ]}
          />
          <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
            {datos.map((d, i) => (
              <Cell key={i} fill={colorBarra(d.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1.5">
        {[
          { color: "#22c55e", label: "100%" },
          { color: "hsl(var(--primary))", label: "≥50%" },
          { color: "hsl(var(--border))", label: "<50%" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
