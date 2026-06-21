import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { LANDING as L, DEEP, CRIT, landingFontMono as fontMono } from "@/lib/landing-theme";
import type { LandingCopy } from "@/components/LandingPage";

type Crit = "A" | "B" | "C" | "D";

const LOOP = 24000;

// Estilos puramente visuales de la demo (se montan una vez con el componente).
const AC_CSS = `
.ac-card{position:relative;width:100%;max-width:34rem;height:600px;border-radius:22px;overflow:hidden;background:#fff;
  box-shadow:0 30px 60px -28px rgba(15,23,42,0.42),0 6px 16px -8px rgba(15,23,42,0.12);}
.ac-cursor{position:absolute;left:0;top:0;z-index:90;pointer-events:none;opacity:0;
  filter:drop-shadow(0 3px 6px rgba(15,23,42,.34));
  transition:transform .55s cubic-bezier(.45,0,.2,1),opacity .3s ease;}
.ac-stage{position:absolute;inset:0;transition:opacity .55s ease;}
.ac-body{position:relative;transition:transform .6s cubic-bezier(.5,0,.2,1);}
.ac-hl{border-radius:4px;padding:0 2px;border-bottom:2px solid transparent;background-color:transparent;
  transition:background-color .45s ease,border-color .45s ease;}
.ac-hl.on{background-color:var(--on-bg);border-bottom-color:var(--on-bd);}
.ac-fillbar{transform:scaleX(0);transform-origin:left;transition:transform .7s cubic-bezier(.5,0,.2,1);}
.ac-fillbar.on{transform:scaleX(1);}
.ac-btn{transition:transform .18s ease,box-shadow .25s ease;}
.ac-btn.pressed{animation:acRing .5s ease;}
@keyframes acRing{0%{box-shadow:0 0 0 0 rgba(79,70,229,.5)}100%{box-shadow:0 0 0 18px rgba(79,70,229,0)}}
.ac-lock{max-height:0;opacity:0;overflow:hidden;
  transition:max-height .6s cubic-bezier(.5,0,.2,1),opacity .4s ease;}
.ac-pop{transition:opacity .3s ease,transform .3s ease;opacity:0;}
.ac-pop.show{opacity:1;}
@media (prefers-reduced-motion: reduce){
  .ac-stage,.ac-body,.ac-hl,.ac-fillbar,.ac-btn,.ac-lock,.ac-pop,.ac-cursor{transition:none;}
}
`;

const fontSerif: CSSProperties = { fontFamily: "'Libre Baskerville', Georgia, serif" };
const serif = (rem: number, lh: number): CSSProperties => ({
  ...fontSerif,
  margin: 0,
  fontSize: `${rem}rem`,
  lineHeight: lh,
  color: "#3A3E48",
});
const critTint = (k: Crit) => CRIT[k] + "1f";
function pillBtn(rem = 0.8): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 13,
    background: L.primary,
    color: "#fff",
    padding: "11px 20px",
    fontSize: `${rem}rem`,
    fontWeight: 700,
    boxShadow: "0 8px 20px -8px rgba(79,70,229,.55)",
  };
}

