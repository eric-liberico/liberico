import { type CSSProperties, useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  cardShadow,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/admin-usuarios")({
  head: () => ({
    meta: [{ title: "Usuarios — Admin LIBerico" }],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: AdminUsuarios,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--secondary": L.bg2,
  "--secondary-foreground": L.ink,
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--accent": L.primary + "10",
  "--accent-foreground": L.ink,
  "--border": L.line,
  "--input": L.line,
  "--ring": L.primary,
};
const cardStyle = { backgroundColor: L.surface, borderColor: L.line, boxShadow: cardShadow };
const softStyle = { backgroundColor: L.bg2, borderColor: L.line };
const inputStyle = { backgroundColor: L.surface, borderColor: L.line, color: L.ink };
const ctaStyle = {
  backgroundColor: L.primary,
  color: "#fff",
  boxShadow: "0 16px 30px -12px rgba(79,70,229,0.55)",
};

const scopedCss = `
  #admin-usuarios-root .admin-card{background:${L.surface};border-color:${L.line};box-shadow:${cardShadow};}
  #admin-usuarios-root .admin-soft{background:${L.bg2};border-color:${L.line};}
  #admin-usuarios-root .admin-press{transition:transform 0.14s cubic-bezier(0.23,1,0.32,1),border-color 0.18s ease,background-color 0.18s ease,box-shadow 0.18s ease;}
  #admin-usuarios-root .admin-press:active{transform:scale(0.985);}
  #admin-usuarios-root a:focus-visible,#admin-usuarios-root button:focus-visible,#admin-usuarios-root input:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:14px;}
  #admin-usuarios-root button:not([disabled]){cursor:pointer;}
  @media (hover:hover) and (pointer:fine){
    #admin-usuarios-root .admin-hover:hover{background:${L.bg2};}
  }
  @media (prefers-reduced-motion: reduce){
    #admin-usuarios-root .admin-press,#admin-usuarios-root .admin-hover{transition:none !important;}
  }
`;

type Usuario = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  rol: string;
  activo: boolean;
  creditos?: number | string | null;
  p1_hoy: number;
  p2_hoy: number;
  oral_hoy: number;
  sim_hoy: number;
};

const PER_PAGE = 20;

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCreditos(creditos: Usuario["creditos"]): string {
  const valor = parseCreditos(creditos);
  return valor % 1 === 0 ? valor.toFixed(0) : valor.toFixed(1);
}

function parseCreditos(creditos: unknown): number {
  const valor = Number(creditos ?? 0);
  return Number.isFinite(valor) ? valor : 0;
}

function roleStyle(rol: string): CSSProperties {
  if (rol === "admin") {
    return {
      color: "#FFFFFF",
      backgroundColor: L.primary,
      borderColor: L.primary,
      ...fontMono,
    };
  }
  if (rol === "profesor") {
    return {
      color: L.amberDeep,
      backgroundColor: "rgba(232,161,58,0.12)",
      borderColor: "rgba(154,94,16,0.22)",
      ...fontMono,
    };
  }
  return {
    color: L.muted,
    backgroundColor: L.bg2,
    borderColor: L.line,
    ...fontMono,
  };
}

function statusStyle(activo: boolean): CSSProperties {
  return activo
    ? {
        color: L.ok,
        backgroundColor: "rgba(21,128,61,0.1)",
        borderColor: "rgba(21,128,61,0.2)",
        ...fontMono,
      }
    : {
        color: "#B91C1C",
        backgroundColor: "rgba(220,38,38,0.08)",
        borderColor: "rgba(185,28,28,0.18)",
        ...fontMono,
      };
}

function AdminUsuarios() {
  const { user, rol, loading } = useAuth();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  // Diálogos
  const [usuarioAccion, setUsuarioAccion] = useState<Usuario | null>(null);
  const [modalTipo, setModalTipo] = useState<"rol" | "activo" | "reset" | "eliminar" | null>(null);
  const [nuevoRol, setNuevoRol] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!loading && (!user || rol !== "admin")) {
      navigate({ to: "/" });
    }
  }, [user, rol, loading, navigate]);

  const cargarSaldosDesdeTransacciones = useCallback(async (usuariosBase: Usuario[]) => {
    const userIds = usuariosBase.map((u) => u.id).filter(Boolean);
    if (userIds.length === 0) return usuariosBase;

    const { data: perfilesData } = await supabase
      .from("perfiles")
      .select("user_id, creditos")
      .in("user_id", userIds);

    const saldosPorPerfil = new Map<string, number>();
    for (const row of (perfilesData ?? []) as Array<{
      user_id: string;
      creditos: number | string | null;
    }>) {
      saldosPorPerfil.set(row.user_id, parseCreditos(row.creditos));
    }

    const { data: transaccionesData, error } = await supabase
      .from("creditos_transacciones")
      .select("user_id, balance_despues, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    const saldosPorTransaccion = new Map<string, number>();
    if (!error && transaccionesData) {
      for (const row of transaccionesData as Array<{
        user_id: string;
        balance_despues: number | string | null;
      }>) {
        if (saldosPorTransaccion.has(row.user_id)) continue;
        const saldo = parseCreditos(row.balance_despues);
        saldosPorTransaccion.set(row.user_id, saldo);
      }
    }

    return usuariosBase.map((u) => ({
      ...u,
      creditos:
        saldosPorPerfil.get(u.id) ?? saldosPorTransaccion.get(u.id) ?? parseCreditos(u.creditos),
    }));
  }, []);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCargando(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("admin-get-users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        page,
        per_page: PER_PAGE,
        ...(busqueda && { q: busqueda }),
        ...(rolFiltro && { rol: rolFiltro }),
      },
    });

    if (error || data?.error) {
      toast.error(`Error al cargar usuarios: ${data?.error ?? error?.message}`);
    } else {
      const usuariosBase = (data.usuarios as Usuario[]).map((u) => ({
        ...u,
        creditos: parseCreditos(u.creditos),
      }));
      setUsuarios(await cargarSaldosDesdeTransacciones(usuariosBase));
      setTotal(data.total as number);
    }
    setCargando(false);
  }, [page, busqueda, rolFiltro, cargarSaldosDesdeTransacciones]);

  useEffect(() => {
    if (user && rol === "admin") {
      void cargarUsuarios();
    }
  }, [user, rol, cargarUsuarios]);

  const invocarAdmin = async (fn: string, body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Sin sesión");
    const { data, error } = await supabase.functions.invoke(fn, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body,
    });
    if (error || data?.error) throw new Error(data?.error ?? error?.message);
    return data as Record<string, unknown>;
  };

  const cerrarModal = () => {
    setModalTipo(null);
    setUsuarioAccion(null);
    setConfirmText("");
    setNuevoRol("");
  };

  const handleCambiarRol = async () => {
    if (!usuarioAccion || !nuevoRol) return;
    setProcesando(true);
    try {
      await invocarAdmin("admin-update-user", { user_id: usuarioAccion.id, rol: nuevoRol });
      toast.success("Rol actualizado correctamente");
      cerrarModal();
      void cargarUsuarios();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(false);
    }
  };

  const handleToggleActivo = async () => {
    if (!usuarioAccion) return;
    setProcesando(true);
    try {
      await invocarAdmin("admin-update-user", {
        user_id: usuarioAccion.id,
        activo: !usuarioAccion.activo,
      });
      toast.success(usuarioAccion.activo ? "Usuario desactivado" : "Usuario activado");
      cerrarModal();
      void cargarUsuarios();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(false);
    }
  };

  const handleResetPassword = async () => {
    if (!usuarioAccion) return;
    setProcesando(true);
    try {
      await invocarAdmin("admin-reset-password", { email: usuarioAccion.email });
      toast.success("Email de recuperación enviado al usuario");
      cerrarModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async () => {
    if (!usuarioAccion || confirmText !== "eliminar") return;
    setProcesando(true);
    try {
      await invocarAdmin("admin-delete-user", { user_id: usuarioAccion.id });
      toast.success("Usuario eliminado");
      cerrarModal();
      void cargarUsuarios();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setProcesando(false);
    }
  };

  const abrirModal = (u: Usuario, tipo: typeof modalTipo) => {
    setUsuarioAccion(u);
    setNuevoRol(u.rol);
    setModalTipo(tipo);
    setConfirmText("");
  };

  if (loading || (!user && !loading)) return null;
  if (rol !== "admin") return null;

  const totalPaginas = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div id="admin-usuarios-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <Link
            to="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--foreground)]"
            style={{ color: L.muted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Volver al panel
          </Link>
          <h1 className="text-3xl font-semibold tracking-normal" style={headingStyle}>
            Gestión de usuarios
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: L.muted }}>
            {total} usuarios registrados
          </p>
        </div>

        {/* Filtros */}
        <div className="admin-card flex flex-wrap gap-3 rounded-2xl border p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: L.muted }}
              aria-hidden="true"
            />
            <Input
              placeholder="Buscar por email…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl pl-9"
              style={inputStyle}
            />
          </div>
          <Select
            value={rolFiltro || "__todos"}
            onValueChange={(v) => {
              setRolFiltro(v === "__todos" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 rounded-2xl" style={inputStyle}>
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos</SelectItem>
              <SelectItem value="alumno">Alumno</SelectItem>
              <SelectItem value="profesor">Profesor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="admin-press rounded-2xl border"
            style={softStyle}
            onClick={cargarUsuarios}
            disabled={cargando}
          >
            {cargando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              "Actualizar"
            )}
          </Button>
        </div>

        {/* Tabla */}
        <div className="admin-card overflow-hidden rounded-2xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: L.bg2 }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Nombre
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] lg:table-cell"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Apellido
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] md:table-cell"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Email
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Rol
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] sm:table-cell"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Créditos
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Estado
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] md:table-cell"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Registrado
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] lg:table-cell"
                    style={{ ...fontMono, color: L.muted }}
                  >
                    Último acceso
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: L.line }}>
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Loader2
                        className="mx-auto h-6 w-6 animate-spin"
                        style={{ color: L.muted }}
                        aria-hidden="true"
                      />
                    </td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center" style={{ color: L.muted }}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="admin-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className="block truncate max-w-[140px]">{u.nombre || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="block truncate max-w-[140px]">{u.apellido || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="truncate max-w-[200px] block">{u.email}</span>
                        {!u.email_confirmed && (
                          <span className="text-xs" style={{ color: L.amberDeep }}>
                            Email no verificado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize" style={roleStyle(u.rol)}>
                          {u.rol}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="block text-sm font-medium tabular-nums">
                          {formatCreditos(u.creditos)} créditos
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" style={statusStyle(u.activo)}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell" style={{ color: L.muted }}>
                        {formatFecha(u.created_at)}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell" style={{ color: L.muted }}>
                        {formatFecha(u.last_sign_in_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-2xl border"
                            style={cardStyle}
                          >
                            <DropdownMenuItem onClick={() => abrirModal(u, "rol")}>
                              Cambiar rol
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModal(u, "activo")}>
                              {u.activo ? "Desactivar" : "Activar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModal(u, "reset")}>
                              Resetear contraseña
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-700 focus:text-red-700"
                              onClick={() => abrirModal(u, "eliminar")}
                            >
                              Eliminar cuenta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between text-sm" style={{ color: L.muted }}>
          <span>
            Página {page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-press rounded-xl border"
              style={softStyle}
              disabled={page <= 1 || cargando}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="admin-press rounded-xl border"
              style={softStyle}
              disabled={page >= totalPaginas || cargando}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Modal: Cambiar rol */}
        <Dialog
          open={modalTipo === "rol"}
          onOpenChange={(o) => {
            if (!o) cerrarModal();
          }}
        >
          <DialogContent className="rounded-2xl border" style={cardStyle}>
            <DialogHeader>
              <DialogTitle style={headingStyle}>Cambiar rol</DialogTitle>
              <DialogDescription style={{ color: L.muted }}>
                {usuarioAccion?.email}
              </DialogDescription>
            </DialogHeader>
            <Select value={nuevoRol} onValueChange={setNuevoRol}>
              <SelectTrigger className="rounded-2xl" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alumno">Alumno</SelectItem>
                <SelectItem value="profesor">Profesor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border"
                style={softStyle}
                onClick={cerrarModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                style={ctaStyle}
                onClick={handleCambiarRol}
                disabled={procesando || nuevoRol === usuarioAccion?.rol}
              >
                {procesando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Activar / desactivar */}
        <Dialog
          open={modalTipo === "activo"}
          onOpenChange={(o) => {
            if (!o) cerrarModal();
          }}
        >
          <DialogContent className="rounded-2xl border" style={cardStyle}>
            <DialogHeader>
              <DialogTitle style={headingStyle}>
                {usuarioAccion?.activo ? "Desactivar usuario" : "Activar usuario"}
              </DialogTitle>
              <DialogDescription style={{ color: L.muted }}>
                {usuarioAccion?.activo
                  ? `El usuario ${usuarioAccion?.email} no podrá usar la app mientras esté desactivado.`
                  : `El usuario ${usuarioAccion?.email} volverá a tener acceso.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border"
                style={softStyle}
                onClick={cerrarModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant={usuarioAccion?.activo ? "destructive" : "default"}
                style={
                  usuarioAccion?.activo ? undefined : { backgroundColor: L.ok, color: "#FFFFFF" }
                }
                onClick={handleToggleActivo}
                disabled={procesando}
              >
                {procesando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {usuarioAccion?.activo ? "Desactivar" : "Activar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Reset contraseña */}
        <Dialog
          open={modalTipo === "reset"}
          onOpenChange={(o) => {
            if (!o) cerrarModal();
          }}
        >
          <DialogContent className="rounded-2xl border" style={cardStyle}>
            <DialogHeader>
              <DialogTitle style={headingStyle}>Resetear contraseña</DialogTitle>
              <DialogDescription style={{ color: L.muted }}>
                {usuarioAccion?.email}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm" style={{ color: L.muted }}>
              Se enviará un email de recuperación de contraseña directamente al usuario.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border"
                style={softStyle}
                onClick={cerrarModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                style={ctaStyle}
                onClick={handleResetPassword}
                disabled={procesando}
              >
                {procesando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Enviar email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Eliminar */}
        <Dialog
          open={modalTipo === "eliminar"}
          onOpenChange={(o) => {
            if (!o) cerrarModal();
          }}
        >
          <DialogContent className="rounded-2xl border" style={cardStyle}>
            <DialogHeader>
              <DialogTitle style={headingStyle}>Eliminar cuenta</DialogTitle>
              <DialogDescription style={{ color: L.muted }}>
                Esta acción eliminará permanentemente la cuenta de{" "}
                <strong>{usuarioAccion?.email}</strong> y todos sus datos. No se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm">
                Escribe <strong>eliminar</strong> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="eliminar"
                className="rounded-2xl"
                style={inputStyle}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border"
                style={softStyle}
                onClick={cerrarModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleEliminar}
                disabled={procesando || confirmText !== "eliminar"}
              >
                {procesando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Eliminar permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
