import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowDown, BookOpen, ChevronRight, Loader2, Lock } from "lucide-react";
import { LANDING as L, landingFontSans as fontSans } from "@/lib/landing-theme";
import type { ClaseBooking, SessionFocus } from "./types";
import {
  type CritAvg,
  focusLabel,
  oralAverages,
  orderByFocus,
  p1Averages,
  p2Averages,
  weakestCrit,
} from "./clase-helpers";
import { CorrectionReader } from "./CorrectionReader";

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;

type P1Row = {
  id: string;
  created_at: string;
  banda_a: number;
  banda_b: number;
  banda_c: number;
  banda_d: number;
  nota_ib: number | null;
  texto_literario: string | null;
};
type P2Row = {
  id: string;
  created_at: string;
  criterio_a: number;
  criterio_b1: number;
  criterio_b2: number;
  criterio_c: number;
  criterio_d: number;
  pregunta: string | null;
};
type OralRow = {
  id: string;
  created_at: string;
  criterio_a: number;
  criterio_b: number;
  criterio_c: number;
  criterio_d: number;
  asunto_global: string | null;
};

type Note = {
  id: string;
  summary: string | null;
  next_steps: string | null;
  visible_to_student: boolean;
};

type CorrectionRowData = {
  paper: SessionFocus;
  id: string;
  created_at: string;
  scores: string;
  nota: number | null;
  title: string;
};

function CritBar({
  crits,
  weakest,
  isEN,
}: {
  crits: CritAvg[];
  weakest: string | null;
  isEN: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {crits.map((c) => {
        const isWeak = c.key === weakest;
        return (
          <span
            key={c.key}
            title={isWeak ? (isEN ? "Weakest criterion" : "Criterio más flojo") : undefined}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums"
            style={{
              backgroundColor: isWeak ? "#FFF1F2" : L.bg2,
              borderColor: isWeak ? "#FB7185" : L.line,
              color: isWeak ? "#BE123C" : L.ink,
            }}
          >
            {isWeak && (
              <>
                <ArrowDown aria-hidden="true" className="h-3 w-3" />
                <span className="sr-only">{isEN ? "Weakest: " : "Más flojo: "}</span>
              </>
            )}
            {c.label} {c.value ?? "—"}/{c.max}
          </span>
        );
      })}
    </div>
  );
}

