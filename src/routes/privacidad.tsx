import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LIBerico" },
      {
        name: "description",
        content: "How LIBerico collects, uses, and protects your personal data.",
      },
    ],
  }),
  component: PrivacidadPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/" className="mb-8 inline-block text-sm text-primary hover:underline">
          ← Back to home
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-semibold text-ink">Privacy Policy</h1>
        <p className="mb-10 text-xs text-foreground/40">Last updated: 1 May 2026</p>

        <Section title="Who we are">
          <p>
            LIBerico is an educational service for International Baccalaureate students, operated
            from Sweden. We are the data controller for your personal data under the General Data
            Protection Regulation (GDPR).
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
          </p>
        </Section>

        <Section title="What data we collect">
          <p>We collect only the data necessary to provide the service:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Account:</strong> email address and password (stored hashed). If you sign up
              with Google, we receive the email and name that Google provides.
            </li>
            <li>
              <strong>Profile:</strong> role (student or teacher), approximate exam date, and
              starting level you enter during onboarding.
            </li>
            <li>
              <strong>Evaluations:</strong> the literary texts and analyses you submit for
              correction, together with the generated feedback (bands, comments, annotations,
              rewrites). These are saved in your history so you can review them.
            </li>
            <li>
              <strong>1:1 sessions (if used):</strong> scheduling availability, session notes, and
              the email used to create the Google Calendar event.
            </li>
            <li>
              <strong>Technical usage data:</strong> number of AI requests and tokens consumed,
              without content, to manage quotas and operating costs.
            </li>
          </ul>
          <p>We do not collect geolocation, device fingerprints, or browsing behaviour.</p>
        </Section>

        <Section title="How we use your data">
          <ul className="ml-4 list-disc space-y-1">
            <li>To provide the correction and educational feedback service.</li>
            <li>To display your evaluation history.</li>
            <li>
              To allow your teacher (if you join a class) to view your progress, only after your
              explicit consent.
            </li>
            <li>To enforce daily usage quotas and prevent abuse.</li>
            <li>To detect and fix technical errors.</li>
          </ul>
          <p>
            We do not use your data for advertising. We do not sell or share it with third parties
            for commercial purposes.
          </p>
        </Section>

        <Section title="Third parties that process your data">
          <p>We work with the following sub-processors to deliver the service:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Anthropic (USA):</strong> the text you submit for correction is sent to the
              Claude API to generate feedback. Anthropic does not use API inputs to train its models
              by default. See their{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Supabase (USA / EU):</strong> stores your account, profile, and history in a
              PostgreSQL database with encryption at rest and in transit. See their{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Google (USA):</strong> if you book a 1:1 session, we create a Google Calendar
              event with a Google Meet link. Only the student's email, the teacher's email, the
              session time, and a session title are shared with Google.
            </li>
          </ul>
          <p>
            Transfers to the USA are covered by Standard Contractual Clauses approved by the
            European Commission and adopted by each provider.
          </p>
        </Section>

        <Section title="How long we keep your data">
          <p>
            We keep your data for as long as your account is active. If you delete your account
            from{" "}
            <Link to="/cuenta" className="text-primary hover:underline">
              Account settings
            </Link>
            , we permanently delete your profile, evaluation history, and all associated data.
            Technical usage logs are retained for a maximum of 90 additional days for operational
            security reasons.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Under the GDPR you have the right to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Access</strong> the data we hold about you (your history is visible directly
              in the app).
            </li>
            <li>
              <strong>Rectify</strong> incorrect data by emailing us.
            </li>
            <li>
              <strong>Delete</strong> your account and all your data from{" "}
              <Link to="/cuenta" className="text-primary hover:underline">
                Account settings
              </Link>
              .
            </li>
            <li>
              <strong>Object to or restrict</strong> processing by emailing us.
            </li>
            <li>
              <strong>Lodge a complaint</strong> with the Swedish Authority for Privacy Protection
              (Integritetsskyddsmyndigheten,{" "}
              <a
                href="https://www.imy.se"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                imy.se
              </a>
              ).
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="Minimum age">
          <p>
            LIBerico is designed for IB students. Under Swedish data protection law
            (Dataskyddslagen) and the GDPR, users must be at least 13 years old to use the service
            independently. Users under 13 require parental or guardian consent before creating an
            account.
          </p>
          <p>
            If you are a parent or guardian and believe your child under 13 has created an account
            without consent, please email us and we will delete it promptly.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use only the technical cookies necessary to keep your session active (managed by
            Supabase Auth). We do not use tracking cookies, third-party analytics, or advertising
            cookies.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes, we will notify you by email at least 14 days in advance.
            Continued use of the service after that date constitutes acceptance of the updated
            policy.
          </p>
        </Section>
      </div>
    </div>
  );
}