export function HeroLoop({ c, reduce }: { c: LandingCopy; reduce: boolean }) {
  const h = c.heroLoop;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => runHeroLoop(cardRef.current, reduce), [reduce]);

  return (
    <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <style>{AC_CSS}</style>
      <div ref={cardRef} className="ac-card">
        {/* cursor */}
        <div className="ac-cursor" data-ac="cursor">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 2.5 L19.5 12.5 L12.6 13.2 L9.6 20 Z"
              fill="#0F172A"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* SCREEN 1 · INPUT */}
        <div
          className="ac-stage"
          data-ac="input"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "14px 18px 8px", borderBottom: `1px solid ${L.lineSoft}` }}>
            <div
              style={{
                ...fontMono,
                fontSize: "0.54rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: L.primary,
              }}
            >
              {h.deskLabel}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              padding: "14px 18px",
              minHeight: 0,
            }}
          >
            <Panel label={h.passageLabel}>
              <p style={serif(0.58, 1.68)}>{h.passage}</p>
            </Panel>
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 10 }}>
              <div>
                <Mono>{h.questionLabel}</Mono>
                <div
                  style={{
                    border: `1px solid ${L.line}`,
                    borderRadius: 11,
                    background: "#fff",
                    padding: "9px 11px",
                    fontSize: "0.64rem",
                    lineHeight: 1.4,
                    color: L.ink,
                  }}
                >
                  {h.question}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
                <Mono>{h.analysisLabel}</Mono>
                <div
                  data-ac="anaBox"
                  style={{
                    flex: 1,
                    border: `1px solid ${L.line}`,
                    borderRadius: 11,
                    background: "#FBFAF7",
                    padding: "11px 12px",
                    overflow: "hidden",
                  }}
                >
                  <div data-ac="anaInner" className="ac-body">
                    {h.analysis.map((p, i) => (
                      <p key={i} style={{ ...serif(0.58, 1.62), margin: i ? "8px 0 0" : 0 }}>
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px 16px",
              borderTop: `1px solid ${L.lineSoft}`,
            }}
          >
            <span style={{ ...fontMono, fontSize: "0.72rem", fontWeight: 600, color: L.amberDeep }}>
              {h.credits}
            </span>
            <span className="ac-btn" data-ac="evalBtn" style={pillBtn()}>
              ✦ {h.evalBtn}
            </span>
          </div>
        </div>

        {/* SCREEN 2 · RESULT */}
        <div
          className="ac-stage"
          data-ac="result"
          style={{ opacity: 0, display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "15px 18px",
              background: DEEP.bg,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  ...fontMono,
                  fontSize: "0.54rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  opacity: 0.62,
                }}
              >
                {h.resultLabel}
              </div>
              <div style={{ marginTop: 2, fontSize: "0.98rem", fontWeight: 700 }}>
                {h.resultTitle}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 14,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              <ScoreCell label={h.scoreLabel}>
                <span style={{ ...fontMono, fontSize: "1.4rem", fontWeight: 700 }}>
                  {h.scoreVal}
                  <span style={{ fontSize: "0.66rem", opacity: 0.6 }}>{h.scoreMax}</span>
                </span>
              </ScoreCell>
              <ScoreCell label={h.gradeLabel}>
                <span
                  style={{
                    ...fontMono,
                    display: "inline-block",
                    borderRadius: 8,
                    padding: "0 8px",
                    fontSize: "1.28rem",
                    fontWeight: 700,
                    background: L.ok,
                    color: "#fff",
                  }}
                >
                  {h.gradeVal}
                </span>
              </ScoreCell>
            </div>
          </div>

          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <div className="ac-body" data-ac="body" style={{ padding: "0 18px" }}>
              {/* criterios */}
              <div data-ac-anchor="secCrit" style={{ padding: "16px 0 6px" }}>
                <SectionHead>{h.critHeading}</SectionHead>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {h.crit.map((cr, i) => (
                    <div key={cr.l}>
                      {i === 2 && <span data-ac-anchor="crit2" />}
                      <CritCard cr={cr} />
                    </div>
                  ))}
                </div>
              </div>

              {/* global + fortalezas/áreas */}
              <div data-ac-anchor="secGlobal" style={{ padding: "8px 0" }}>
                <div
                  style={{
                    borderRadius: 13,
                    padding: "13px 14px",
                    background: L.bg2,
                    marginBottom: 10,
                  }}
                >
                  <Mono>{h.globalLabel}</Mono>
                  <p style={{ margin: 0, fontSize: "0.73rem", lineHeight: 1.6, color: L.ink }}>
                    {h.global}
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <SideCard accent={L.ok} label={h.strengthsLabel} body={h.strengths} />
                  <SideCard accent={L.primary} label={h.areasLabel} body={h.areas} />
                </div>
              </div>

              {/* CTA feedback completo */}
              <div data-ac-anchor="secCTA" style={{ padding: "14px 0" }}>
                <div
                  style={{
                    border: `1px dashed ${L.primary}`,
                    borderRadius: 14,
                    background: L.primary + "0a",
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      ...fontMono,
                      fontSize: "0.52rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: L.primary,
                      marginBottom: 7,
                    }}
                  >
                    {h.ctaChip}
                  </div>
                  <div
                    style={{ fontSize: "0.82rem", fontWeight: 700, color: L.ink, marginBottom: 4 }}
                  >
                    {h.ctaTitle}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: L.muted, marginBottom: 13 }}>
                    {h.ctaSub}
                  </div>
                  <span className="ac-btn" data-ac="fbBtn" style={pillBtn(0.78)}>
                    ✦ {h.fbBtn}
                  </span>
                </div>
              </div>

              {/* GATED */}
              <div className="ac-lock" data-ac="lock">
                {/* anotada */}
                <div data-ac-anchor="secAnnot" style={{ padding: "8px 0", position: "relative" }}>
                  <SectionHead>{h.annotHeading}</SectionHead>
                  {h.annot.map((para, pi) => (
                    <p
                      key={pi}
                      style={{
                        ...serif(0.72, 1.95),
                        margin: pi ? "12px 0 0" : 0,
                        color: "#2A2E3A",
                      }}
                    >
                      {para.map((seg, si) => {
                        const hl = (seg as { h?: string }).h;
                        const cc = (seg as { c?: Crit }).c;
                        if (hl && cc) {
                          return (
                            <span
                              key={si}
                              className="ac-hl"
                              style={
                                { "--on-bg": critTint(cc), "--on-bd": CRIT[cc] } as CSSProperties
                              }
                            >
                              {hl}
                            </span>
                          );
                        }
                        return <span key={si}>{(seg as { t?: string }).t}</span>;
                      })}
                    </p>
                  ))}
                  <span data-ac-anchor="annot3" />
                  <div
                    className="ac-pop"
                    data-ac="pop"
                    style={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      top: 54,
                      background: "#fff",
                      border: `1px solid ${L.line}`,
                      borderRadius: 13,
                      padding: "12px 14px",
                      zIndex: 5,
                      transform: "translateY(8px)",
                      boxShadow: "0 22px 50px -16px rgba(15,23,42,.36)",
                    }}
                  >
                    <div
                      style={{
                        ...fontMono,
                        fontSize: "0.52rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: CRIT.D,
                        fontWeight: 600,
                        marginBottom: 5,
                      }}
                    >
                      {h.pop.kicker}
                    </div>
                    <div style={{ fontSize: "0.68rem", lineHeight: 1.5, color: L.muted }}>
                      {h.pop.body}
                    </div>
                    <div
                      style={{ marginTop: 6, fontSize: "0.72rem", fontWeight: 600, color: L.ok }}
                    >
                      → {h.pop.fix}
                    </div>
                  </div>
                </div>

                {/* lenguaje */}
                <div data-ac-anchor="secLang" style={{ padding: "10px 0" }}>
                  <SectionHead>{h.langHeading}</SectionHead>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {h.lang.map((d, i) => (
                      <LangCard key={i} d={d} />
                    ))}
                  </div>
                </div>

                {/* ensayo banda alta */}
                <div data-ac-anchor="secEssay" style={{ padding: "10px 0 22px" }}>
                  <SectionHead>{h.essayHeading}</SectionHead>
                  <div style={{ fontSize: "0.66rem", color: L.muted, marginBottom: 11 }}>
                    {h.essaySub}
                  </div>
                  <div
                    style={{
                      borderLeft: `3px solid ${L.ok}`,
                      background: "rgba(21,128,61,0.07)",
                      borderRadius: 11,
                      padding: "13px 15px",
                    }}
                  >
                    {h.essay.map((p, i) => (
                      <p key={i} style={{ ...serif(0.72, 1.72), margin: "0 0 9px", color: L.ink }}>
                        {i === 1 && <span data-ac-anchor="essay2" />}
                        {i === 2 && <span data-ac-anchor="essay3" />}
                        {p}
                      </p>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                    {h.chips.map((ch) => (
                      <span
                        key={ch.c}
                        style={{
                          ...fontMono,
                          fontSize: "0.56rem",
                          fontWeight: 600,
                          background: CRIT[ch.c] + "14",
                          color: CRIT[ch.c],
                          borderRadius: 9999,
                          padding: "4px 10px",
                        }}
                      >
                        {ch.t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...fontMono,
        fontSize: "0.5rem",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: L.muted,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...fontMono,
        fontSize: "0.54rem",
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: L.primary,
        marginBottom: 11,
      }}
    >
      {children}
    </div>
  );
}

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Mono>{label}</Mono>
      <div
        style={{
          flex: 1,
          border: `1px solid ${L.line}`,
          borderRadius: 11,
          background: "#FBFAF7",
          padding: "11px 12px",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ScoreCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          ...fontMono,
          fontSize: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          opacity: 0.7,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 1, lineHeight: 1 }}>{children}</div>
    </div>
  );
}

function CritCard({ cr }: { cr: LandingCopy["heroLoop"]["crit"][number] }) {
  const color = CRIT[cr.l];
  return (
    <div style={{ border: `1px solid ${L.line}`, borderRadius: 13, padding: "13px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              ...fontMono,
              width: 20,
              height: 20,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 700,
              background: color + "22",
              color,
            }}
          >
            {cr.l}
          </span>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: L.ink }}>{cr.n}</span>
        </span>
        <span style={{ ...fontMono, fontSize: "0.98rem", fontWeight: 700, color }}>
          {cr.s}
          <span style={{ fontSize: "0.58rem", fontWeight: 400, color: L.muted }}>/{cr.max}</span>
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 9, background: L.line, overflow: "hidden" }}>
        <div
          className="ac-fillbar"
          style={{
            height: "100%",
            width: `${(cr.s / cr.max) * 100}%`,
            background: color,
            borderRadius: 9,
          }}
        />
      </div>
      <p style={{ margin: "9px 0 0", fontSize: "0.68rem", lineHeight: 1.5, color: L.muted }}>
        {cr.comment}
      </p>
    </div>
  );
}

