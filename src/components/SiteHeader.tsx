import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUiLang } from "@/hooks/useUiLang";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Globe2,
  GraduationCap,
  Home,
  Library,
  Menu,
  MessageSquare,
  Mic,
  PenLine,
  RefreshCw,
  Settings,
  User,
} from "lucide-react";
import { COURSES, type UiLang } from "@/lib/ib-courses";

type SiteHeaderProps = {
  minimal?: boolean;
  languageSwitcher?: {
    lang: UiLang;
    label: string;
    labels: Record<UiLang, string>;
    onChange: (lang: UiLang) => void;
  };
};

export function SiteHeader({ minimal = false, languageSwitcher }: SiteHeaderProps) {
  const { user, signOut, rol, courseKey } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isEN = useUiLang() === "en";
  const currentCourseLabel = COURSES[courseKey]?.label ?? courseKey;
  const isEnglishA = courseKey === "english-a-literature";
  const caps = COURSES[courseKey]?.capabilities ?? {
    paper1Enabled: true,
    paper2Enabled: true,
    oralEnabled: true,
    practiceLibrary: true,
    oralSimulator: true,
    studyPlan: true,
    exercises: true,
    theory: true,
    questionBank: true,
  };
  const showPracticeMenu =
    caps.exercises || caps.practiceLibrary || caps.oralSimulator || caps.theory;

  return (
    <header className="border-b border-border bg-parchment/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {minimal ? (
            <div className="flex items-center gap-2" aria-current="page">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
              </div>
            </div>
          ) : (
            <Link to="/" className="flex items-center gap-2 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="font-serif text-lg font-semibold text-ink">LIBerico</div>
              </div>
            </Link>
          )}
          {/* Selector de asignatura — solo para alumnos autenticados */}
          {!minimal &&
            (user && rol === "alumno" ? (
              <Link
                to="/asignaturas"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors group"
                title="Cambiar asignatura"
              >
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground transition-colors">
                  {currentCourseLabel}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              </Link>
            ) : (
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground pl-1">
                {user ? currentCourseLabel : "IB Language A: Literature"}
              </div>
            ))}
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              {!minimal &&
                (rol === "admin" ? (
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
                      <span className="hidden sm:inline">{isEN ? "Sessions" : "Sesiones"}</span>
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
                    {/* Desktop nav — hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-0.5">
                      {/* Inicio */}
                      <Link
                        to="/"
                        className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                        activeProps={{
                          className:
                            "flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                        }}
                        activeOptions={{ exact: true }}
                      >
                        <Home className="h-3.5 w-3.5" />
                        <span>{isEN ? "Home" : "Inicio"}</span>
                      </Link>

                      {/* Evaluar ▾ */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground outline-none">
                            {isEN ? "Assess" : "Evaluar"}{" "}
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem asChild>
                            <Link to="/prueba-1" className="cursor-pointer flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              {isEN ? "Paper 1 — Literary analysis" : "Prueba 1 — Comentario"}
                            </Link>
                          </DropdownMenuItem>
                          {caps.paper2Enabled && (
                            <DropdownMenuItem asChild>
                              <Link
                                to="/prueba-2"
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                                {isEN ? "Paper 2 — Comparative essay" : "Prueba 2 — Ensayo"}
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {caps.oralEnabled && (
                            <DropdownMenuItem asChild>
                              <Link to="/oral" className="cursor-pointer flex items-center gap-2">
                                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                                {isEN ? "Individual Oral" : "Oral Individual"}
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Practicar ▾ */}
                      {showPracticeMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground outline-none">
                              {isEN ? "Practise" : "Practicar"}{" "}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            {caps.exercises && (
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/ejercicios"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                                  {isEN ? "Exercises" : "Ejercicios"}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {caps.practiceLibrary && (
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/biblioteca"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  <Library className="h-3.5 w-3.5 text-muted-foreground" />
                                  {isEN ? "Paper 1 library" : "Biblioteca P1"}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {caps.oralSimulator && (
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/simular-oral"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                                  {isEN ? "Oral simulator" : "Simular oral"}
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {caps.theory && (
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/teoria"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                  {isEN ? "Theory" : "Teoría"}
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Progreso */}
                      <Link
                        to="/historial"
                        className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground"
                        activeProps={{
                          className: "px-3 py-2 text-sm rounded-md bg-accent text-foreground",
                        }}
                      >
                        {isEN ? "Progress" : "Progreso"}
                      </Link>

                      {/* Tutoría */}
                      {!isEnglishA && (
                        <Link
                          to="/reservar-sesion"
                          className="px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground/80 hover:text-foreground flex items-center gap-1.5"
                          activeProps={{
                            className:
                              "px-3 py-2 text-sm rounded-md bg-accent text-foreground flex items-center gap-1.5",
                          }}
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {isEN ? "Tutoring" : "Tutoría"}
                        </Link>
                      )}
                    </div>

                    {/* Mobile hamburger — hidden on sm+ */}
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Menú</span>
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-64 pt-10">
                        <nav className="flex flex-col gap-1">
                          {[
                            {
                              to: "/",
                              label: isEN ? "Home" : "Inicio",
                              icon: <Home className="h-4 w-4" />,
                              exact: true,
                              show: true,
                            },
                            {
                              to: "/prueba-1",
                              label: isEN ? "Paper 1 — Literary analysis" : "Prueba 1 — Comentario",
                              icon: <BookOpen className="h-4 w-4" />,
                              show: caps.paper1Enabled,
                            },
                            {
                              to: "/prueba-2",
                              label: isEN ? "Paper 2 — Comparative essay" : "Prueba 2 — Ensayo",
                              icon: <PenLine className="h-4 w-4" />,
                              show: caps.paper2Enabled,
                            },
                            {
                              to: "/oral",
                              label: isEN ? "Individual Oral" : "Oral Individual",
                              icon: <Mic className="h-4 w-4" />,
                              show: caps.oralEnabled,
                            },
                            {
                              to: "/ejercicios",
                              label: isEN ? "Exercises" : "Ejercicios",
                              icon: <PenLine className="h-4 w-4" />,
                              show: caps.exercises,
                            },
                            {
                              to: "/biblioteca",
                              label: isEN ? "Paper 1 library" : "Biblioteca P1",
                              icon: <Library className="h-4 w-4" />,
                              show: caps.practiceLibrary,
                            },
                            {
                              to: "/simular-oral",
                              label: isEN ? "Oral simulator" : "Simular oral",
                              icon: <Bot className="h-4 w-4" />,
                              show: caps.oralSimulator,
                            },
                            {
                              to: "/teoria",
                              label: isEN ? "Theory" : "Teoría",
                              icon: <GraduationCap className="h-4 w-4" />,
                              show: caps.theory,
                            },
                            { to: "/historial", label: isEN ? "Progress" : "Progreso", show: true },
                            {
                              to: "/reservar-sesion",
                              label: isEN ? "1:1 Tutoring" : "Tutoría 1:1",
                              icon: <CalendarDays className="h-4 w-4" />,
                              show: !isEnglishA,
                            },
                            {
                              to: "/cuenta",
                              label: isEN ? "My account" : "Mi cuenta",
                              icon: <User className="h-4 w-4" />,
                              show: true,
                            },
                          ]
                            .filter((item) => item.show)
                            .map((item) => (
                              <Link
                                key={item.to}
                                to={item.to}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground/75 hover:bg-accent hover:text-foreground transition-colors"
                                activeProps={{
                                  className:
                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm bg-accent text-foreground",
                                }}
                                activeOptions={item.exact ? { exact: true } : undefined}
                                onClick={() => setMobileOpen(false)}
                              >
                                {item.icon}
                                {item.label}
                              </Link>
                            ))}

                          {/* Mis asignaturas */}
                          <Link
                            to="/asignaturas"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-foreground/75 hover:bg-accent hover:text-foreground transition-colors"
                            activeProps={{
                              className:
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm bg-accent text-foreground",
                            }}
                            onClick={() => setMobileOpen(false)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            {isEN ? "Subjects" : "Mis asignaturas"}
                          </Link>

                          <div className="mt-2 pt-2 border-t border-border">
                            <button
                              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={async () => {
                                setMobileOpen(false);
                                await signOut();
                                navigate({ to: "/" });
                              }}
                            >
                              Cerrar sesión
                            </button>
                          </div>
                        </nav>
                      </SheetContent>
                    </Sheet>
                  </>
                ))}

              {languageSwitcher && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex h-8 w-8 rounded-full"
                      aria-label={languageSwitcher.label}
                      title={languageSwitcher.label}
                    >
                      <Globe2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {(["es", "en"] as const).map((lang) => (
                      <DropdownMenuItem
                        key={lang}
                        className="cursor-pointer flex items-center justify-between"
                        onClick={() => languageSwitcher.onChange(lang)}
                      >
                        <span>{languageSwitcher.labels[lang]}</span>
                        {languageSwitcher.lang === lang && <Check className="h-3.5 w-3.5" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* ── Dropdown de usuario (desktop) ── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={
                      minimal ? "flex h-8 w-8 rounded-full" : "hidden sm:flex h-8 w-8 rounded-full"
                    }
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {rol === "alumno" && !minimal && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/asignaturas" className="cursor-pointer flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                          {isEN ? "My courses" : "Mis cursos"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/cuenta" className="cursor-pointer">
                      {isEN ? "My account" : "Mi cuenta"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    {isEN ? "Logout" : "Cerrar sesión"}
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
