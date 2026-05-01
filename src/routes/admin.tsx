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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye,
  EyeOff,
  Library,
  Loader2,
  PlusCircle,
  Trash2,
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

type TextoPractica = {
  id: string;
  genero: "poema" | "prosa" | "teatro";
  periodo: string | null;
  texto: string;
  pregunta: string;
  activo: boolean;
  created_at: string;
};

const HOY = new Date().toISOString().slice(0, 10);
const HACE_30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const CORRECTORES_COSTE = [
  {
    key: "evaluate-analysis",
    titulo: "Prueba 1",
    detalle: "Análisis literario",
  },
  {
    key: "evaluate-paper2",
    titulo: "Prueba 2",
    detalle: "Ensayo comparativo",
  },
  {
    key: "evaluate-oral",
    titulo: "Oral",
    detalle: "Trabajo oral individual",
  },
] as const;

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

  // Biblioteca P1
  const [textos, setTextos] = useState<TextoPractica[]>([]);
  const [cargandoTextos, setCargandoTextos] = useState(false);
  const [generoNuevo, setGeneroNuevo] = useState<"poema" | "prosa" | "teatro">("poema");
  const [periodoNuevo, setPeriodoNuevo] = useState("");
  const [instruccionesNuevo, setInstruccionesNuevo] = useState("");
  const [generandoTexto, setGenerandoTexto] = useState(false);

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

  const cargarTextos = useCallback(async () => {
    setCargandoTextos(true);
    const { data, error } = await supabase
      .from("textos_practica_p1")
      .select("id, genero, periodo, texto, pregunta, activo, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No se pudieron cargar los textos de práctica.");
    } else {
      setTextos((data as TextoPractica[]) ?? []);
    }
    setCargandoTextos(false);
  }, []);

  useEffect(() => {
    if (user && rol === "admin") void cargarTextos();
  }, [user, rol, cargarTextos]);

  const generarTexto = async () => {
    setGenerandoTexto(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-practice-text", {
        body: {
          genero: generoNuevo,
          periodo: periodoNuevo.trim() || undefined,
          instrucciones: instruccionesNuevo.trim() || undefined,
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success("Texto generado y guardado en la biblioteca.");
      setPeriodoNuevo("");
      setInstruccionesNuevo("");
      await cargarTextos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar el texto.");
    } finally {
      setGenerandoTexto(false);
    }
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    const { error } = await supabase
      .from("textos_practica_p1")
      .update({ activo: !activo })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo cambiar el estado del texto.");
    } else {
      setTextos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: !activo } : t)));
    }
  };

  const eliminarTexto = async (id: string) => {
    const { error } = await supabase.from("textos_practica_p1").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar el texto.");
    } else {
      setTextos((prev) => prev.filter((t) => t.id !== id));
      toast.success("Texto eliminado.");
    }
  };

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

  const costeCorrectoresArr = metricas
    ? CORRECTORES_COSTE.map((cfg) => {
        const stats = metricas.por_funcion[cfg.key] ?? {
          tokens: 0,
          coste: 0,
          peticiones: 0,
        };
        return {
          ...cfg,
          tokens: stats.tokens,
          coste: stats.coste,
          peticiones: stats.peticiones,
          costeMedio: stats.peticiones > 0 ? stats.coste / stats.peticiones : 0,
        };
      }).filter((row) => row.peticiones > 0)
    : [];

  const totalCosteCorrectores = costeCorrectoresArr.reduce((s, row) => s + row.coste, 0);
  const totalPeticionesCorrectores = costeCorrectoresArr.reduce((s, row) => s + row.peticiones, 0);
  const costeMedioCorrector =
    totalPeticionesCorrectores > 0 ? totalCosteCorrectores / totalPeticionesCorrectores : 0;
  const maxCosteCorrector = Math.max(...costeCorrectoresArr.map((row) => row.coste), 0);

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

            {/* Coste por corrector */}
            {costeCorrectoresArr.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <span>Coste por corrección</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ${totalCosteCorrectores.toFixed(5)} total · ${costeMedioCorrector.toFixed(5)}{" "}
                      de media
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {costeCorrectoresArr
                      .sort((a, b) => b.coste - a.coste)
                      .map((row) => {
                        const porcentaje =
                          maxCosteCorrector > 0
                            ? Math.max(4, (row.coste / maxCosteCorrector) * 100)
                            : 0;
                        return (
                          <div key={row.key} className="space-y-1.5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                              <div>
                                <span className="font-medium">{row.titulo}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {row.detalle}
                                </span>
                              </div>
                              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>{row.peticiones} correcciones</span>
                                <span>{row.tokens.toLocaleString()} tok</span>
                                <span className="text-foreground font-medium">
                                  ${row.coste.toFixed(5)}
                                </span>
                                <span className="text-foreground/70">
                                  ${row.costeMedio.toFixed(5)}/corrección
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

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
                        <BarChart
                          data={mediasArr}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
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
                        .map((f) => {
                          const costePorReq = f.peticiones > 0 ? f.coste / f.peticiones : 0;
                          return (
                            <div
                              key={f.nombre}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="font-mono text-xs truncate max-w-[180px]">
                                {f.nombre}
                              </span>
                              <div className="flex gap-3 text-right text-muted-foreground shrink-0">
                                <span>{f.peticiones} req</span>
                                <span>{f.tokens.toLocaleString()} tok</span>
                                <span
                                  className="text-foreground/60 text-xs"
                                  title="Coste medio por llamada"
                                >
                                  ${costePorReq.toFixed(5)}/req
                                </span>
                                <span className="text-foreground font-medium">
                                  ${f.coste.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
                            <span className="text-foreground font-medium">
                              ${u.coste.toFixed(4)}
                            </span>
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

        {/* ── Biblioteca P1 ────────────────────────────────────────────────── */}
        <div className="border-t border-border pt-8 space-y-6">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-serif font-semibold text-ink">Biblioteca P1</h2>
            <span className="text-sm text-muted-foreground">
              ({textos.filter((t) => t.activo).length} activos · {textos.length} total)
            </span>
          </div>

          {/* Formulario de generación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Generar nuevo texto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Género</Label>
                  <Select
                    value={generoNuevo}
                    onValueChange={(v) => setGeneroNuevo(v as typeof generoNuevo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poema">Poema</SelectItem>
                      <SelectItem value="prosa">Prosa</SelectItem>
                      <SelectItem value="teatro">Teatro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="periodo-nuevo" className="text-xs">
                    Período literario <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="periodo-nuevo"
                    value={periodoNuevo}
                    onChange={(e) => setPeriodoNuevo(e.target.value)}
                    placeholder="Ej.: Modernismo, Romanticismo, Boom latinoamericano…"
                    disabled={generandoTexto}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instrucciones-nuevo" className="text-xs">
                  Instrucciones adicionales{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="instrucciones-nuevo"
                  value={instruccionesNuevo}
                  onChange={(e) => setInstruccionesNuevo(e.target.value)}
                  placeholder="Ej.: Tema de la memoria, voz femenina, ambientación urbana…"
                  rows={2}
                  disabled={generandoTexto}
                  className="resize-none text-sm"
                />
              </div>
              <Button onClick={generarTexto} disabled={generandoTexto} className="gap-2">
                {generandoTexto ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Generar texto
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Lista de textos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Textos en la biblioteca</span>
                {cargandoTextos && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {textos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay textos todavía. Genera el primero con el formulario de arriba.
                </p>
              ) : (
                <div className="space-y-3">
                  {textos.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-lg border p-4 space-y-2 transition-opacity ${t.activo ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="capitalize text-xs">
                            {t.genero}
                          </Badge>
                          {t.periodo && (
                            <span className="text-[11px] text-muted-foreground">{t.periodo}</span>
                          )}
                          {!t.activo && (
                            <Badge variant="secondary" className="text-xs">
                              oculto
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={
                              t.activo ? "Ocultar de la biblioteca" : "Mostrar en la biblioteca"
                            }
                            onClick={() => toggleActivo(t.id, t.activo)}
                          >
                            {t.activo ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Eliminar texto permanentemente"
                            onClick={() => eliminarTexto(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/70 font-serif leading-relaxed line-clamp-3 whitespace-pre-line">
                        {t.texto}
                      </p>
                      <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                        <span className="font-medium">Pregunta: </span>
                        {t.pregunta}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
