import { Check } from "lucide-react";
import { LANDING as L, cardShadow, landingFontMono as fontMono } from "@/lib/landing-theme";
import { Reveal } from "@/components/landing/Reveal";
import type { LandingCopy } from "@/components/LandingPage";

export function CorrectionTiers({ c }: { c: LandingCopy }) {
  const t = c.tiers2;
  return (
    <section style={{ padding: "72px 24px", backgroundColor: L.bg }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <Reveal>
          <div
            style={{
              ...fontMono,
              fontSize: "0.62rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: L.primary,
              marginBottom: 12,
            }}
          >
            {t.kicker}
          </div>
          <h2
            style={{
              fontSize: "2.3rem",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              margin: "0 0 8px",
              maxWidth: "30rem",
              color: L.ink,
            }}
          >
            {t.title}
          </h2>
          <p
            style={{
              fontSize: "1.02rem",
              lineHeight: 1.6,
              color: L.muted,
              maxWidth: "38rem",
              margin: "0 0 36px",
            }}
          >
            {t.sub}
          </p>
        </Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 20,
          }}
        >
          <Reveal>
            <TierCard
              accent={L.ok}
              tag={t.base.tag}
              price={t.base.price}
              title={t.base.title}
              points={t.base.points}
            />
          </Reveal>
          <Reveal delay={100}>
            <TierCard
              accent={L.primary}
              tag={t.full.tag}
              price={t.full.price}
              title={t.full.title}
              points={t.full.points}
              badge={t.full.badge}
              featured
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TierCard({
  accent,
  tag,
  price,
  title,
  points,
  badge,
  featured,
}: {
  accent: string;
  tag: string;
  price: string;
  title: string;
  points: readonly string[];
  badge?: string;
  featured?: boolean;
}) {
  return (
    <div
      className="lib-card"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        background: L.surface,
        border: `1px solid ${featured ? L.primary : L.line}`,
        boxShadow: featured ? "0 24px 50px -26px rgba(79,70,229,0.4)" : cardShadow,
        padding: 28,
      }}
    >
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: L.primary,
            color: "#fff",
            fontSize: "0.58rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "5px 14px",
            borderBottomLeftRadius: 12,
          }}
        >
          {badge}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...fontMono,
            fontSize: "0.62rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: accent,
          }}
        >
          {tag}
        </div>
        <span
          style={{
            ...fontMono,
            fontSize: "0.92rem",
            fontWeight: 600,
            background: accent + "14",
            color: accent,
            borderRadius: 9,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {price}
        </span>
      </div>
      <h3
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          margin: "0 0 14px",
          letterSpacing: "-0.01em",
          color: L.ink,
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {points.map((p) => (
          <span
            key={p}
            style={{
              display: "flex",
              gap: 10,
              fontSize: "0.92rem",
              lineHeight: 1.45,
              color: L.ink,
            }}
          >
            <Check
              className="h-4 w-4 shrink-0"
              style={{ color: accent, marginTop: 2 }}
              aria-hidden
            />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
