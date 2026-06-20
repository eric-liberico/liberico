import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — LIBerico" },
      {
        name: "description",
        content: "What LIBerico stores in your browser and why.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: CookiesPage,
});

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>;

const headingStyle = { ...fontSans, letterSpacing: "-0.02em" } as const;
const rootStyle: CSSVarStyle = {
  ...fontSans,
  backgroundColor: L.bg,
  color: L.ink,
  "--background": L.bg,
  "--foreground": L.ink,
  "--ink": L.ink,
  "--card": L.surface,
  "--card-foreground": L.ink,
  "--popover": L.surface,
  "--popover-foreground": L.ink,
  "--primary": L.primary,
  "--primary-foreground": "#FFFFFF",
  "--muted": L.bg2,
  "--muted-foreground": L.muted,
  "--border": L.line,
  "--ring": L.primary,
};

const scopedCss = `
  #cookies-root a:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #cookies-root code{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;background:${L.bg2};border:1px solid ${L.line};border-radius:8px;padding:0.08rem 0.28rem;color:${L.ink};}
  #cookies-root li::marker{color:${L.primary};}
`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold" style={headingStyle}>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: L.muted }}>
        {children}
      </div>
    </section>
  );
}

function CookiesPage() {
  return (
    <div id="cookies-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="mb-8 inline-block text-sm font-medium hover:underline"
          style={{ color: L.primary }}
        >
          ← Back to home
        </Link>

        <h1 className="mb-2 text-4xl font-semibold tracking-normal" style={headingStyle}>
          Cookie Policy
        </h1>
        <p className="mb-10 text-xs" style={{ ...fontMono, color: L.muted }}>
          Last updated: 17 May 2026
        </p>

        <Section title="Overview">
          <p>
            LIBerico uses cookies and browser storage only where needed to make the website work
            properly, keep you signed in, remember basic interface choices, and protect the service.
            A cookie is a small file stored on your device when you visit a website. On a later
            visit, it can help the site recognize your browser or retrieve a setting.
          </p>
          <p>
            LIBerico does not currently use advertising cookies, third-party analytics cookies, or
            marketing trackers. We do not share browsing data with advertising or analytics
            partners.
          </p>
        </Section>

        <Section title="Types of cookies and storage we use">
          <p>
            We group cookies and browser storage into the following categories. Strictly necessary
            storage is always active because LIBerico cannot work properly without it. Optional
            categories are not currently used on LIBerico.
          </p>
          <ul className="ml-4 list-disc space-y-3">
            <li>
              <strong>Strictly necessary:</strong> makes the service work, including login sessions,
              secure access, page navigation, account features, and basic interface state. This is
              always active.
            </li>
            <li>
              <strong>Preferences:</strong> remembers choices such as interface language, selected
              course, or subject view. LIBerico uses local browser storage for these settings rather
              than preference cookies.
            </li>
            <li>
              <strong>Statistics / analytics:</strong> would collect information about how visitors
              use the site. LIBerico does not currently set analytics cookies.
            </li>
            <li>
              <strong>Marketing / advertising:</strong> would track visitors across websites to
              deliver or measure advertising. LIBerico does not currently set marketing or
              advertising cookies.
            </li>
          </ul>
        </Section>

        <Section title="Current declaration">
          <p>LIBerico currently stores the following data in your browser:</p>
          <ul className="ml-4 list-disc space-y-3">
            <li>
              <strong>
                <code>sidebar_state</code> cookie:
              </strong>{" "}
              remembers whether the navigation sidebar is open or collapsed. It expires after 7
              days, uses <code>SameSite=Lax</code>, and contains no personal data, only{" "}
              <code>true</code> or <code>false</code>. Category: strictly necessary.
            </li>
            <li>
              <strong>Authentication session in localStorage:</strong> Supabase Auth stores your
              login session in your browser under a key specific to the LIBerico project. This is
              required for you to stay logged in between page visits. Category: strictly necessary.
            </li>
            <li>
              <strong>UI language preference in localStorage:</strong> if you switch between Spanish
              and English in the interface, your choice is saved so it persists across sessions.
              Category: preferences.
            </li>
            <li>
              <strong>Course or subject display preference in localStorage:</strong> where
              applicable, your selected subject or course view is remembered. Category: preferences.
            </li>
          </ul>
        </Section>

        <Section title="Third-party services">
          <p>
            Some parts of LIBerico rely on service providers such as Supabase for authentication and
            database services, Stripe for payments, AI providers for feedback generation, and Google
            Fonts for typography. These providers do not place advertising or analytics cookies on
            LIBerico pages through our current implementation.
          </p>
          <p>
            If you leave LIBerico for an external service, such as a Stripe checkout page or a
            third-party policy page, that service's own cookie and privacy practices apply.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            Because LIBerico does not currently set optional analytics or marketing cookies, there
            is no optional cookie consent panel to manage. Strictly necessary cookies and storage
            cannot be disabled from inside LIBerico because they are required for the service to
            function.
          </p>
          <p>
            You can still block or delete cookies and site data through your browser settings. Note
            that blocking or deleting certain data may affect how parts of the site function,
            including login, navigation state, and saved interface preferences.
          </p>
        </Section>

        <Section title="Clearing stored data">
          <p>You can remove all data LIBerico has stored in your browser at any time:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Sign out</strong> of LIBerico to clear your active authentication session from
              localStorage.
            </li>
            <li>
              Use your browser's <strong>"Clear site data"</strong> or{" "}
              <strong>"Clear browsing data"</strong> option and select cookies and site data for
              this site.
            </li>
          </ul>
          <p>
            Clearing localStorage will log you out of LIBerico. Your account data, including profile
            and history, remains on our servers until you delete your account from{" "}
            <Link to="/cuenta" className="hover:underline" style={{ color: L.primary }}>
              Account settings
            </Link>
            .
          </p>
        </Section>

        <Section title="Consent details">
          <p>
            Your cookie choices apply to LIBerico domains we control, including{" "}
            <code>liberico.app</code>. Since LIBerico does not currently set optional cookies, we do
            not issue a cookie-consent ID or store a separate cookie-consent record.
          </p>
        </Section>

        <Section title="Future changes">
          <p>
            If we introduce analytics, marketing, advertising, or other optional cookies in the
            future, we will add a consent management mechanism before setting those cookies and
            update this policy with the relevant providers, purposes, and retention periods.
          </p>
          <p>
            For questions about what LIBerico stores in your browser, contact us at{" "}
            <a
              href="mailto:epetterssonruiz@gmail.com"
              className="hover:underline"
              style={{ color: L.primary }}
            >
              epetterssonruiz@gmail.com
            </a>
            .
          </p>
        </Section>

        <p className="mt-10 text-xs" style={{ color: L.muted }}>
          See also our{" "}
          <Link to="/privacy" className="underline hover:opacity-80">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="underline hover:opacity-80">
            Terms & Conditions
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
