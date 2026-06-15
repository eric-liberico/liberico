import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Coins,
  DollarSign,
  Percent,
  TrendingUp,
  Users,
  Repeat,
  Filter,
} from "lucide-react";

// ── Tipos (espejo de las claves nuevas de admin-get-metrics) ──────────────────
export type IngresosSek = { creditos: number; bookings: number; total: number };
export type MargenGlobal = {
  ingresos_sek: number;
  coste_sek: number;
  margen_bruto_sek: number;
  margen_pct: number | null;
  arpu_sek: number;
  usuarios_pagadores: number;
};
export type MargenFeature = {
  feature: string;
  coste_sek: number;
  ingreso_sek: number;
  margen_sek: number;
  margen_pct: number | null;
  peticiones: number;
  coste_unitario: number;
  ingreso_unitario: number | null;
};
export type CursoStat = { tokens: number; coste_sek: number; peticiones: number };
export type Retencion = {
  dau_promedio: number;
  wau: number;
  mau: number;
  stickiness_pct: number | null;
};
export type Funnel = {
  altas: number;
  diagnostico: number;
  primera_actividad: number;
  primer_pago: number;
};

export type BusinessMetricsProps = {
  ingresos?: IngresosSek;
  margen?: MargenGlobal;
  margenPorFeature?: MargenFeature[];
  porCurso?: Record<string, CursoStat>;
  retencion?: Retencion;
  funnel?: Funnel;
  modelosSinPrecio?: string[];
};

// Etiquetas legibles para features y cursos.
const FEATURE_LABELS: Record<string, string> = {
  "p1-literature": "Lit · Paper 1",
  "p2-literature": "Lit · Paper 2",
  "oral-literature": "Lit · Oral",
  "oral-simulador": "Lit · Simulador oral",
  "paper1-b": "Spanish B · Paper 1",
  "paper2-b": "Spanish B · Paper 2",
  "oral-b-async": "Spanish B · Oral (asíncrono)",
  "oral-b-conversacional": "Spanish B · Oral conversacional",
  transcripcion: "Transcripción",
  "tts-listening": "TTS · Comprensión auditiva",
  "teacher-chat": "Chat docente",
  "plan-estudio": "Plan de estudio",
};
const CURSO_LABELS: Record<string, string> = {
  "spanish-a-literature": "Español A · Literatura",
  "english-a-literature": "English A · Literature",
  "spanish-b-language": "Spanish B · Language",
};