function SideCard({ accent, label, body }: { accent: string; label: string; body: string }) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        background: "#fff",
        border: `1px solid ${L.line}`,
        padding: "11px 12px",
      }}
    >
      <div
        style={{
          ...fontMono,
          fontSize: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.13em",
          color: accent,
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <p style={{ margin: 0, fontSize: "0.67rem", lineHeight: 1.5, color: L.muted }}>{body}</p>
    </div>
  );
}

function LangCard({ d }: { d: LandingCopy["heroLoop"]["lang"][number] }) {
  const verb = d.kind === "verb";
  return (
    <div
      style={{
        background: verb ? "#FBF6EC" : "#FCF1F3",
        border: `1px solid ${verb ? "#EADFC8" : "#F3D6DD"}`,
        borderRadius: 11,
        padding: "10px 12px",
      }}
    >
      <span
        style={{
          ...fontMono,
          display: "inline-block",
          background: verb ? L.amber + "22" : CRIT.D + "18",
          color: verb ? L.amberDeep : CRIT.D,
          borderRadius: 7,
          padding: "1px 8px",
          fontSize: "0.62rem",
          fontWeight: 600,
          marginBottom: 5,
        }}
      >
        {d.tag}
      </span>
      <div style={{ fontSize: "0.68rem", color: "#9aa1ad", textDecoration: "line-through" }}>
        {d.from}
      </div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: L.ok, marginTop: 1 }}>{d.to}</div>
    </div>
  );
}