function CorrectionRow({
  row,
  isEN,
  onOpen,
}: {
  row: CorrectionRowData;
  isEN: boolean;
  onOpen: (paper: SessionFocus, id: string) => void;
}) {
  const dateLabel = new Date(row.created_at).toLocaleDateString(isEN ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <button
      type="button"
      onClick={() => onOpen(row.paper, row.id)}
      className="clase-press clase-row flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left"
      style={{ backgroundColor: L.surface, borderColor: L.line }}
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold tabular-nums" style={{ color: L.ink }}>
          {dateLabel} · {row.scores}
          {row.nota != null && (
            <span style={{ color: L.primary }}>
              {" "}
              · {isEN ? "Grade" : "Nota"} {row.nota}
            </span>
          )}
        </span>
        {row.title && (
          <span className="mt-0.5 block truncate text-xs" style={{ color: L.muted }}>
            {row.title}
          </span>
        )}
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold"
        style={{ color: L.primary }}
      >
        {isEN ? "Read" : "Leer"}
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function TeacherRoom({ booking, isEN }: { booking: ClaseBooking; isEN: boolean }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [p1, setP1] = useState<P1Row[]>([]);
  const [p2, setP2] = useState<P2Row[]>([]);
  const [oral, setOral] = useState<OralRow[]>([]);
  const [reader, setReader] = useState<{ paper: SessionFocus; id: string } | null>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState({ summary: "", next_steps: "", visible: false });
  const [savingNote, setSavingNote] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: access }, { data: noteData }] = await Promise.all([
      supabase
        .from("booking_teacher_access")
        .select("student_id")
        .eq("booking_id", booking.id)
        .lte("access_starts_at", new Date().toISOString())
        .gt("access_ends_at", new Date().toISOString())
        .is("revoked_at", null)
        .maybeSingle(),
      supabase
        .from("booking_notes")
        .select("id, summary, next_steps, visible_to_student")
        .eq("booking_id", booking.id)
        .eq("teacher_id", user.id)
        .maybeSingle(),
    ]);

    setNote(noteData as Note | null);
    setDraft({
      summary: noteData?.summary ?? "",
      next_steps: noteData?.next_steps ?? "",
      visible: noteData?.visible_to_student ?? false,
    });

    if (!access?.student_id) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setHasAccess(true);

    const [{ data: perfil }, { data: p1d }, { data: p2d }, { data: orald }] = await Promise.all([
      supabase.from("perfiles").select("email").eq("user_id", booking.student_id).maybeSingle(),
      supabase
        .from("evaluaciones")
        .select("id, created_at, banda_a, banda_b, banda_c, banda_d, nota_ib, texto_literario")
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("evaluaciones_prueba2")
        .select(
          "id, created_at, criterio_a, criterio_b1, criterio_b2, criterio_c, criterio_d, pregunta",
        )
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("evaluaciones_oral")
        .select("id, created_at, criterio_a, criterio_b, criterio_c, criterio_d, asunto_global")
        .eq("user_id", booking.student_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setStudentEmail(perfil?.email ?? null);
    setP1((p1d ?? []) as P1Row[]);
    setP2((p2d ?? []) as P2Row[]);
    setOral((orald ?? []) as OralRow[]);
    setLoading(false);
  }, [user, booking.id, booking.student_id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardarNota = useCallback(async () => {
    if (!user) return;
    setSavingNote(true);
    const payload = {
      summary: draft.summary || null,
      next_steps: draft.next_steps || null,
      visible_to_student: draft.visible,
    };
    const { error } = note
      ? await supabase.from("booking_notes").update(payload).eq("id", note.id)
      : await supabase
          .from("booking_notes")
          .insert({ booking_id: booking.id, teacher_id: user.id, ...payload });
    if (error) {
      toast.error(isEN ? "Error saving notes" : "Error al guardar las notas");
    } else {
      toast.success(isEN ? "Notes saved" : "Notas guardadas");
      void cargar();
    }
    setSavingNote(false);
  }, [user, note, draft, booking.id, isEN, cargar]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" style={{ color: L.muted }} />
      </div>
    );
  }

  const order = orderByFocus(booking.session_focus);
  const p1Crits = p1.length > 0 ? p1Averages(p1).crits : [];
  const p2Crits = p2.length > 0 ? p2Averages(p2).crits : [];
  const oralCrits = oral.length > 0 ? oralAverages(oral).crits : [];

  const p1RowsData: CorrectionRowData[] = p1.map((e) => ({
    paper: "p1",
    id: e.id,
    created_at: e.created_at,
    nota: e.nota_ib,
    scores: `A${e.banda_a} B${e.banda_b} C${e.banda_c} D${e.banda_d}`,
    title: e.texto_literario ?? "",
  }));
  const p2RowsData: CorrectionRowData[] = p2.map((e) => ({
    paper: "p2",
    id: e.id,
    created_at: e.created_at,
    nota: null,
    scores: `A${e.criterio_a} B${e.criterio_b1}/${e.criterio_b2} C${e.criterio_c} D${e.criterio_d}`,
    title: e.pregunta ?? "",
  }));
  const oralRowsData: CorrectionRowData[] = oral.map((e) => ({
    paper: "oral",
    id: e.id,
    created_at: e.created_at,
    nota: null,
    scores: `A${e.criterio_a} B${e.criterio_b} C${e.criterio_c} D${e.criterio_d}`,
    title: e.asunto_global ?? "",
  }));

  const paperData: Record<SessionFocus, { crits: CritAvg[]; rows: CorrectionRowData[] }> = {
    p1: { crits: p1Crits, rows: p1RowsData },
    p2: { crits: p2Crits, rows: p2RowsData },
    oral: { crits: oralCrits, rows: oralRowsData },
  };

  const onOpen = (paper: SessionFocus, id: string) => setReader({ paper, id });
  const noCorrections = p1.length === 0 && p2.length === 0 && oral.length === 0;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {/* Cabecera del alumno */}
          <div
            className="rounded-2xl border p-4"
            style={{ backgroundColor: L.bg2, borderColor: L.line }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: L.primary }}
            >
              {isEN ? "Session focus" : "Enfoque de la sesión"}
            </div>
            <div className="text-base font-semibold" style={{ color: L.ink }}>
              {focusLabel(booking.session_focus, isEN)}
            </div>
            {hasAccess && studentEmail && (
              <div className="mt-1 text-sm" style={{ color: L.muted }}>
                {studentEmail}
              </div>
            )}
            {booking.student_goal && (
              <p className="mt-2 text-sm" style={{ color: L.ink }}>
                <span className="font-semibold">{isEN ? "Goal: " : "Objetivo: "}</span>
                {booking.student_goal}
              </p>
            )}
          </div>

          {!hasAccess ? (
            <div
              className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
              style={{ backgroundColor: L.surface, borderColor: L.line, color: L.muted }}
            >
              <Lock aria-hidden="true" className="h-4 w-4" />
              {isEN ? "No access to the student's history." : "Sin acceso al historial del alumno."}
            </div>
          ) : noCorrections ? (
            <p className="text-sm" style={{ color: L.muted }}>
              {isEN
                ? "This student has no corrections yet."
                : "Este alumno aún no tiene correcciones."}
            </p>
          ) : (
            <div className="space-y-5">
              {order
                .filter((f) => paperData[f].rows.length > 0)
                .map((f) => (
                  <div key={f} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold" style={headingStyle}>
                        {focusLabel(f, isEN)}
                      </h2>
                      <CritBar
                        crits={paperData[f].crits}
                        weakest={weakestCrit(paperData[f].crits)}
                        isEN={isEN}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {paperData[f].rows.map((row) => (
                        <CorrectionRow key={row.id} row={row} isEN={isEN} onOpen={onOpen} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Notas de la clase */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div
            className="rounded-2xl border p-4"
            style={{ backgroundColor: L.surface, borderColor: L.line }}
          >
            <h2 className="flex items-center gap-1.5 text-sm font-semibold" style={headingStyle}>
              <BookOpen aria-hidden="true" className="h-4 w-4" style={{ color: L.primary }} />
              {isEN ? "Class notes" : "Notas de la clase"}
            </h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="clase-note-summary" style={{ color: L.ink }}>
                  {isEN ? "Summary" : "Resumen"}
                </Label>
                <Textarea
                  id="clase-note-summary"
                  value={draft.summary}
                  onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                  rows={4}
                  className="resize-none rounded-xl"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clase-note-next" style={{ color: L.ink }}>
                  {isEN ? "Next steps" : "Próximos pasos"}
                </Label>
                <Textarea
                  id="clase-note-next"
                  value={draft.next_steps}
                  onChange={(e) => setDraft((d) => ({ ...d, next_steps: e.target.value }))}
                  rows={4}
                  className="resize-none rounded-xl"
                  style={{ backgroundColor: L.surface, borderColor: L.line, color: L.ink }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm" style={{ color: L.ink }}>
                <Checkbox
                  checked={draft.visible}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, visible: v === true }))}
                />
                {isEN ? "Visible to student" : "Visible para el alumno"}
              </label>
              <Button
                type="button"
                onClick={guardarNota}
                disabled={savingNote}
                className="clase-press w-full rounded-xl"
                style={{ backgroundColor: L.primary, color: "#fff" }}
              >
                {savingNote && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                {isEN ? "Save notes" : "Guardar notas"}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {reader && (
        <CorrectionReader
          paper={reader.paper}
          id={reader.id}
          isEN={isEN}
          onClose={() => setReader(null)}
        />
      )}
    </>
  );
}
