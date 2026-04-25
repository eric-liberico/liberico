import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-parchment/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold text-ink">IB Literatura</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Prueba 1 · Español A NM
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link
                to="/"
                className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                activeProps={{ className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground" }}
                activeOptions={{ exact: true }}
              >
                Corrector
              </Link>
              <Link
                to="/mi-plan"
                className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                activeProps={{ className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground" }}
              >
                Mi plan
              </Link>
              <Link
                to="/historial"
                className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                activeProps={{ className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground" }}
              >
                Mis evaluaciones
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
              >
                Salir
              </Button>
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
