import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Feather, Flame, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUiLang } from "@/hooks/useUiLang";
import { useGamificacion } from "@/hooks/useGamificacion";
import { calcularNivel, RANGOS, NOMBRES_ES, NOMBRES_EN, type NivelInfo } from "@/lib/rangos";
import { LANDING as L, landingFontMono as fontMono } from "@/lib/landing-theme";

// ── Anillo de XP: se rellena de vacío → progreso al montar (CSS transition). ──
function RangoRing({
  size,
  stroke,
  progreso,
  color,
  dimmed,
  children,
}: {
  size: number;
  stroke: number;
  progreso: number;
  color: string;
  dimmed?: boolean;
  children: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const pct = Math.min(100, Math.max(0, progreso));
    const id = requestAnimationFrame(() => setOffset(circ * (1 - pct / 100)));
    return () => cancelAnimationFrame(id);
  }, [circ, progreso]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={L.line}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={dimmed ? "#A6ABB5" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="rango-ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── Insignia: disco con el gradiente del tier + emblema. Cumbres animadas. ──
function Insignia({ info, size }: { info: NivelInfo; size: number }) {
  const { tier } = info;
  const Emblema = tier.anim === "ember" ? Flame : Feather;
  return (
    <div
      className="relative rounded-full flex items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${tier.from}, ${tier.to})`,
        boxShadow:
          tier.anim === "leaf"
            ? `0 0 14px ${tier.color}99, inset 0 1px 1px rgba(255,255,255,.4)`
            : `inset 0 1px 1px rgba(255,255,255,.4), 0 1px 2px rgba(0,0,0,.18)`,
      }}
    >
      {tier.anim === "ember" && (
        <span
          className="absolute inset-0 rounded-full rango-ember-glow"
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at 50% 62%, ${tier.from}, transparent 68%)`,
          }}
        />
      )}
      {tier.anim === "leaf" && (
        <span className="absolute inset-0 rounded-full overflow-hidden" aria-hidden="true">
          <span
            className="absolute inset-0 rango-leaf-sheen"
            style={{
              background:
                "linear-gradient(115deg, transparent 32%, rgba(255,255,255,.6) 50%, transparent 68%)",
              backgroundSize: "260% 100%",
            }}
          />
        </span>
      )}
      <Emblema className="relative" size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </div>
  );
}

// ── Barra de XP + candado de nota (la nota frena la subida). ──
function XpProgreso({ info, isEN }: { info: NivelInfo; isEN: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]" style={fontMono}>
        <span style={{ color: L.muted }}>{info.xp.toLocaleString()} XP</span>
        {!info.esFinal && !info.notaBloqueando && (
          <span style={{ color: L.muted }}>/ {info.xpSiguiente.toLocaleString()}</span>
        )}
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: L.bg2 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${info.progreso}%`,
            background: info.notaBloqueando ? "#A6ABB5" : info.tier.color,
          }}
        />
      </div>
      {info.notaBloqueando && info.notaNecesaria !== null && (
        <span className="flex items-center gap-1 text-[11px]" style={{ color: L.muted }}>
          <Lock className="h-3 w-3 shrink-0" />
          {isEN
            ? `Avg grade ${info.notaMedia.toFixed(1)} → need ${info.notaNecesaria}.0`
            : `Nota media ${info.notaMedia.toFixed(1)} → necesitas ${info.notaNecesaria}.0`}
        </span>
      )}
    </div>
  );
}

// ── Riel de los 8 tiers: el recorrido completo, posición actual encendida. ──
function Riel({ info, isEN, compact }: { info: NivelInfo; isEN: boolean; compact?: boolean }) {
  const nombres = isEN ? NOMBRES_EN : NOMBRES_ES;
  const dot = compact ? 9 : 13;
  return (
    <div className="flex items-center" aria-hidden="true">
      {RANGOS.map((tier, i) => {
        const reached = i <= info.nivel;
        const current = i === info.nivel;
        const d = current ? dot + 4 : dot;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <div
                className="h-px flex-1"
                style={{ background: i <= info.nivel ? info.tier.color + "55" : L.line }}
              />
            )}
            <span
              className="relative inline-flex items-center justify-center shrink-0"
              style={{ width: d, height: d }}
              title={`${i + 1}. ${nombres[i]}`}
            >
              {current && (
                <span
                  className="absolute inset-0 rounded-full rango-pulse-ring"
                  style={{ background: tier.color }}
                />
              )}
              <span
                className="rounded-full"
                style={{
                  width: d,
                  height: d,
                  background: reached
                    ? `linear-gradient(145deg, ${tier.from}, ${tier.to})`
                    : "transparent",
                  border: reached ? "none" : `1.5px solid ${L.line}`,
                  boxShadow: current
                    ? `0 0 0 2px ${L.surface}, 0 0 0 3.5px ${tier.color}`
                    : undefined,
                }}
              />
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Detalle del popover (header). ──
function RangoDetalle({ info, racha, isEN }: { info: NivelInfo; racha: number; isEN: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Insignia info={info} size={40} />
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold" style={{ color: L.ink }}>
            {info.nombre}
          </p>
          <p className="text-[11px]" style={{ color: L.muted }}>
            {isEN
              ? `Level ${info.nivel + 1} · Golden Age`
              : `Nivel ${info.nivel + 1} · Siglo de Oro`}
          </p>
        </div>
        {racha > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-xs font-bold text-orange-600">
            <Flame className="h-4 w-4 fill-orange-400 text-orange-500" />
            {racha}
          </span>
        )}
      </div>
      <XpProgreso info={info} isEN={isEN} />
      <Riel info={info} isEN={isEN} compact />
      {info.siguienteNombre && (
        <p className="text-[11px]" style={{ color: L.muted }}>
          {isEN ? "Next: " : "Siguiente: "}
          <span className="font-medium" style={{ color: L.ink }}>
            {info.siguienteNombre}
          </span>
        </p>
      )}
    </div>
  );
}

// ── Chip del header: visible en toda la app (alumnos). ──
export function RangoChip() {
  const isEN = useUiLang() === "en";
  const { xp, racha, notaMedia, loading } = useGamificacion();
  if (loading) return null;
  const info = calcularNivel(xp, notaMedia, isEN);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${info.nombre} · ${xp.toLocaleString()} XP${racha > 0 ? ` · ${racha}` : ""}`}
        >
          <RangoRing
            size={34}
            stroke={3}
            progreso={info.progreso}
            color={info.tier.color}
            dimmed={info.notaBloqueando}
          >
            <Insignia info={info} size={24} />
          </RangoRing>
          <span className="hidden md:flex flex-col items-start leading-none gap-0.5">
            <span className="text-xs font-semibold" style={{ color: L.ink }}>
              {info.nombre}
            </span>
            <span className="text-[10px]" style={{ ...fontMono, color: L.muted }}>
              {xp.toLocaleString()} XP
            </span>
          </span>
          {racha > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-600">
              <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-500 rango-flame" />
              {racha}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <RangoDetalle info={info} racha={racha} isEN={isEN} />
      </PopoverContent>
    </Popover>
  );
}
