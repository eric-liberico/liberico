import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Sparkles } from "lucide-react";
import { LANDING as L } from "@/lib/landing-theme";
import type { ClaseBooking } from "./types";
import { focusLabel } from "./clase-helpers";

type Note = { summary: string | null; next_steps: string | null };

export function StudentRoom({ booking, isEN }: { booking: ClaseBooking; isEN: boolean }) {
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("booking_notes")
        .select("summary, next_steps")
        .eq("booking_id", booking.id)
        .eq("visible_to_student", true)
        .maybeSingle();
      if (error) {
        console.error("booking_notes fetch (StudentRoom):", error);
        return;
      }
      setNote((data as Note | null) ?? null);
    })();
  }, [booking.id]);

  const prepTips = isEN
    ? ["Review your last 2-3 corrections in LIBerico", "Write down 2-3 specific questions", "Bring a pending text if you have one"]
    : ["Revisa tus últimas 2-3 correcciones en LIBerico", "Anota 2-3 dudas concretas", "Trae un texto pendiente si lo tienes"];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-4" style={{ backgroundColor: L.bg2, borderColor: L.line }}>
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: L.primary }}>
          {isEN ? "Session focus" : "Enfoque de la sesión"}
        </div>
        <div className="text-base font-semibold" style={{ color: L.ink }}>
          {focusLabel(booking.session_focus, isEN)}
        </div>
        {booking.student_goal && (
          <p className="mt-2 text-sm" style={{ color: L.ink }}>
            <span className="font-semibold">{isEN ? "Your goal: " : "Tu objetivo: "}</span>{booking.student_goal}
          </p>
        )}
      </div>

      <div className="rounded-2xl border p-4" style={{ backgroundColor: L.surface, borderColor: L.line }}>
        <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: L.ok }}>
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          {isEN ? "How to prepare" : "Cómo prepararte"}
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm" style={{ color: L.ink }}>
          {prepTips.map((t) => <li key={t}>{t}</li>)}
        </ul>
        {booking.theory_focus_id && (
          <Link to="/teoria" className="clase-press mt-3 inline-flex text-sm font-semibold" style={{ color: L.primary }}>
            {isEN ? "Open theory" : "Abrir teoría"}
          </Link>
        )}
      </div>

      {note && (note.summary || note.next_steps) && (
        <div className="rounded-2xl border p-4" style={{ backgroundColor: L.surface, borderColor: L.line }}>
          <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: L.ink }}>
            <BookOpen aria-hidden="true" className="h-4 w-4" />
            {isEN ? "Your teacher's notes" : "Notas de tu profesora"}
          </p>
          {note.summary && (
            <div className="mt-2">
              <p className="text-xs font-semibold" style={{ color: L.muted }}>{isEN ? "Summary" : "Resumen"}</p>
              <p className="text-sm leading-relaxed" style={{ color: L.ink }}>{note.summary}</p>
            </div>
          )}
          {note.next_steps && (
            <div className="mt-2">
              <p className="text-xs font-semibold" style={{ color: L.muted }}>{isEN ? "Next steps" : "Próximos pasos"}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: L.ink }}>{note.next_steps}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
