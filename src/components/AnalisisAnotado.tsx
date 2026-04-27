import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { Evaluacion } from "@/lib/ib";

type Anotacion = {
  inicio: number;
  fin: number;
  tipo: "interferencia" | "verbo_debil";
  explicacion: string;
  correccion: string;
  etiqueta: string;
};

type Segmento =
  | { tipo: "texto"; contenido: string }
  | { tipo: "anotacion"; contenido: string; anotacion: Anotacion };

function construirAnotaciones(texto: string, ev: Evaluacion): Anotacion[] {
  const anotaciones: Anotacion[] = [];

  (ev.lenguaje_analitico?.interferencias_ingles ?? []).forEach((int) => {
    const fragmento = (int.fragmento_original ?? "").replace(/^["""«»]+|["""«»]+$/g, "").trim();
    if (!fragmento) return;
    const idx = texto.toLowerCase().indexOf(fragmento.toLowerCase());
    if (idx === -1) return;
    anotaciones.push({
      inicio: idx,
      fin: idx + fragmento.length,
      tipo: "interferencia",
      explicacion: int.explicacion ?? "",
      correccion: int.correccion ?? "",
      etiqueta: fragmento,
    });
  });

  (ev.lenguaje_analitico?.verbos_debiles ?? []).forEach((v) => {
    const ejemplo = (v.ejemplo_original ?? "").trim();
    if (!ejemplo) return;
    let buscar = ejemplo;
    // Si el ejemplo tiene comillas, buscar sólo el fragmento entre ellas
    const match = ejemplo.match(/["""«»](.+?)["""«»]/);
    if (match) buscar = match[1];
    const idx = texto.toLowerCase().indexOf(buscar.toLowerCase());
    if (idx === -1) return;
    // No solapar con una interferencia ya añadida
    const solapa = anotaciones.some((a) => a.inicio < idx + buscar.length && a.fin > idx);
    if (solapa) return;
    anotaciones.push({
      inicio: idx,
      fin: idx + buscar.length,
      tipo: "verbo_debil",
      explicacion: `Verbo débil usado ${v.frecuencia}×`,
      correccion: v.alternativa_mejorada,
      etiqueta: buscar,
    });
  });

  // Ordenar por posición y eliminar solapamientos
  anotaciones.sort((a, b) => a.inicio - b.inicio);
  const filtradas: Anotacion[] = [];
  let cursor = 0;
  for (const ann of anotaciones) {
    if (ann.inicio >= cursor) {
      filtradas.push(ann);
      cursor = ann.fin;
    }
  }
  return filtradas;
}

function segmentar(texto: string, anotaciones: Anotacion[]): Segmento[] {
  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const ann of anotaciones) {
    if (ann.inicio > cursor) {
      segmentos.push({ tipo: "texto", contenido: texto.slice(cursor, ann.inicio) });
    }
    segmentos.push({
      tipo: "anotacion",
      contenido: texto.slice(ann.inicio, ann.fin),
      anotacion: ann,
    });
    cursor = ann.fin;
  }
  if (cursor < texto.length) {
    segmentos.push({ tipo: "texto", contenido: texto.slice(cursor) });
  }
  return segmentos;
}

const COLOR = {
  interferencia: {
    mark: "bg-red-100 text-red-900 border-b-2 border-red-400 cursor-pointer rounded-sm px-0.5",
    panel: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
    label: "Interferencia del inglés",
  },
  verbo_debil: {
    mark: "bg-amber-100 text-amber-900 border-b-2 border-amber-400 cursor-pointer rounded-sm px-0.5",
    panel: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    label: "Verbo débil",
  },
} as const;

export function AnalisisAnotado({ texto, ev }: { texto: string; ev: Evaluacion }) {
  const [activa, setActiva] = useState<Anotacion | null>(null);

  const anotaciones = construirAnotaciones(texto, ev);
  if (anotaciones.length === 0) return null;

  const segmentos = segmentar(texto, anotaciones);

  return (
    <Card className="p-5 bg-card border-border">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
        Tu análisis anotado
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200 border-b-2 border-red-400" />
          Interferencia del inglés
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-200 border-b-2 border-amber-400" />
          Verbo débil
        </span>
      </div>

      <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap font-serif">
        {segmentos.map((seg, i) =>
          seg.tipo === "texto" ? (
            <span key={i}>{seg.contenido}</span>
          ) : (
            <mark
              key={i}
              className={COLOR[seg.anotacion.tipo].mark}
              onClick={() =>
                setActiva(activa?.inicio === seg.anotacion.inicio ? null : seg.anotacion)
              }
            >
              {seg.contenido}
            </mark>
          ),
        )}
      </p>

      {activa && (
        <div className={`mt-4 rounded-lg border p-4 text-sm ${COLOR[activa.tipo].panel}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${COLOR[activa.tipo].badge}`}
            >
              {COLOR[activa.tipo].label}
            </span>
            <button
              onClick={() => setActiva(null)}
              className="text-foreground/40 hover:text-foreground/70 text-lg leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-foreground/70 line-through mb-1">"{activa.etiqueta}"</p>
          <p className="text-xs text-foreground/75 mb-2">{activa.explicacion}</p>
          <p className="text-xs text-emerald-700 font-medium">→ {activa.correccion}</p>
        </div>
      )}
    </Card>
  );
}