const sek = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
const sek3 = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kr`;
const labelFeature = (f: string) => FEATURE_LABELS[f] ?? f;
const labelCurso = (c: string) => CURSO_LABELS[c] ?? c;

function BizKpi({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle
          className={`text-sm font-medium text-muted-foreground flex items-center gap-2 ${accent ?? ""}`}
        >
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function BusinessMetrics({
  ingresos,
  margen,
  margenPorFeature,
  porCurso,
  retencion,
  funnel,
  modelosSinPrecio,
}: BusinessMetricsProps) {
  if (!margen || !ingresos) return null;

  const margenPositivo = margen.margen_bruto_sek >= 0;
  const cursos = Object.entries(porCurso ?? {}).sort((a, b) => b[1].coste_sek - a[1].coste_sek);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-serif font-semibold text-ink">Negocio · Unit economics</h2>
        <p className="text-sm text-muted-foreground">
          Ingresos vs coste IA en el período seleccionado. Cifras en SEK (1 crédito = 1 € = 10 SEK;
          coste IA convertido de USD con tasa estimada) — margen orientativo, no contable.
        </p>
      </div>

      {/* Aviso: modelos sin precio (coste invisible) */}
      {modelosSinPrecio && modelosSinPrecio.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>Coste sin estimar</strong> para {modelosSinPrecio.length} modelo(s):{" "}
            {modelosSinPrecio.join(", ")}. Su coste se cuenta como 0 kr — añade su precio en{" "}
            <code>llm_precios</code> para que el margen sea fiable.
          </span>
        </div>
      )}

      {/* KPIs de negocio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BizKpi
          title="Ingresos"
          value={sek(ingresos.total)}
          sub={`${sek(ingresos.creditos)} créditos · ${sek(ingresos.bookings)} reservas`}
          icon={Coins}
          accent="text-emerald-600"
        />
        <BizKpi
          title="Coste IA"
          value={sek(margen.coste_sek)}
          sub="convertido de USD"
          icon={DollarSign}
        />
        <BizKpi
          title="Margen bruto"
          value={sek(margen.margen_bruto_sek)}
          sub={margen.margen_pct !== null ? `${margen.margen_pct}% sobre ingresos` : "sin ingresos"}
          icon={Percent}
          accent={margenPositivo ? "text-emerald-600" : "text-red-600"}
        />
        <BizKpi
          title="ARPU"
          value={sek(margen.arpu_sek)}
          sub={`${margen.usuarios_pagadores} usuarios pagadores`}
          icon={TrendingUp}
        />
      </div>

      {/* Margen por feature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Coste vs ingreso por feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!margenPorFeature || margenPorFeature.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Feature</th>
                    <th className="py-2 px-3 text-right">Peticiones</th>
                    <th className="py-2 px-3 text-right">Coste/ud</th>
                    <th className="py-2 px-3 text-right">Ingreso/ud</th>
                    <th className="py-2 px-3 text-right">Coste</th>
                    <th className="py-2 px-3 text-right">Ingreso</th>
                    <th className="py-2 pl-3 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {margenPorFeature.map((f) => {
                    const neg = f.margen_sek < 0;
                    return (
                      <tr key={f.feature} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{labelFeature(f.feature)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {f.peticiones.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {sek3(f.coste_unitario)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {f.ingreso_unitario !== null ? sek3(f.ingreso_unitario) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{sek(f.coste_sek)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{sek(f.ingreso_sek)}</td>
                        <td
                          className={`py-2 pl-3 text-right tabular-nums font-medium ${neg ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {sek(f.margen_sek)}
                          {f.margen_pct !== null && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({f.margen_pct}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Coste e ingreso se agrupan por producto lógico; una venta puede abarcar varias
                llamadas. El feedback/transcripción del oral conversacional puede contabilizarse en
                otra fila hasta registrar la duración real de sesión.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por curso + retención/embudo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coste por asignatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cursos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3">Asignatura</th>
                      <th className="py-2 px-3 text-right">Peticiones</th>
                      <th className="py-2 px-3 text-right">Tokens</th>
                      <th className="py-2 pl-3 text-right">Coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.map(([curso, s]) => (
                      <tr key={curso} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{labelCurso(curso)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.peticiones.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {s.tokens.toLocaleString()}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums">{sek(s.coste_sek)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {retencion && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Retención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-muted-foreground">DAU medio</span>
                  <span className="text-right tabular-nums font-medium">
                    {retencion.dau_promedio}
                  </span>
                  <span className="text-muted-foreground">WAU (7 días)</span>
                  <span className="text-right tabular-nums font-medium">{retencion.wau}</span>
                  <span className="text-muted-foreground">MAU (período)</span>
                  <span className="text-right tabular-nums font-medium">{retencion.mau}</span>
                  <span className="text-muted-foreground">Stickiness</span>
                  <span className="text-right tabular-nums font-medium">
                    {retencion.stickiness_pct !== null ? `${retencion.stickiness_pct}%` : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {funnel && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Embudo (altas del período)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {(
                    [
                      ["Altas", funnel.altas, Users],
                      ["Diagnóstico completado", funnel.diagnostico, undefined],
                      ["1ª actividad", funnel.primera_actividad, undefined],
                      ["1er pago", funnel.primer_pago, undefined],
                    ] as [string, number, React.ElementType | undefined][]
                  ).map(([etiqueta, valor]) => {
                    const pct = funnel.altas > 0 ? Math.round((valor / funnel.altas) * 100) : 0;
                    return (
                      <div key={etiqueta}>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{etiqueta}</span>
                          <span className="tabular-nums font-medium">
                            {valor} <span className="text-xs text-muted-foreground">({pct}%)</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded bg-muted">
                          <div
                            className="h-1.5 rounded bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
