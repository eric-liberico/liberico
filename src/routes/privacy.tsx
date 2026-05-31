import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LIBerico" },
      {
        name: "description",
        content: "How LIBerico collects, uses, and protects your personal data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/" className="mb-8 inline-block text-sm text-primary hover:underline">
          ← Back to home
        </Link>

        <h1 className="mb-2 font-serif text-3xl font-semibold text-ink">Privacy Policy</h1>
        <p className="mb-10 text-xs text-foreground/40">Last updated: 17 May 2026</p>

        <Section title="Who we are">
          <p>
            LIBerico is an educational service for International Baccalaureate students, operated
            from Sweden through domains we control, including liberico.app. We are the data
            controller for your personal data under the General Data Protection Regulation (GDPR).
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
          </p>
        </Section>

        <Section title="Our role">
          <p>
            When you create an individual account, use LIBerico directly, buy credits, book a
            session, or contact us, LIBerico decides why and how your data is processed and acts as
            data controller.
          </p>
          <p>
            If LIBerico is provided to you through a school, teacher, or other organization under a
            separate written agreement, that organization may be the controller for some classroom
            or school-managed processing. In that case, LIBerico may act as processor and process
            the relevant data only under that organization's documented instructions and the
            applicable data processing agreement.
          </p>
        </Section>

        <Section title="What data we collect">
          <p>We collect only the data necessary to provide the service:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Account:</strong> email address, password (stored hashed by Supabase Auth),
              and, where provided, your name.
            </li>
            <li>
              <strong>Profile:</strong> role (student or teacher), approximate exam date, course
              (e.g. Español A: Literatura, English A: Literature, Spanish B), and starting level you
              enter during onboarding.
            </li>
            <li>
              <strong>Submissions and feedback:</strong> the literary texts and analyses you submit
              for correction, together with the AI-generated feedback (bands, comments, annotations,
              rewrites). These are saved in your history so you can review them.
            </li>
            <li>
              <strong>Oral practice (if used):</strong> audio recordings you submit for the
              Individual Oral module and the resulting transcripts and feedback.
            </li>
            <li>
              <strong>Teacher–student links (if used):</strong> if you join a class, we store the
              link between your account and your teacher's account.
            </li>
            <li>
              <strong>1:1 sessions (if used):</strong> scheduling availability, session notes, and
              the email used to create the Google Calendar event.
            </li>
            <li>
              <strong>Payments (if used):</strong> purchase amount, credits purchased, Stripe
              Checkout session ID, Stripe payment reference, payment status, and credit
              transactions. LIBerico does not store full card numbers or card security codes.
            </li>
            <li>
              <strong>Technical usage data:</strong> number of AI requests and tokens consumed,
              credit usage, and product events such as when a feature is started or completed, to
              manage quotas, billing, product reliability, and operating costs.
            </li>
            <li>
              <strong>Security and server logs:</strong> our hosting, database, payment, and API
              providers may automatically process standard request information such as IP address,
              request URL, browser headers, timestamps, authentication status, and error logs so the
              service can run securely and reliably.
            </li>
          </ul>
          <p>
            We do not use clear gifs or web beacons, Google Analytics, advertising cookies,
            remarketing, precise geolocation, or device fingerprinting.
          </p>
        </Section>

        <Section title="How we use your data">
          <ul className="ml-4 list-disc space-y-1">
            <li>To provide the correction and educational feedback service.</li>
            <li>To display your evaluation history.</li>
            <li>
              To allow your teacher (if you join a class) to view your progress, only after your
              explicit consent.
            </li>
            <li>To enforce usage quotas, credit balances, payment status, and prevent abuse.</li>
            <li>To detect and fix technical errors.</li>
            <li>To manage session bookings where applicable.</li>
            <li>To send service-related notices, receipts, security messages, or legal notices.</li>
          </ul>
          <p>
            We do not use your data for advertising. We do not sell or share it with third parties
            for commercial purposes.
          </p>
        </Section>

        <Section title="Legal basis">
          <p>
            We process personal data only where we have a lawful basis under the GDPR. Depending on
            the feature and context, this may include:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Contract:</strong> to create and manage your account, provide corrections,
              store your history, manage credits and purchases, and deliver booked sessions.
            </li>
            <li>
              <strong>Legitimate interests:</strong> to keep the service secure, prevent abuse,
              debug errors, understand feature usage, improve the product, and respond to enquiries.
            </li>
            <li>
              <strong>Consent:</strong> where required for optional teacher access, certain
              communications, or future non-essential cookies or tracking technologies.
            </li>
            <li>
              <strong>Legal obligation and legal claims:</strong> where we must keep records,
              respond to lawful requests, comply with accounting or tax rules, or establish,
              exercise, or defend legal claims.
            </li>
          </ul>
          <p>
            You are not required to provide personal data, but some data is necessary to create an
            account or use specific features. Without it, parts of LIBerico may not work.
          </p>
        </Section>

        <Section title="When we share your data">
          <p>
            We do not rent or sell your personally identifiable information. We share personal data
            only where necessary to provide, secure, support, or bill for LIBerico, or where
            required by law.
          </p>
          <p>
            This includes sharing data with the sub-processors listed below, responding to valid
            legal requests, enforcing our Terms & Conditions, investigating suspected abuse or
            fraud, protecting the rights and safety of users, and handling a merger, acquisition, or
            similar business transition if LIBerico is ever transferred to another operator.
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
              <strong>OpenAI (USA):</strong> if you use the Individual Oral module, your audio
              recording is sent to OpenAI Whisper for transcription. OpenAI does not use API inputs
              to train its models by default. See their{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>ElevenLabs (USA):</strong> if you use the Oral Simulator, your voice and the
              conversation transcript are processed by ElevenLabs Conversational AI to generate the
              examiner's voice responses. See their{" "}
              <a
                href="https://elevenlabs.io/privacy"
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
            <li>
              <strong>Stripe (USA / EU):</strong> if you buy credits, Stripe processes the checkout,
              payment method, fraud checks, receipts, and related payment records. LIBerico receives
              payment status, session identifiers, amount, and credit-purchase metadata, but not
              your full card details. See Stripe's{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Google Fonts (USA):</strong> the app loads the Inter and Lora typefaces from
              Google's servers. Google may receive your IP address and browser headers when serving
              fonts. Google Fonts does not set cookies according to Google's documentation. See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google's privacy policy
              </a>
              .
            </li>
          </ul>
          <p>
            Transfers outside the EEA are protected by appropriate safeguards, such as European
            Commission adequacy decisions, Standard Contractual Clauses approved by the European
            Commission, and equivalent contractual and technical safeguards adopted by the relevant
            provider.
          </p>
        </Section>

        <Section title="How we protect your data">
          <p>
            Passwords are handled by Supabase Auth and stored in hashed form. Personal data is kept
            in databases protected by row-level security, access controls, encryption in transit,
            and provider-managed infrastructure security. Administrative access is limited to people
            who need it to operate and support LIBerico.
          </p>
          <p>
            No online service can guarantee perfect security. You can reduce risk by using a strong,
            unique password, keeping your device and browser up to date, and contacting us
            immediately if you believe your account has been accessed without permission.
          </p>
        </Section>

        <Section title="How long we keep your data">
          <p>
            We keep your data for as long as your account is active. If you delete your account from{" "}
            <Link to="/cuenta" className="text-primary hover:underline">
              Account settings
            </Link>
            , we permanently delete your account profile, evaluation history, bookings, credit
            purchase records, and associated educational content from the active application
            database. Product-event records may remain in anonymized or aggregated form where they
            are no longer linked to your account. Technical security logs and provider backups may
            be retained for a limited period, normally no more than 90 additional days, for
            operational security and recovery reasons.
          </p>
          <p>
            Aggregated or irreversibly anonymized information that no longer identifies you may be
            kept for product analysis, statistics, and service improvement.
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
              <strong>Restrict or object to</strong> processing by emailing us.
            </li>
            <li>
              <strong>Portability</strong> — receive a copy of the data you have provided to us in a
              structured, machine-readable format by emailing us.
            </li>
            <li>
              <strong>Withdraw consent</strong> at any time where processing is based on consent.
              This does not affect processing that happened before withdrawal.
            </li>
            <li>
              <strong>Not be subject to solely automated decisions</strong> that produce legal or
              similarly significant effects, unless permitted by law with appropriate safeguards.
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
              ) or your local EU/EEA data protection authority.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
            . We will respond within 30 days.
          </p>
          <p>
            We may need to verify your identity before acting on a request. We may refuse or limit a
            request where the law allows this, for example if a request is manifestly unfounded,
            excessive, repetitive, or would adversely affect another person's rights.
          </p>
        </Section>

        <Section title="AI-generated feedback">
          <p>
            LIBerico uses AI models (Claude by Anthropic, and others) to generate practice feedback
            on your work. This feedback is educational support designed to help you improve your IB
            writing and oral skills — it is not official IB grading, not a prediction of your final
            IB score, and not a legally or significantly binding automated decision about you.
          </p>
          <p>
            AI feedback can be incomplete or incorrect. You should always review it critically and
            discuss it with your teacher. LIBerico makes no guarantee of any particular exam
            outcome.
          </p>
        </Section>

        <Section title="Marketing communications">
          <p>
            We do not currently send advertising newsletters or third-party marketing. If we
            introduce optional marketing emails in the future, we will do so only where permitted by
            law and will provide a clear unsubscribe or opt-out mechanism.
          </p>
        </Section>

        <Section title="Minimum age">
          <p>
            LIBerico is designed for IB students. Users must be at least 13 years old to use the
            service independently. In EU countries where the minimum age for digital services is
            higher (up to 16 years, depending on national law), users below that age require
            parental or guardian consent before creating an account.
          </p>
          <p>
            If you are a parent or guardian and believe your child has created an account without
            the required consent, please email us and we will delete it promptly.
          </p>
        </Section>

        <Section title="Security incidents">
          <p>
            If we become aware of a personal data breach that is likely to affect your rights or
            freedoms, we will notify the relevant supervisory authority where required by law and,
            where feasible, within 72 hours of becoming aware of the breach. We will notify affected
            users without undue delay where the breach is likely to result in a high risk to their
            rights and freedoms.
          </p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            LIBerico does not use tracking cookies, third-party analytics, or advertising cookies.
            For full details, see our{" "}
            <Link to="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="External links">
          <p>
            LIBerico may link to third-party websites, policies, documentation, or services. When
            you leave LIBerico, the privacy practices of the third-party site or service apply. We
            are not responsible for the content, security, or privacy practices of external sites.
          </p>
        </Section>

        <Section title="UK users">
          <p>
            If you are located in the United Kingdom, we also handle your personal data in
            accordance with the UK GDPR and the Data Protection Act 2018 where they apply.
            International transfers from the UK are protected using UK adequacy regulations,
            International Data Transfer Agreements, or UK addenda to Standard Contractual Clauses
            where required.
          </p>
          <p>
            UK users may complain to the Information Commissioner's Office (ICO) if they believe
            their data protection rights have been infringed, without affecting any right to seek a
            judicial remedy.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes, we will notify you by email at least 30 days in advance.
            Continued use of the service after that date constitutes acceptance of the updated
            policy.
          </p>
        </Section>
      </div>
    </div>
  );
}
