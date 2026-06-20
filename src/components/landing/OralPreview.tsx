// OralPreview — static product preview for the Spanish B oral section on the landing.
//
// Replaces the cartoon-face OralAvatar with a faithful representation of the real product:
// a dark video-call frame (navy), a warm teacher portrait,
// a live chip, speaking/listening indicator, stimulus row, and a 2-turn transcript excerpt.
// Section background is LIGHT (#EFEDE7) so the page retains only 2 navy bands (authority + CTA).

import { Check, MessageCircle, Mic, Volume2, Image as ImageIcon } from "lucide-react";
import { landingFontSans as fontSans, landingFontMono as fontMono } from "@/lib/landing-theme";
import avatarProfesora from "@/assets/avatar-profesora.jpg";
import { Reveal } from "./Reveal";

// ── Local token mirror (matches EXACT values in LandingPage.tsx) ──────────────
const T = {
  bg2: "#EFEDE7",
  surface: "#FFFFFF",
  ink: "#0F172A",
  muted: "#5A6B86",
  line: "#E6E3DC",
  primary: "#4F46E5",
  amber: "#E8A13A",
  amberDeep: "#9A5E10",
  frame: "#1E1B4B", // navy — only used inside the video frame, not for section bg
} as const;

const cardShadow = "0 14px 30px -20px rgba(15,23,42,0.28), 0 2px 6px -3px rgba(15,23,42,0.08)";

// Frame-level palette (dark, matches DEEP in LandingPage)
const F = {
  text: "#ECEAFB",
  muted: "rgba(236,234,251,0.66)",
  border: "rgba(236,234,251,0.14)",
  surface: "rgba(255,255,255,0.05)",
} as const;

// ── Prop type — structural subset of COPY.es / COPY.en ───────────────────────
type OralCopy = {
  oralKicker: string;
  oralTitle: string;
  oralSub: string;
  oralPoints: string[];
  oralCredits: string;
  oralTeacher: string;
  oralLive: string;
  oralSpeaking: string;
  oralListening: string;
  oralMic: string;
  oralStimulus: string;
  oralTheme: string;
  oralLevel: string;
  oralShared: string;
  oralTurns: { who: "ai" | "user"; text: string }[];
};

