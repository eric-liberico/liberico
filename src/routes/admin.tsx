import { useCallback, useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import {
  Loader2,
  Users,
  Zap,
  DollarSign,
  Activity,
  TrendingUp,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

type Totales = {
  tokens_entrada: number;
  tokens_salida: number;
  tokens_total: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  peticiones: number;
  coste_usd: number;
  ahorro_cache_usd: number;
  usuarios_unicos: number;
  llamadas_fallidas: number;
};

type DiaStat = {
  dia: string;
  tokens: number;
  coste: number;
  peticiones: number;
  dau: number;
};

type FuncionStat = {
  tokens: number;
  coste: number;
  peticiones: number;
};

type TopUsuario = {
  user_id: string;
  email: string;
  tokens: number;
  coste: number;
  peticiones: number;
};

type MediasBandas = {
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  nota_ib: number;
};

type EvaluacionesMeta = {
  total: number;
  diarias: { dia: string; total: number }[];
  medias_bandas: MediasBandas | null;
  histograma_nota: Record<string, number>;
};

type Metricas = {
  totales: Totales;
  proyeccion_mensual_usd: number;
  por_modelo: Record<string, FuncionStat>;
  por_funcion: Record<string, FuncionStat>;
  top_usuarios: TopUsuario[];
  evolucion_diaria: DiaStat[];
  evaluaciones: EvaluacionesMeta;
};

const HOY = new Date().toISOString().slice(0, 10);
const HACE_30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function KpiCard({
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

function AdminDashboard() {
  const { user, rol, loading } = useAuth();
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState(HACE_30);
  const [hasta, setHasta] = useState(HOY);

  useEffect(() => {
    if (!loading && (!user || rol !== "admin")) {
      navigate({ to: "/" });
    }
  }, [user, rol, loading, navigate]);

  const cargarMetricas = useCallback(async () => {
    setCargando(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCargando(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("admin-get-metrics", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { desde, hasta },
    });

    if (error || data?.error) {
      toast.error(`Error al cargar métricas: ${data?.error ?? error?.message}`);
    } else {
      setMetricas(data as Metricas);
    }
    setCargando(false);
  }, [desde, hasta]);

  useEffect(() => {
    if (user && rol === "admin") {
      void cargarMetricas();
    }
  }, [user, rol, cargarMetricas]);

  if (loading || (!user && !loading)) return null;
  if (rol !== "admin") return null;

  const porFuncionArr = metricas
    ? Object.entries(metricas.por_funcion).map(([nombre, s]) => ({
        nombre: nombre.replace(/-/g, " "),
        peticiones: s.peticiones,
        tokens: s.tokens,
        coste: Math.round(s.coste * 10000) / 10000,
      }))
    : [];

  // Merge evolucion_diaria + evaluaciones_diarias into a single daily array for the combined chart
  const diarioCombinado = (() => {
    if (!metricas) return [];
    const map: Record<
      string,
      { dia: string; peticiones: number; dau: number; evaluaciones: number }
    > = {};
    for (const d of metricas.evolucion_diaria) {
      map[d.dia] = { dia: d.dia, peticiones: d.peticiones, dau: d.dau, evaluaciones: 0 };
    }
    for (const e of metricas.evaluaciones.diarias) {
      if (map[e.dia]) map[e.dia].evaluaciones = e.total;
      else map[e.dia] = { dia: e.dia, peticiones: 0, dau: 0, evaluaciones: e.total };
    }
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
  })();

  const histogramaArr = metricas
    ? Object.entries(metricas.evaluaciones.histograma_nota).map(([nota, total]) => ({
        nota: `Nota ${nota}`,
        total,
      }))
    : [];

  const mediasArr = metricas?.evaluaciones.medias_bandas
    ? [
        { criterio: "A", media: metricas.evaluaciones.medias_bandas.banda_a },
        { criterio: "B", media: metricas.evaluaciones.medias_bandas.banda_b },
        { criterio: "C", media: metricas.evaluaciones.medias_bandas.banda_c },
        { criterio: "D", media: metricas.evaluaciones.medias_bandas.banda_d },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-ink">Panel de administración</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de uso y coste del sistema
          </p>
        </div>
        <Link to="/admin-usuarios">
          <Button variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestionar usuarios
          </Button>
        </Link>
      </div>

      {/* Filtro de fechas */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="desde">Desde</Label>
              <Input
                id="desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hasta">Hasta</Label>
              <Input
                id="hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={cargarMetricas}
              disabled={cargando}
              className="flex items-center gap-2"
            >
              {cargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {cargando && !metricas ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : metricas ? (
        <>
          {/* KPIs — fila 1: uso IA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Peticiones IA"
              value={metricas.totales.peticiones.toLocaleString()}
              icon={Activity}
            />
            <KpiCard
              title="Tokens totales"
              value={metricas.totales.tokens_total.toLocaleString()}
              sub={`${metricas.totales.tokens_entrada.toLocaleString()} entrada · ${metricas.totales.tokens_salida.toLocaleString()} salida`}
              icon={Zap}
            />
            <KpiCard
              title="Coste real"
              value={`$${metricas.totales.coste_usd.toFixed(5)}`}
              sub={
                metricas.totales.ahorro_cache_usd > 0
                  ? `−$${metricas.totales.ahorro_cache_usd.toFixed(5)} ahorrado con caché`
                  : undefined
              }
              icon={DollarSign}
            />
            <KpiCard
              title="Prompt cache"
              value={metricas.totales.cache_read_tokens.toLocaleString()}
              sub={
                metricas.totales.tokens_total > 0
                  ? `${Math.round((metricas.totales.cache_read_tokens / metricas.totales.tokens_total) * 100)}% del total · ${metricas.totales.cache_creation_tokens.toLocaleString()} escritos`
                  : undefined
              }
              icon={Zap}
              accent="text-amber-600"
            />
          </div>

          {/* KPIs — fila 2: usuarios y evaluaciones */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Usuarios activos"
              value={metricas.totales.usuarios_unicos.toLocaleString()}
              sub="usuarios únicos en el período"
              icon={Users}
            />
            <KpiCard
              title="Evaluaciones"
              value={metricas.evaluaciones.total.toLocaleString()}
              sub={
                metricas.evaluaciones.medias_bandas
                  ? `Nota media: ${metricas.evaluaciones.medias_bandas.nota_ib}`
                  : undefined
              }
              icon={BookOpen}
            />
            <KpiCard
              title="Proyección mensual"
              value={`$${metricas.proyeccion_mensual_usd.toFixed(4)}`}
              sub="extrapolación lineal a 30 días"
              icon={TrendingUp}
            />
            <KpiCard
              title="Llamadas fallidas"
              value={metricas.totales.llamadas_fallidas.toLocaleString()}
              sub={
                metricas.totales.peticiones > 0
                  ? `${Math.round((metricas.totales.llamadas_fallidas / metricas.totales.peticiones) * 100)}% del total`
                  : undefined
              }
              icon={AlertCircle}
              accent={metricas.totales.llamadas_fallidas > 0 ? "text-destructive" : undefined}
            />
          </div>

          {/* Gráfico combinado: peticiones + DAU + evaluaciones */}
          {diarioCombinado.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actividad diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={diarioCombinado}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === "peticiones"
                          ? "Peticiones IA"
                          : name === "evaluaciones"
                            ? "Evaluaciones"
                            : "DAU",
                      ]}
                      labelFormatter={(label: string) => `Fecha: ${label}`}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="peticiones"
                      fill="hsl(var(--primary))"
                      name="peticiones"
                      radius={[2, 2, 0, 0]}
                      stackId="a"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="evaluaciones"
                      fill="hsl(var(--primary) / 0.4)"
                      name="evaluaciones"
                      radius={[2, 2, 0, 0]}
                      stackId="a"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="dau"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                      name="dau"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distribución de notas y medias de criterios */}
          {metricas.evaluaciones.total > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribución de notas IB</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={histogramaArr}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nota" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="total"
                        fill="hsl(var(--primary))"
                        name="Evaluaciones"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {mediasArr.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Media por criterio
                      {metricas.evaluaciones.medias_bandas && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          (nota media: {metricas.evaluaciones.medias_bandas.nota_ib}/7)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mediasArr} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="criterio" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v} / 5`, "Media"]} />
                        <Bar
                          dataKey="media"
                          fill="hsl(var(--primary) / 0.7)"
                          name="Media"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por función */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso por función</CardTitle>
              </CardHeader>
              <CardContent>
                {porFuncionArr.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {porFuncionArr
                      .sort((a, b) => b.peticiones - a.peticiones)
                      .map((f) => (
                        <div key={f.nombre} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs truncate max-w-[200px]">
                            {f.nombre}
                          </span>
                          <div className="flex gap-4 text-right text-muted-foreground shrink-0">
                            <span>{f.peticiones} req</span>
                            <span>{f.tokens.toLocaleString()} tok</span>
                            <span className="text-foreground font-medium">
                              ${f.coste.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top usuarios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top usuarios (por tokens)</CardTitle>
              </CardHeader>
              <CardContent>
                {metricas.top_usuarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {metricas.top_usuarios.slice(0, 10).map((u, i) => (
                      <div key={u.user_id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground shrink-0 w-5">{i + 1}.</span>
                        <span className="truncate flex-1 mx-2">{u.email}</span>
                        <div className="flex gap-4 text-right text-muted-foreground shrink-0">
                          <span>{u.peticiones} req</span>
                          <span>{u.tokens.toLocaleString()} tok</span>
                          <span className="text-foreground font-medium">${u.coste.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Por modelo */}
          {Object.keys(metricas.por_modelo).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso por modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metricas.por_modelo).map(([modelo, s]) => (
                    <div key={modelo} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{modelo}</span>
                      <div className="flex gap-4 text-right text-muted-foreground">
                        <span>{s.peticiones} req</span>
                        <span>{s.tokens.toLocaleString()} tok</span>
                        <span className="text-foreground font-medium">
                          ${(Math.round(s.coste * 10000) / 10000).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
    </div>
  );
}
