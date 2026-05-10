import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — LIBerico" },
      {
        name: "description",
        content: "What LIBerico stores in your browser and why.",
      },
    ],
  }),
  component: CookiesPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/" className="mb-8 inline-block text-sm text-primary hover:underline">
          ← Back to home
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-semibold text-ink">Cookie Policy</h1>
        <p className="mb-10 text-xs text-foreground/40">Last updated: 10 May 2026</p>

        <Section title="What LIBerico does not use">
          <p>
            LIBerico does not use advertising cookies, third-party analytics cookies, or tracking
            cookies of any kind. We do not share any browsing data with advertisers or analytics
            platforms.
          </p>
        </Section>

        <Section title="What we store in your browser">
          <p>
            LIBerico stores a small amount of data in your browser to make the service work. Here is
            what we store and why:
          </p>
          <ul className="ml-4 list-disc space-y-3">
            <li>
              <strong>Authentication session (localStorage):</strong> Supabase Auth stores your
              login session in your browser's <code>localStorage</code> under a key specific to the
              LIBerico project. This is required for you to stay logged in between page visits. No
              personal data other than your session token is stored here.
            </li>
            <li>
              <strong>UI language preference (localStorage):</strong> if you switch between Spanish
              and English in the interface, your choice is saved in <code>localStorage</code> so it
              persists across sessions.
            </li>
            <li>
              <strong>Course/subject display preference (localStorage):</strong> where applicable,
              your selected subject or course view is remembered in <code>localStorage</code>.
            </li>
            <li>
              <strong>Sidebar state (cookie):</strong> a cookie named <code>sidebar_state</code> is
              set to remember whether the navigation sidebar is open or collapsed. It expires after
              7 days, uses <code>SameSite=Lax</code>, and contains no personal data — only the
              string <code>true</code> or <code>false</code>.
            </li>
          </ul>
        </Section>

        <Section title="Clearing stored data">
          <p>You can remove all data LIBerico has stored in your browser at any time:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Sign out</strong> of LIBerico — this clears your session from localStorage.
            </li>
            <li>
              Use your browser's <strong>"Clear site data"</strong> or{" "}
              <strong>"Clear browsing data"</strong> option and select cookies and site data for
              this site.
            </li>
          </ul>
          <p>
            Note: clearing localStorage will log you out of LIBerico. Your account data (history,
            profile) remains on our servers until you delete your account from{" "}
            <Link to="/cuenta" className="text-primary hover:underline">
              Account settings
            </Link>
            .
          </p>
        </Section>

        <Section title="Future changes">
          <p>
            If we ever introduce analytics or marketing cookies, we will add a consent management
            mechanism before setting any such cookies, and update this policy accordingly.
          </p>
          <p>
            For any questions about what is stored in your browser, contact us at{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
            .
          </p>
        </Section>

        <p className="mt-10 text-xs text-foreground/40">
          See also our{" "}
          <Link to="/privacy" className="underline hover:text-foreground/70">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="underline hover:text-foreground/70">
            Terms & Conditions
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
