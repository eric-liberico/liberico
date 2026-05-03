import { useState, useEffect, useCallback } from "react";
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

export const Route = createFileRoute("/admin-usuarios")({
  component: AdminUsuarios,
});

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

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

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
      setUsuarios(data.usuarios as Usuario[]);
      setTotal(data.total as number);
    }
    setCargando(false);
  }, [page, busqueda, rolFiltro]);

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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel
          </Link>
          <h1 className="text-2xl font-serif font-semibold text-ink">Gestión de usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} usuarios registrados</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={rolFiltro || "__todos"}
            onValueChange={(v) => {
              setRolFiltro(v === "__todos" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos">Todos</SelectItem>
              <SelectItem value="alumno">Alumno</SelectItem>
              <SelectItem value="profesor">Profesor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={cargarUsuarios} disabled={cargando}>
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
          </Button>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Apellido
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    Plan · Créditos hoy
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    Registrado
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Último acceso
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cargando ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="block truncate max-w-[140px]">{u.nombre || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="block truncate max-w-[140px]">{u.apellido || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="truncate max-w-[200px] block">{u.email}</span>
                        {!u.email_confirmed && (
                          <span className="text-xs text-amber-600">Email no verificado</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            u.rol === "admin"
                              ? "default"
                              : u.rol === "profesor"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {u.rol}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground block">Gratuito</span>
                        <span className="text-xs tabular-nums text-foreground/70">
                          P1 {u.p1_hoy}/20 · P2 {u.p2_hoy}/8 · Oral {u.oral_hoy}/5 · Sim {u.sim_hoy}
                          /2
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={u.activo ? "default" : "destructive"}
                          className={
                            u.activo
                              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                              : ""
                          }
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatFecha(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {formatFecha(u.last_sign_in_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                              className="text-destructive focus:text-destructive"
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || cargando}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPaginas || cargando}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar rol</DialogTitle>
              <DialogDescription>{usuarioAccion?.email}</DialogDescription>
            </DialogHeader>
            <Select value={nuevoRol} onValueChange={setNuevoRol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alumno">Alumno</SelectItem>
                <SelectItem value="profesor">Profesor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleCambiarRol}
                disabled={procesando || nuevoRol === usuarioAccion?.rol}
              >
                {procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {usuarioAccion?.activo ? "Desactivar usuario" : "Activar usuario"}
              </DialogTitle>
              <DialogDescription>
                {usuarioAccion?.activo
                  ? `El usuario ${usuarioAccion?.email} no podrá usar la app mientras esté desactivado.`
                  : `El usuario ${usuarioAccion?.email} volverá a tener acceso.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                variant={usuarioAccion?.activo ? "destructive" : "default"}
                onClick={handleToggleActivo}
                disabled={procesando}
              >
                {procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resetear contraseña</DialogTitle>
              <DialogDescription>{usuarioAccion?.email}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se enviará un email de recuperación de contraseña directamente al usuario.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} disabled={procesando}>
                {procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar cuenta</DialogTitle>
              <DialogDescription>
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
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleEliminar}
                disabled={procesando || confirmText !== "eliminar"}
              >
                {procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Eliminar permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