function runHeroLoop(card: HTMLDivElement | null, reduce: boolean): (() => void) | void {
  if (!card) return;
  const q = (s: string) => card.querySelector(s) as HTMLElement | null;
  const input = q('[data-ac="input"]')!;
  const result = q('[data-ac="result"]')!;
  const body = q('[data-ac="body"]')!;
  const cursor = q('[data-ac="cursor"]')!;
  const evalBtn = q('[data-ac="evalBtn"]')!;
  const fbBtn = q('[data-ac="fbBtn"]')!;
  const pop = q('[data-ac="pop"]')!;
  const lock = q('[data-ac="lock"]')!;
  const anaInner = q('[data-ac="anaInner"]')!;
  const anaBox = q('[data-ac="anaBox"]')!;
  const hls = Array.from(card.querySelectorAll<HTMLElement>(".ac-hl"));
  const fills = Array.from(card.querySelectorAll<HTMLElement>(".ac-fillbar"));
  const anchor = (n: string) => card.querySelector<HTMLElement>(`[data-ac-anchor="${n}"]`);

  const cursorTo = (t: HTMLElement | null, sc = 1) => {
    if (!t) {
      cursor.style.opacity = "0";
      return;
    }
    const c = card.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${r.left - c.left + r.width * 0.5 - 4}px,${
      r.top - c.top + r.height * 0.5 - 2
    }px) scale(${sc})`;
  };
  const scrollTo = (name: string) => {
    const s = anchor(name);
    if (!s) return;
    const vp = body.parentElement!;
    let d = s.getBoundingClientRect().top - body.getBoundingClientRect().top;
    const maxS = body.scrollHeight - vp.clientHeight;
    if (d > maxS) d = maxS;
    if (d < 0) d = 0;
    body.style.transform = `translateY(${-d}px)`;
  };
  const press = (b: HTMLElement) => {
    b.classList.add("pressed");
    setTimeout(() => b.classList.remove("pressed"), 520);
  };
  const panAna = () => {
    const amt = anaInner.scrollHeight - anaBox.clientHeight;
    if (amt > 0) anaInner.style.transform = `translateY(${-amt}px)`;
  };
  const openLock = () => {
    lock.style.maxHeight = "6000px";
    lock.style.opacity = "1";
  };
  const reset = () => {
    result.style.opacity = "0";
    input.style.opacity = "1";
    body.style.transition = "none";
    body.style.transform = "translateY(0)";
    anaInner.style.transition = "none";
    anaInner.style.transform = "translateY(0)";
    void body.offsetWidth;
    body.style.transition = "";
    anaInner.style.transition = "";
    lock.style.maxHeight = "0px";
    lock.style.opacity = "0";
    hls.forEach((x) => x.classList.remove("on"));
    fills.forEach((f) => f.classList.remove("on"));
    pop.classList.remove("show");
    cursor.style.opacity = "0";
    cursor.style.transform = "translate(232px,150px) scale(1)";
  };
  const renderStatic = () => {
    input.style.opacity = "0";
    result.style.opacity = "1";
    openLock();
    fills.forEach((f) => f.classList.add("on"));
    hls.forEach((x) => x.classList.add("on"));
    body.style.transform = "translateY(0)";
    cursor.style.opacity = "0";
  };

  // móvil o reduced-motion → resultado estático, sin rAF.
  const desktop = window.matchMedia("(min-width:1024px)").matches;
  if (reduce || !desktop) {
    renderStatic();
    return;
  }

  const steps: { t: number; fn: () => void }[] = [
    { t: 0, fn: reset },
    { t: 600, fn: panAna },
    { t: 2600, fn: () => cursorTo(evalBtn) },
    {
      t: 3400,
      fn: () => {
        cursorTo(evalBtn, 0.82);
        press(evalBtn);
      },
    },
    {
      t: 3900,
      fn: () => {
        input.style.opacity = "0";
        result.style.opacity = "1";
        cursor.style.opacity = "0";
        scrollTo("secCrit");
        fills.forEach((f, i) => setTimeout(() => f.classList.add("on"), 250 + i * 150));
      },
    },
    { t: 5600, fn: () => scrollTo("crit2") },
    { t: 7000, fn: () => scrollTo("secGlobal") },
    { t: 8400, fn: () => scrollTo("secCTA") },
    { t: 9100, fn: () => cursorTo(fbBtn) },
    {
      t: 9900,
      fn: () => {
        cursorTo(fbBtn, 0.82);
        press(fbBtn);
        openLock();
      },
    },
    {
      t: 10700,
      fn: () => {
        cursor.style.opacity = "0";
        scrollTo("secAnnot");
        hls.forEach((x, i) => setTimeout(() => x.classList.add("on"), i * 170));
      },
    },
    { t: 12000, fn: () => pop.classList.add("show") },
    {
      t: 13500,
      fn: () => {
        pop.classList.remove("show");
        scrollTo("annot3");
      },
    },
    { t: 14900, fn: () => scrollTo("secLang") },
    { t: 16500, fn: () => scrollTo("secEssay") },
    { t: 18500, fn: () => scrollTo("essay2") },
    { t: 20300, fn: () => scrollTo("essay3") },
    {
      t: 22400,
      fn: () => {
        result.style.opacity = "0";
        anaInner.style.transition = "none";
        anaInner.style.transform = "translateY(0)";
        void anaInner.offsetWidth;
        anaInner.style.transition = "";
        input.style.opacity = "1";
      },
    },
  ];

  let raf = 0;
  let last = -1;
  let t0 = 0;
  let running = false;
  let visible = false;
  const frame = (now: number) => {
    const t = (now - t0) % LOOP;
    let idx = 0;
    for (let i = 0; i < steps.length; i++) if (t >= steps[i].t) idx = i;
    if (idx !== last) {
      last = idx;
      try {
        steps[idx].fn();
      } catch {
        /* noop */
      }
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = -1;
    t0 = performance.now();
    reset();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    },
    { threshold: 0.2 },
  );
  io.observe(card);
  const onVis = () => {
    if (document.hidden) stop();
    else if (visible) start();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    stop();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}
