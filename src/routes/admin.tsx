import { useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
} from "recharts";
import { ArrowLeft, Loader2, Users, Zap, DollarSign, Activity } from "lucide-react";
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
};

type DiaStat = {
  dia: string;
  tokens: number;
  coste: number;
  peticiones: number;
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

type Metricas = {
  totales: Totales;
  por_modelo: Record<string, FuncionStat>;
  por_funcion: Record<string, FuncionStat>;
  top_usuarios: TopUsuario[];
  evolucion_diaria: DiaStat[];
};

const HOY = new Date().toISOString().slice(0, 10);
const HACE_30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

  const cargarMetricas = async () => {
    setCargando(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

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
  };

  useEffect(() => {
    if (user && rol === "admin") {
      void cargarMetricas();
    }
  }, [user, rol]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a inicio
          </Link>
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
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Peticiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metricas.totales.peticiones.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Tokens totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {metricas.totales.tokens_total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metricas.totales.tokens_entrada.toLocaleString()} entrada ·{" "}
                  {metricas.totales.tokens_salida.toLocaleString()} salida
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Coste real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${metricas.totales.coste_usd.toFixed(5)}</p>
                {metricas.totales.ahorro_cache_usd > 0 && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    −${metricas.totales.ahorro_cache_usd.toFixed(5)} ahorrado con caché
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Prompt cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {metricas.totales.cache_read_tokens.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  tokens leídos de caché
                  {metricas.totales.tokens_total > 0 && (
                    <span className="ml-1 text-amber-600 font-medium">
                      (
                      {Math.round(
                        (metricas.totales.cache_read_tokens / metricas.totales.tokens_total) * 100,
                      )}
                      %)
                    </span>
                  )}
                </p>
                {metricas.totales.cache_creation_tokens > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {metricas.totales.cache_creation_tokens.toLocaleString()} escritos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico evolución diaria */}
          {metricas.evolucion_diaria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolución diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={metricas.evolucion_diaria}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "tokens" ? value.toLocaleString() : value,
                        name === "tokens" ? "Tokens" : name === "peticiones" ? "Peticiones" : name,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="peticiones"
                      fill="hsl(var(--primary))"
                      name="Peticiones"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="tokens"
                      fill="hsl(var(--primary) / 0.35)"
                      name="Tokens"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
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
  );
}