// ── Teacher avatar — warm portrait, with lightweight speaking state ──────────
function TeacherAvatar({ speaking, reduce }: { speaking: boolean; reduce: boolean | null }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* speaking rings — respects reduced-motion */}
      {speaking && !reduce && (
        <>
          <span
            className="absolute rounded-full border border-[#4F46E5]/40 animate-ping"
            style={{ width: 112, height: 112, animationDuration: "1.8s" }}
          />
          <span
            className="absolute rounded-full border border-[#4F46E5]/20 animate-ping"
            style={{ width: 132, height: 132, animationDuration: "2.4s", animationDelay: "0.5s" }}
          />
        </>
      )}
      {/* portrait */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-full"
        style={{
          width: 86,
          height: 86,
          border: `3px solid ${speaking ? "rgba(232,161,58,0.92)" : "rgba(236,234,251,0.42)"}`,
          boxShadow: speaking
            ? "0 0 0 3px rgba(79,70,229,0.5), 0 14px 30px -12px rgba(0,0,0,0.68)"
            : "0 8px 22px -10px rgba(0,0,0,0.55)",
        }}
      >
        <img
          src={avatarProfesora}
          alt="Profesora IA"
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 42%" }}
        />
        {/* status dot */}
        <span
          className={
            speaking && !reduce
              ? "absolute bottom-1 right-1 rounded-full border-2 border-[#1E1B4B] animate-pulse"
              : "absolute bottom-1 right-1 rounded-full border-2 border-[#1E1B4B]"
          }
          style={{
            width: 12,
            height: 12,
            backgroundColor: speaking ? "#4ADE80" : "#93C5FD",
          }}
        />
      </div>
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
export function OralPreview({ c, reduce }: { c: OralCopy; reduce: boolean | null }) {
  // Static preview: AI is speaking (first turn is "ai")
  const speaking = true;
  // Show only the first 2 turns in the preview
  const previewTurns = c.oralTurns.slice(0, 2);

  return (
    <section
      className="relative overflow-hidden px-6 py-20 sm:px-8 sm:py-28"
      style={{ backgroundColor: T.bg2 }}
    >
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        {/* ── Left: copy ─────────────────────────────────────────────────────── */}
        <Reveal>
          {/* kicker */}
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: T.amber + "22" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.amber }} />
            <span
              className="text-[0.66rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: T.amberDeep }}
            >
              {c.oralKicker}
            </span>
          </div>

          <h2
            className="text-3xl font-extrabold leading-[1.1] sm:text-[2.6rem]"
            style={{ ...fontSans, color: T.ink, letterSpacing: "-0.025em" }}
          >
            {c.oralTitle}
          </h2>

          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed" style={{ color: T.muted }}>
            {c.oralSub}
          </p>

          <ul className="mt-7 space-y-3">
            {c.oralPoints.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[0.95rem]">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: T.amber + "26" }}
                >
                  <Check className="h-3 w-3" style={{ color: T.amber }} />
                </span>
                <span style={{ color: T.ink }}>{p}</span>
              </li>
            ))}
          </ul>

          <p className="mt-7 text-[0.78rem] uppercase tracking-[0.14em]" style={{ color: T.muted }}>
            {c.oralCredits}
          </p>
        </Reveal>

        {/* ── Right: product preview card ────────────────────────────────────── */}
        <Reveal
          delay={120}
          className="overflow-hidden rounded-[22px]"
          style={{
            backgroundColor: T.frame,
            border: `1px solid ${F.border}`,
            boxShadow: cardShadow,
          }}
        >
          {/* video frame */}
          <div
            className="relative flex flex-col items-center justify-center overflow-hidden"
            style={{
              aspectRatio: "4 / 3",
              background: "radial-gradient(120% 100% at 50% 0%, #2A2766 0%, #0B0A24 70%)",
            }}
          >
            {/* teacher avatar — centered */}
            <div className="flex flex-col items-center gap-3">
              <TeacherAvatar speaking={speaking} reduce={reduce} />

              {/* waveform bars when speaking */}
              {speaking && !reduce && (
                <div className="flex items-end gap-[3px]" aria-hidden>
                  {[4, 7, 10, 7, 12, 7, 4, 9, 5].map((h, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full animate-bounce"
                      style={{
                        height: h * 2,
                        backgroundColor: T.amber,
                        animationDelay: `${i * 0.09}s`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* vignette overlay */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{ boxShadow: "inset 0 0 90px 12px rgba(0,0,0,0.55)" }}
            />

            {/* live chip + timecode */}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span
                  className={reduce ? "h-2 w-2 rounded-full" : "h-2 w-2 animate-pulse rounded-full"}
                  style={{ backgroundColor: "#F87171" }}
                />
                <span
                  className="text-[0.6rem] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {c.oralLive}
                </span>
              </span>
              <span
                className="text-[0.6rem]"
                style={{ ...fontMono, color: "rgba(255,255,255,0.5)" }}
              >
                01:12
              </span>
            </div>

            {/* speaking/listening pill */}
            <div
              className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-bold"
              style={{
                backgroundColor: speaking ? T.amber : "rgba(255,255,255,0.16)",
                color: speaking ? "#1A1206" : F.text,
                backdropFilter: "blur(4px)",
              }}
            >
              {speaking ? <Volume2 className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              {speaking ? c.oralSpeaking : c.oralListening}
            </div>

            {/* lower-third teacher name */}
            <div
              className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-10"
              style={{ background: "linear-gradient(to top, rgba(8,8,28,0.85), transparent)" }}
            >
              <span className="text-[0.74rem] font-semibold" style={{ color: "#fff" }}>
                {c.oralTeacher}
              </span>
            </div>
          </div>

          {/* mic bar */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderTop: `1px solid ${F.border}`,
              borderBottom: `1px solid ${F.border}`,
            }}
          >
            <span
              className="relative flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Mic className="h-4 w-4" style={{ color: "rgba(255,255,255,0.7)" }} />
            </span>
            <span className="text-[0.8rem] font-medium" style={{ color: F.text }}>
              {c.oralMic}
            </span>
          </div>

          {/* shared stimulus row */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{ borderBottom: `1px solid ${F.border}` }}
          >
            <div
              className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md"
              style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
            >
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[0.72rem] font-semibold" style={{ color: F.text }}>
                {c.oralStimulus} · {c.oralLevel}
              </div>
              <div className="text-[0.62rem]" style={{ color: F.muted }}>
                {c.oralShared}
              </div>
            </div>
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em]"
              style={{ backgroundColor: T.amber + "22", color: T.amber }}
            >
              {c.oralTheme}
            </span>
          </div>

          {/* transcript excerpt (static — first 2 turns) */}
          <div className="space-y-3 px-5 py-5">
            {previewTurns.map((turn, i) => {
              const isAi = turn.who === "ai";
              return (
                <div key={i} className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
                  <div
                    className="flex max-w-[85%] items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[0.86rem] leading-snug"
                    style={{
                      backgroundColor: isAi ? F.surface : T.primary,
                      color: isAi ? F.text : "#fff",
                      border: isAi ? `1px solid ${F.border}` : "none",
                    }}
                  >
                    {isAi && (
                      <MessageCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: T.amber }}
                      />
                    )}
                    <span>{turn.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
