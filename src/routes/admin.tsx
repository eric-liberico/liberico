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
import {
  TEXT_TYPE_LABELS,
  THEME_LABELS,
  type TextTypeP1B,
  type ThemeP1B,
} from "@/lib/criteria/spanish-b-language";

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
  ultima_actividad: string;
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

type FeatureStat = {
  feature: string;
  started: number;
  completed: number;
  total: number;
  tasa_completado: number | null;
};

type Metricas = {
  totales: Totales;
  proyeccion_mensual_usd: number;
  por_modelo: Record<string, FuncionStat>;
  por_funcion: Record<string, FuncionStat>;
  top_usuarios: TopUsuario[];
  evolucion_diaria: DiaStat[];
  evaluaciones: EvaluacionesMeta;
  feature_events: { total: number; por_feature: FeatureStat[] };
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

type PromptB = {
  id: string;
  text_type: TextTypeP1B;
  theme: ThemeP1B;
  nivel: string;
  title_es: string;
  title_en: string;
  context_es: string;
  context_en: string;
  activo: boolean;
  created_at: string;
};

type OralStimulusB = {
  id: string;
  theme: ThemeP1B;
  image_url: string | null;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  activo: boolean;
  created_at: string;
};

type TextoP2B = {
  id: string;
  theme: ThemeP1B;
  title_es: string;
  title_en: string;
  text_es: string;
  source: string | null;
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

  // Spanish B — catálogo de estímulos Paper 1
  const [promptsB, setPromptsB] = useState<PromptB[]>([]);
  const [cargandoPromptsB, setCargandoPromptsB] = useState(false);
  const [guardandoPromptB, setGuardandoPromptB] = useState(false);
  const [newB, setNewB] = useState({
    text_type: "blog" as TextTypeP1B,
    theme: "experiencias" as ThemeP1B,
    title_es: "",
    title_en: "",
    context_es: "",
    context_en: "",
  });

  // Spanish B — estímulos Oral
  const [oralStimuli, setOralStimuli] = useState<OralStimulusB[]>([]);
  const [cargandoOral, setCargandoOral] = useState(false);
  const [guardandoOral, setGuardandoOral] = useState(false);
  const [newOral, setNewOral] = useState({
    theme: "experiencias" as ThemeP1B,
    image_url: "",
    title_es: "",
    title_en: "",
    description_es: "",
    description_en: "",
  });

  // Gestión de créditos
  const [creditosBuscarEmail, setCreditosBuscarEmail] = useState("");
  const [creditosUsuario, setCreditosUsuario] = useState<{ user_id: string; email: string; creditos: number } | null>(null);
  const [creditosCantidad, setCreditosCantidad] = useState(0);
  const [creditosRazon, setCreditosRazon] = useState("");
  const [creditosAjustando, setCreditosAjustando] = useState(false);

  // Spanish B — textos Lectura (Paper 2)
  const [textosP2, setTextosP2] = useState<TextoP2B[]>([]);
  const [cargandoP2, setCargandoP2] = useState(false);
  const [guardandoP2, setGuardandoP2] = useState(false);
  const [newP2, setNewP2] = useState({
    theme: "experiencias" as ThemeP1B,
    title_es: "",
    title_en: "",
    text_es: "",
    source: "",
  });

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

  const cargarPromptsB = useCallback(async () => {
    setCargandoPromptsB(true);
    const { data, error } = await supabase
      .from("prompts_paper1_b")
      .select("id,text_type,theme,nivel,title_es,title_en,context_es,context_en,activo,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("No se pudieron cargar los estímulos de Spanish B.");
    } else {
      setPromptsB((data as PromptB[]) ?? []);
    }
    setCargandoPromptsB(false);
  }, []);

  useEffect(() => {
    if (user && rol === "admin") void cargarPromptsB();
  }, [user, rol, cargarPromptsB]);

  const crearPromptB = async () => {
    if (!newB.title_en.trim() || !newB.context_en.trim()) {
      toast.error("Title (EN) y Context (EN) son obligatorios.");
      return;
    }
    setGuardandoPromptB(true);
    const { error } = await supabase.from("prompts_paper1_b").insert({
      text_type: newB.text_type,
      theme: newB.theme,
      nivel: "SL",
      title_es: newB.title_es.trim() || newB.title_en.trim(),
      title_en: newB.title_en.trim(),
      context_es: newB.context_es.trim() || newB.context_en.trim(),
      context_en: newB.context_en.trim(),
      activo: false,
    });
    setGuardandoPromptB(false);
    if (error) {
      toast.error("Error al crear el estímulo.");
    } else {
      toast.success("Estímulo creado (inactivo). Actívalo cuando esté revisado.");
      setNewB({
        text_type: "blog",
        theme: "experiencias",
        title_es: "",
        title_en: "",
        context_es: "",
        context_en: "",
      });
      void cargarPromptsB();
    }
  };

  const toggleActivoPromptB = async (id: string, activo: boolean) => {
    const { error } = await supabase
      .from("prompts_paper1_b")
      .update({ activo: !activo })
      .eq("id", id);
    if (error) {
      toast.error("Error al cambiar visibilidad.");
    } else {
      setPromptsB((prev) => prev.map((p) => (p.id === id ? { ...p, activo: !activo } : p)));
    }
  };

  const eliminarPromptB = async (id: string) => {
    if (!confirm("¿Eliminar este estímulo permanentemente?")) return;
    const { error } = await supabase.from("prompts_paper1_b").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar el estímulo.");
    } else {
      setPromptsB((prev) => prev.filter((p) => p.id !== id));
      toast.success("Estímulo eliminado.");
    }
  };

  // ── Oral stimuli CRUD ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const cargarOralStimuli = useCallback(async () => {
    setCargandoOral(true);
    const { data, error } = await db
      .from("prompts_oral_b")
      .select(
        "id,theme,image_url,title_es,title_en,description_es,description_en,activo,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar los estímulos del oral.");
    else setOralStimuli((data as OralStimulusB[]) ?? []);
    setCargandoOral(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && rol === "admin") void cargarOralStimuli();
  }, [user, rol, cargarOralStimuli]);

  const crearOralStimulus = async () => {
    if (!newOral.title_en.trim() || !newOral.description_en.trim()) {
      toast.error("Title (EN) y Description (EN) son obligatorios.");
      return;
    }
    setGuardandoOral(true);
    const { error } = await db.from("prompts_oral_b").insert({
      theme: newOral.theme,
      image_url: newOral.image_url.trim() || null,
      title_es: newOral.title_es.trim() || newOral.title_en.trim(),
      title_en: newOral.title_en.trim(),
      description_es: newOral.description_es.trim() || newOral.description_en.trim(),
      description_en: newOral.description_en.trim(),
      activo: false,
    });
    setGuardandoOral(false);
    if (error) {
      toast.error("Error al crear el estímulo oral.");
    } else {
      toast.success("Estímulo oral creado (inactivo).");
      setNewOral({
        theme: "experiencias",
        image_url: "",
        title_es: "",
        title_en: "",
        description_es: "",
        description_en: "",
      });
      void cargarOralStimuli();
    }
  };

  const toggleActivoOral = async (id: string, activo: boolean) => {
    const { error } = await db.from("prompts_oral_b").update({ activo: !activo }).eq("id", id);
    if (error) toast.error("Error al cambiar visibilidad.");
    else setOralStimuli((prev) => prev.map((s) => (s.id === id ? { ...s, activo: !activo } : s)));
  };

  const eliminarOralStimulus = async (id: string) => {
    if (!confirm("¿Eliminar este estímulo permanentemente?")) return;
    const { error } = await db.from("prompts_oral_b").delete().eq("id", id);
    if (error) toast.error("Error al eliminar el estímulo.");
    else {
      setOralStimuli((prev) => prev.filter((s) => s.id !== id));
      toast.success("Estímulo eliminado.");
    }
  };

  // ── Textos Paper 2 CRUD ────────────────────────────────────────────────────

  const cargarTextosP2 = useCallback(async () => {
    setCargandoP2(true);
    const { data, error } = await db
      .from("textos_paper2_b")
      .select("id,theme,title_es,title_en,text_es,source,activo,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar los textos de lectura.");
    else setTextosP2((data as TextoP2B[]) ?? []);
    setCargandoP2(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && rol === "admin") void cargarTextosP2();
  }, [user, rol, cargarTextosP2]);

  const crearTextoP2 = async () => {
    if (!newP2.title_en.trim() || !newP2.text_es.trim()) {
      toast.error("Title (EN) y Texto ES son obligatorios.");
      return;
    }
    setGuardandoP2(true);
    const { error } = await db.from("textos_paper2_b").insert({
      theme: newP2.theme,
      title_es: newP2.title_es.trim() || newP2.title_en.trim(),
      title_en: newP2.title_en.trim(),
      text_es: newP2.text_es.trim(),
      source: newP2.source.trim() || null,
      word_count: newP2.text_es.trim().split(/\s+/).filter(Boolean).length,
      activo: false,
    });
    setGuardandoP2(false);
    if (error) {
      toast.error("Error al crear el texto de lectura.");
    } else {
      toast.success("Texto de lectura creado (inactivo).");
      setNewP2({ theme: "experiencias", title_es: "", title_en: "", text_es: "", source: "" });
      void cargarTextosP2();
    }
  };

  const toggleActivoP2 = async (id: string, activo: boolean) => {
    const { error } = await db.from("textos_paper2_b").update({ activo: !activo }).eq("id", id);
    if (error) toast.error("Error al cambiar visibilidad.");
    else setTextosP2((prev) => prev.map((t) => (t.id === id ? { ...t, activo: !activo } : t)));
  };

  const eliminarTextoP2 = async (id: string) => {
    if (!confirm("¿Eliminar este texto permanentemente?")) return;
    const { error } = await db.from("textos_paper2_b").delete().eq("id", id);
    if (error) toast.error("Error al eliminar el texto.");
    else {
      setTextosP2((prev) => prev.filter((t) => t.id !== id));
      toast.success("Texto eliminado.");
    }
  };

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

  const UMBRAL_COSTE_ALTO = 0.1;
  const usuariosMasCaro = metricas
    ? [...metricas.top_usuarios].sort((a, b) => b.coste - a.coste)
    : [];
  const costeMedioUsuario =
    metricas && metricas.totales.usuarios_unicos > 0
      ? metricas.totales.coste_usd / metricas.totales.usuarios_unicos
      : 0;

  const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  const buscarUsuarioCreditos = async () => {
    if (!creditosBuscarEmail.trim()) return;
    const { data, error } = await supabase
      .from("perfiles")
      .select("user_id, email, creditos")
      .eq("email", creditosBuscarEmail.trim().toLowerCase())
      .maybeSingle();
    if (error || !data) {
      toast.error("Usuario no encontrado.");
      setCreditosUsuario(null);
      return;
    }
    setCreditosUsuario({ user_id: data.user_id, email: data.email ?? "", creditos: data.creditos ?? 0 });
  };

  const ajustarCreditosAdmin = async () => {
    if (!creditosUsuario || creditosCantidad === 0) return;
    if (!creditosRazon.trim()) { toast.error("Indica una razón para el ajuste."); return; }
    setCreditosAjustando(true);
    try {
      const { data: nuevoSaldo, error } = await supabase.rpc("ajustar_creditos_admin", {
        p_admin_id: user!.id,
        p_user_id: creditosUsuario.user_id,
        p_cantidad: creditosCantidad,
        p_razon: creditosRazon.trim(),
      });
      if (error) throw error;
      toast.success(`Saldo ajustado. Nuevo saldo: ${(nuevoSaldo as number).toFixed(1)} créditos.`);
      setCreditosUsuario({ ...creditosUsuario, creditos: nuevoSaldo as number });
      setCreditosCantidad(0);
      setCreditosRazon("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ajustar créditos.");
    } finally {
      setCreditosAjustando(false);
    }
  };

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

        {/* ── Eventos por funcionalidad ───────────────────────────────────── */}
        {metricas && metricas.feature_events && (
          <div className="border-t border-border pt-8 space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-serif font-semibold text-ink">
                Eventos por funcionalidad
              </h2>
              {metricas.feature_events.total === 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  sin datos — tabla nueva
                </span>
              )}
            </div>

            {metricas.feature_events.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                Los eventos se registran a partir de ahora. Vuelve en unos días para ver la
                adopción por funcionalidad.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    title="Eventos totales"
                    value={metricas.feature_events.total.toLocaleString()}
                    sub="en el período seleccionado"
                    icon={Activity}
                  />
                  <KpiCard
                    title="Funcionalidades activas"
                    value={metricas.feature_events.por_feature.length.toString()}
                    sub="con al menos 1 evento"
                    icon={BookOpen}
                  />
                  <KpiCard
                    title="Evaluaciones iniciadas"
                    value={metricas.feature_events.por_feature
                      .reduce((s, f) => s + f.started, 0)
                      .toLocaleString()}
                    sub="evaluation_started"
                    icon={TrendingUp}
                  />
                  <KpiCard
                    title="Tasa de completado"
                    value={(() => {
                      const started = metricas.feature_events.por_feature.reduce(
                        (s, f) => s + f.started,
                        0,
                      );
                      const completed = metricas.feature_events.por_feature.reduce(
                        (s, f) => s + f.completed,
                        0,
                      );
                      return started > 0 ? `${Math.round((completed / started) * 100)}%` : "—";
                    })()}
                    sub="completadas / iniciadas"
                    icon={DollarSign}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Uso por funcionalidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metricas.feature_events.por_feature.map((f) => {
                        const maxTotal = Math.max(
                          ...metricas.feature_events.por_feature.map((x) => x.total),
                          1,
                        );
                        return (
                          <div key={f.feature} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-mono text-xs">{f.feature}</span>
                              <div className="flex gap-4 text-right text-muted-foreground shrink-0">
                                <span>{f.started} inicio</span>
                                <span>{f.completed} completado</span>
                                <span className="text-foreground font-medium">
                                  {f.tasa_completado !== null ? `${f.tasa_completado}%` : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{ width: `${Math.round((f.total / maxTotal) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Intensidad y coste por usuario ──────────────────────────────── */}
        {metricas && metricas.top_usuarios.length > 0 && (
          <div className="border-t border-border pt-8 space-y-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-serif font-semibold text-ink">
                Intensidad por usuario
              </h2>
              <span className="text-sm text-muted-foreground">
                ({metricas.totales.usuarios_unicos} usuarios · período seleccionado)
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Usuarios activos"
                value={metricas.totales.usuarios_unicos.toString()}
                sub="con al menos 1 llamada IA"
                icon={Users}
              />
              <KpiCard
                title="Coste total período"
                value={`$${metricas.totales.coste_usd.toFixed(4)}`}
                sub="coste IA agregado"
                icon={DollarSign}
              />
              <KpiCard
                title="Coste medio / usuario"
                value={`$${costeMedioUsuario.toFixed(4)}`}
                sub="sobre usuarios activos"
                icon={TrendingUp}
              />
              <KpiCard
                title="Usuario más caro"
                value={`$${(usuariosMasCaro[0]?.coste ?? 0).toFixed(4)}`}
                sub={usuariosMasCaro[0]?.email ?? "—"}
                icon={AlertCircle}
                accent={
                  (usuariosMasCaro[0]?.coste ?? 0) > UMBRAL_COSTE_ALTO
                    ? "text-destructive"
                    : undefined
                }
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Todos los usuarios activos ({metricas.top_usuarios.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usuariosMasCaro.map((u, i) => (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <span className="text-muted-foreground shrink-0 w-5">{i + 1}.</span>
                      <span className="truncate flex-1 min-w-0">{u.email}</span>
                      <div className="flex items-center gap-3 text-right text-muted-foreground shrink-0">
                        <span className="hidden sm:inline">{u.peticiones} req</span>
                        <span className="hidden sm:inline">
                          {u.tokens.toLocaleString()} tok
                        </span>
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          últ. {fmtFecha(u.ultima_actividad)}
                        </span>
                        <span
                          className={`font-medium tabular-nums ${u.coste > UMBRAL_COSTE_ALTO ? "text-destructive" : "text-foreground"}`}
                        >
                          ${u.coste.toFixed(4)}
                        </span>
                        {u.coste > UMBRAL_COSTE_ALTO && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            alto
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* ── Spanish B — Catálogo de estímulos Paper 1 ─────────────────────── */}
        <div className="border-t border-border pt-8 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-serif font-semibold text-ink">
              Spanish B · Estímulos Paper 1
            </h2>
            <span className="text-sm text-muted-foreground">
              ({promptsB.filter((p) => p.activo).length} activos · {promptsB.length} total)
            </span>
            {cargandoPromptsB && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {/* Formulario de creación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Crear nuevo estímulo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de texto</Label>
                  <Select
                    value={newB.text_type}
                    onValueChange={(v) => setNewB((s) => ({ ...s, text_type: v as TextTypeP1B }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TEXT_TYPE_LABELS) as TextTypeP1B[]).map((tt) => (
                        <SelectItem key={tt} value={tt}>
                          {TEXT_TYPE_LABELS[tt].en} / {TEXT_TYPE_LABELS[tt].es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tema</Label>
                  <Select
                    value={newB.theme}
                    onValueChange={(v) => setNewB((s) => ({ ...s, theme: v as ThemeP1B }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(THEME_LABELS) as ThemeP1B[]).map((th) => (
                        <SelectItem key={th} value={th}>
                          {THEME_LABELS[th].en} / {THEME_LABELS[th].es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="b-title-en" className="text-xs">
                    Título EN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="b-title-en"
                    value={newB.title_en}
                    onChange={(e) => setNewB((s) => ({ ...s, title_en: e.target.value }))}
                    placeholder="An unforgettable experience"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b-title-es" className="text-xs">
                    Título ES <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="b-title-es"
                    value={newB.title_es}
                    onChange={(e) => setNewB((s) => ({ ...s, title_es: e.target.value }))}
                    placeholder="Una experiencia inolvidable"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-context-en" className="text-xs">
                  Estímulo EN <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="b-context-en"
                  value={newB.context_en}
                  onChange={(e) => setNewB((s) => ({ ...s, context_en: e.target.value }))}
                  placeholder="Audience, purpose, instructions for the student (250–400 words, SL)…"
                  rows={4}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-context-es" className="text-xs">
                  Estímulo ES{" "}
                  <span className="text-muted-foreground">
                    (opcional, se usa si el alumno pone UI en español)
                  </span>
                </Label>
                <Textarea
                  id="b-context-es"
                  value={newB.context_es}
                  onChange={(e) => setNewB((s) => ({ ...s, context_es: e.target.value }))}
                  placeholder="Audiencia, propósito, instrucciones (250–400 palabras, SL)…"
                  rows={4}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Los estímulos se crean <strong>inactivos</strong>. Actívalos una vez revisados.
              </p>
              <Button onClick={crearPromptB} disabled={guardandoPromptB} className="gap-2">
                {guardandoPromptB ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Crear estímulo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Lista de estímulos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estímulos en el catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promptsB.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay estímulos todavía. Crea el primero con el formulario de arriba.
                </p>
              ) : (
                <div className="space-y-3">
                  {promptsB.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-4 space-y-2 transition-opacity ${p.activo ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {TEXT_TYPE_LABELS[p.text_type]?.en ?? p.text_type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {THEME_LABELS[p.theme]?.en ?? p.theme}
                          </Badge>
                          {!p.activo && (
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
                            title={p.activo ? "Ocultar" : "Activar"}
                            onClick={() => toggleActivoPromptB(p.id, p.activo)}
                          >
                            {p.activo ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Eliminar permanentemente"
                            onClick={() => eliminarPromptB(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{p.title_en}</p>
                      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">
                        {p.context_en}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Spanish B — Estímulos Oral ────────────────────────────────────── */}
        <div className="border-t border-border pt-8 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-serif font-semibold text-ink">
              Spanish B · Estímulos Oral
            </h2>
            <span className="text-sm text-muted-foreground">
              ({oralStimuli.filter((s) => s.activo).length} activos · {oralStimuli.length} total)
            </span>
            {cargandoOral && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Crear nuevo estímulo visual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tema</Label>
                  <Select
                    value={newOral.theme}
                    onValueChange={(v) => setNewOral((s) => ({ ...s, theme: v as ThemeP1B }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(THEME_LABELS) as ThemeP1B[]).map((th) => (
                        <SelectItem key={th} value={th}>
                          {THEME_LABELS[th].en} / {THEME_LABELS[th].es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL imagen (opcional)</Label>
                  <Input
                    value={newOral.image_url}
                    onChange={(e) => setNewOral((s) => ({ ...s, image_url: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Título EN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newOral.title_en}
                    onChange={(e) => setNewOral((s) => ({ ...s, title_en: e.target.value }))}
                    placeholder="Urban mobility"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título ES</Label>
                  <Input
                    value={newOral.title_es}
                    onChange={(e) => setNewOral((s) => ({ ...s, title_es: e.target.value }))}
                    placeholder="Movilidad urbana"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Descripción EN <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={newOral.description_en}
                  onChange={(e) => setNewOral((s) => ({ ...s, description_en: e.target.value }))}
                  placeholder="Describe what the image shows and how it connects to the theme…"
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción ES</Label>
                <Textarea
                  value={newOral.description_es}
                  onChange={(e) => setNewOral((s) => ({ ...s, description_es: e.target.value }))}
                  placeholder="Describe lo que muestra la imagen y cómo se relaciona con el tema…"
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button onClick={crearOralStimulus} disabled={guardandoOral} className="gap-2">
                {guardandoOral ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Crear estímulo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estímulos en el catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oralStimuli.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay estímulos todavía.
                </p>
              ) : (
                <div className="space-y-3">
                  {oralStimuli.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-4 space-y-2 transition-opacity ${s.activo ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {THEME_LABELS[s.theme]?.en ?? s.theme}
                          </Badge>
                          {!s.activo && (
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
                            title={s.activo ? "Ocultar" : "Activar"}
                            onClick={() => toggleActivoOral(s.id, s.activo)}
                          >
                            {s.activo ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Eliminar"
                            onClick={() => eliminarOralStimulus(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{s.title_en}</p>
                      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
                        {s.description_en}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Spanish B — Textos Lectura (Paper 2) ─────────────────────────── */}
        <div className="border-t border-border pt-8 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-serif font-semibold text-ink">
              Spanish B · Textos Lectura (Paper 2)
            </h2>
            <span className="text-sm text-muted-foreground">
              ({textosP2.filter((t) => t.activo).length} activos · {textosP2.length} total)
            </span>
            {cargandoP2 && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Añadir texto de lectura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tema</Label>
                  <Select
                    value={newP2.theme}
                    onValueChange={(v) => setNewP2((s) => ({ ...s, theme: v as ThemeP1B }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(THEME_LABELS) as ThemeP1B[]).map((th) => (
                        <SelectItem key={th} value={th}>
                          {THEME_LABELS[th].en} / {THEME_LABELS[th].es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fuente / Atribución</Label>
                  <Input
                    value={newP2.source}
                    onChange={(e) => setNewP2((s) => ({ ...s, source: e.target.value }))}
                    placeholder="Autor, publicación, año…"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Título EN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newP2.title_en}
                    onChange={(e) => setNewP2((s) => ({ ...s, title_en: e.target.value }))}
                    placeholder="The future of cities"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título ES</Label>
                  <Input
                    value={newP2.title_es}
                    onChange={(e) => setNewP2((s) => ({ ...s, title_es: e.target.value }))}
                    placeholder="El futuro de las ciudades"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Texto en español <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={newP2.text_es}
                  onChange={(e) => setNewP2((s) => ({ ...s, text_es: e.target.value }))}
                  placeholder="Pega aquí el texto auténtico en español (300-600 palabras aprox.)…"
                  rows={10}
                  className="text-sm font-serif"
                />
                <p className="text-xs text-muted-foreground">
                  {newP2.text_es.trim().split(/\s+/).filter(Boolean).length} palabras
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Los textos se crean <strong>inactivos</strong>. Actívalos una vez revisados.
              </p>
              <Button onClick={crearTextoP2} disabled={guardandoP2} className="gap-2">
                {guardandoP2 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Crear texto
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Textos en el catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {textosP2.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay textos todavía.
                </p>
              ) : (
                <div className="space-y-3">
                  {textosP2.map((tx) => (
                    <div
                      key={tx.id}
                      className={`rounded-lg border p-4 space-y-2 transition-opacity ${tx.activo ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {THEME_LABELS[tx.theme]?.en ?? tx.theme}
                          </Badge>
                          {!tx.activo && (
                            <Badge variant="secondary" className="text-xs">
                              oculto
                            </Badge>
                          )}
                          {tx.source && (
                            <span className="text-xs text-muted-foreground">{tx.source}</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={tx.activo ? "Ocultar" : "Activar"}
                            onClick={() => toggleActivoP2(tx.id, tx.activo)}
                          >
                            {tx.activo ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Eliminar"
                            onClick={() => eliminarTextoP2(tx.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{tx.title_en}</p>
                      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">
                        {tx.text_es}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Gestión de créditos ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Gestión de créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email del alumno"
                value={creditosBuscarEmail}
                onChange={(e) => setCreditosBuscarEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void buscarUsuarioCreditos(); }}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => void buscarUsuarioCreditos()}>
                Buscar
              </Button>
            </div>

            {creditosUsuario && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{creditosUsuario.email}</p>
                    <p className="text-xs text-muted-foreground">{creditosUsuario.user_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{creditosUsuario.creditos.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">créditos</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ajuste (positivo = añadir, negativo = quitar)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={creditosCantidad}
                    onChange={(e) => setCreditosCantidad(parseFloat(e.target.value) || 0)}
                    placeholder="p.ej. 5 o -2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razón del ajuste</Label>
                  <Input
                    value={creditosRazon}
                    onChange={(e) => setCreditosRazon(e.target.value)}
                    placeholder="p.ej. Compensación por error técnico"
                  />
                </div>
                <Button
                  onClick={() => void ajustarCreditosAdmin()}
                  disabled={creditosAjustando || creditosCantidad === 0 || !creditosRazon.trim()}
                  className="w-full"
                >
                  {creditosAjustando ? "Ajustando…" : "Aplicar ajuste"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
