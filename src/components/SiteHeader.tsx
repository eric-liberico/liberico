import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  GraduationCap,
  MessageSquare,
  PenLine,
  Settings,
  User,
  CalendarDays,
} from "lucide-react";

export function SiteHeader() {
  const { user, signOut, rol } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-parchment/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Prueba 1 · Español A NM
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              {rol === "admin" ? (
                /* ── Nav del administrador ── */
                <>
                  <Link
                    to="/admin"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                    activeOptions={{ exact: true }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Panel</span>
                  </Link>
                  <Link
                    to="/admin-usuarios"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                    activeProps={{
                      className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                    }}
                  >
                    Usuarios
                  </Link>
                  <Link
                    to="/admin-bookings"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sesiones</span>
                  </Link>
                </>
              ) : rol === "profesor" ? (
                /* ── Nav del profesor ── */
                <>
                  <Link
                    to="/profesor"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                    activeProps={{
                      className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                    }}
                    activeOptions={{ exact: true }}
                  >
                    <span className="hidden sm:inline">Panel</span>
                    <span className="sm:hidden">Panel</span>
                  </Link>
                  <Link
                    to="/profesor-sesiones"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sesiones</span>
                  </Link>
                  <Link
                    to="/profesor-chat"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Chat con Claude</span>
                  </Link>
                </>
              ) : (
                /* ── Nav del alumno ── */
                <>
                  <Link
                    to="/"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                    activeProps={{
                      className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                    }}
                    activeOptions={{ exact: true }}
                  >
                    Prueba 1
                  </Link>
                  <Link
                    to="/prueba-2"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                    activeProps={{
                      className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                    }}
                  >
                    Prueba 2
                  </Link>
                  <Link
                    to="/ejercicios"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ejercicios</span>
                  </Link>
                  <Link
                    to="/teoria"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Teoría</span>
                  </Link>
                  <Link
                    to="/historial"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                    activeProps={{
                      className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                    }}
                  >
                    <span className="hidden sm:inline">Mis evaluaciones</span>
                    <span className="sm:hidden">Historial</span>
                  </Link>
                  <Link
                    to="/reservar-sesion"
                    className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                    activeProps={{
                      className:
                        "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sesión 1:1</span>
                  </Link>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer">
                      Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  {(!rol || rol === "alumno") && (
                    <DropdownMenuItem asChild>
                      <Link to="/historial-prueba-2" className="cursor-pointer">
                        Historial P2
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Iniciar sesión</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
