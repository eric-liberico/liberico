import { createFileRoute, Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  LANDING_FONT_LINK,
  LANDING as L,
  landingFontMono as fontMono,
  landingFontSans as fontSans,
} from "@/lib/landing-theme";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — LIBerico" },
      {
        name: "description",
        content: "Terms and conditions for using LIBerico.",
      },
    ],
    links: [{ rel: "stylesheet", href: LANDING_FONT_LINK }],
  }),
  component: TermsPage,
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
  #terms-root a{color:${L.primary};}
  #terms-root a:focus-visible{outline:2px solid ${L.primary};outline-offset:3px;border-radius:10px;}
  #terms-root li::marker{color:${L.primary};}
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

function TermsPage() {
  return (
    <div id="terms-root" className="min-h-screen" style={rootStyle}>
      <style>{scopedCss}</style>
      <SiteHeader claro />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="mb-8 inline-block text-sm font-medium hover:underline">
          ← Back to home
        </Link>

        <h1 className="mb-2 text-4xl font-semibold tracking-normal" style={headingStyle}>
          Terms & Conditions
        </h1>
        <p className="mb-10 text-xs" style={{ ...fontMono, color: L.muted }}>
          Last updated: 17 May 2026
        </p>

        <Section title="About LIBerico">
          <p>
            LIBerico is an AI-assisted educational practice tool for students preparing for the
            International Baccalaureate (IB) Language A: Literature and Language B assessments. The
            service is available online through a web browser under domains we control, including
            liberico.app, and may include written feedback, annotated comments, oral-practice
            transcription, simulated oral practice, study planning, teacher views, bookings, and
            credit-based access to paid features. LIBerico is operated from Sweden.
          </p>
          <p>
            LIBerico is not affiliated with, endorsed by, or connected to the International
            Baccalaureate Organization (IBO). "International Baccalaureate" and "IB" are registered
            trademarks of the IBO. LIBerico does not guarantee any specific IB score or exam
            outcome.
          </p>
          <p>
            By creating an account or using LIBerico you agree to these Terms & Conditions and our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Definitions">
          <p>
            In these Terms, "LIBerico", "we", "our", or "the service" means the LIBerico digital
            learning platform. "User" means any student, parent or guardian, teacher, school
            representative, or other person who creates an account or uses the service. "Your
            content" means texts, essays, oral recordings, transcripts, notes, answers, study
            information, and other material you submit to LIBerico.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            To use LIBerico you must meet the minimum age and consent requirements described in our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            (at least 13 years old, or with parental/guardian consent where your country's law
            requires a higher age). If you are signing up on behalf of a minor, you confirm that you
            have the authority to do so.
          </p>
        </Section>

        <Section title="Service delivery and support">
          <p>
            We aim to provide LIBerico in a professional, secure, and reliable manner. The service
            may be updated, changed, limited, or temporarily unavailable for maintenance, security,
            capacity, or legal reasons. Where practical, we will give advance notice of major
            planned interruptions.
          </p>
          <p>
            Support is provided by email at{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
            . We do not guarantee that the service will be uninterrupted, error-free, or available
            at all times.
          </p>
        </Section>

        <Section title="Account responsibility">
          <p>
            Each account is personal to the registered user unless we have explicitly agreed
            otherwise for a school or teacher account. You are responsible for keeping your account
            credentials and devices secure. Do not share your password or allow unauthorized access.
            Account ownership may not be transferred, sold, or shared with other people. Provide
            accurate account information and keep it up to date. Notify us immediately at{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>{" "}
            if you believe your account has been compromised.
          </p>
          <p>
            We may suspend, block, or require additional verification for an account where necessary
            to protect users, prevent fraud, enforce quotas, or protect the integrity of the
            service.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            LIBerico must be used responsibly and only for educational practice, feedback, revision,
            tutoring, and classroom support connected to IB preparation or comparable learning
            activities.
          </p>
          <p>You agree to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Review all AI-generated feedback, transcripts, scores, and suggested rewrites.</li>
            <li>
              Use your own academic judgment and, where possible, consult a qualified teacher.
            </li>
            <li>Comply with school rules, IB rules, and laws that apply to your use.</li>
            <li>
              Submit only material you have the right to use and that is appropriate for educational
              analysis.
            </li>
          </ul>
          <p>You agree not to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Abuse, spam, or overload the service in ways that harm other users.</li>
            <li>
              Use robots, scrapers, spiders, or other automated tools to access, mine, copy, or
              extract data from the service without permission.
            </li>
            <li>
              Reverse-engineer, decompile, tamper with, disable, or circumvent any part of the
              service, including security controls, credit controls, quotas, prompts, or model
              settings.
            </li>
            <li>
              Attempt to access another user's account, teacher view, class, content, or data.
            </li>
            <li>
              Manipulate service content, inject code, transmit malware, or interfere with the
              security, integrity, or operation of LIBerico.
            </li>
            <li>Upload content that is illegal, harmful, or violates third-party rights.</li>
            <li>
              Use the service to generate impersonation, harassment, admissions fraud, plagiarism,
              or other dishonest academic or professional conduct.
            </li>
            <li>
              Upload, post, transmit, or make available material that is obscene, pornographic,
              threatening, abusive, hateful, discriminatory, defamatory, exploitative, misleading,
              deceptive, or invasive of another person's privacy.
            </li>
            <li>
              Upload images, recordings, or personal information about another person unless you
              have the right and consent to do so.
            </li>
            <li>
              Send junk mail, spam, chain letters, solicitations, or large amounts of repetitive or
              untargeted content through the service.
            </li>
            <li>
              Frame, mirror, sublicense, translate, resell, or commercially exploit any part of the
              service without our written permission.
            </li>
            <li>Remove copyright, attribution, legal, or proprietary notices from the service.</li>
            <li>Use the service outside its intended educational purpose.</li>
          </ul>
        </Section>

        <Section title="Academic integrity">
          <p>
            LIBerico is a practice and learning tool. Feedback generated by LIBerico is intended to
            help you understand your work, identify areas for improvement, and revise your writing.
          </p>
          <p>
            <strong>
              You must not submit AI-generated text as your own work in any IB assessment or
              examination.
            </strong>{" "}
            Using LIBerico to produce text that you present as your own in an assessed context
            constitutes academic dishonesty and may violate your school's academic integrity policy
            and IB regulations.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You retain ownership of the texts and work you submit to LIBerico. By submitting
            content, you grant LIBerico a limited, non-exclusive licence to process that content
            solely to provide, secure, operate, support, and improve the service. We do not claim
            ownership of your work and do not sell it to third parties.
          </p>
          <p>
            You may request access to your account data by contacting us. If you delete your account
            from{" "}
            <Link to="/cuenta" className="text-primary hover:underline">
              Account settings
            </Link>
            , your active profile, history, and associated educational content are permanently
            removed from our systems. Backups and technical security logs may be retained for a
            limited period as described in our Privacy Policy.
          </p>
        </Section>

        <Section title="AI limitations">
          <p>
            Feedback generated by LIBerico is produced by AI models and may be incomplete,
            inaccurate, or inconsistent. It does not constitute official IB marking or a guarantee
            of any specific score. You should always review AI feedback critically and discuss it
            with a qualified teacher or examiner where possible.
          </p>
          <p>
            Materials, explanations, feedback, scores, study plans, and examples on LIBerico are
            provided as general educational information only. They are not professional, legal,
            medical, financial, psychological, immigration, admissions, or official academic advice,
            and must not be relied on as such.
          </p>
        </Section>

        <Section title="Accuracy, usefulness, and external resources">
          <p>
            We provide LIBerico in good faith and aim for accuracy, but we do not warrant or
            guarantee that any information, feedback, generated material, downloadable material, or
            linked resource will be accurate, complete, current, useful, free from defects, or fit
            for your particular purpose.
          </p>
          <p>
            The service may contain links to third-party websites, providers, files, or resources.
            Those links are provided for convenience and do not mean that LIBerico endorses or
            controls them. You access external websites, downloads, and third-party services at your
            own risk.
          </p>
          <p>
            Internet access, browser software, cloud services, payment services, and third-party
            networks are outside our control. You are responsible for using appropriate security
            measures on your own devices and connections.
          </p>
        </Section>

        <Section title="Copyright">
          <p>
            You must only submit texts that you are permitted to use for educational analysis (for
            example, works your school has licensed or texts in the public domain). LIBerico does
            not reproduce or distribute protected works. Brief quotations used for the purpose of
            literary commentary fall within fair use / fair dealing principles in most
            jurisdictions, but you are responsible for ensuring your use is lawful.
          </p>
        </Section>

        <Section title="Confidentiality and data protection">
          <p>
            We treat non-public account, class, submission, and feedback data as confidential and
            only use it as needed to provide, secure, support, and improve LIBerico, or where
            required by law. Users must not disclose another user's private information obtained
            through the service.
          </p>
          <p>
            Personal data is handled according to our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . Both LIBerico and users who process personal data through the service must comply with
            applicable data protection laws.
          </p>
        </Section>

        <Section title="Sessions and bookings">
          <p>
            If you use the tutoring booking feature, scheduling data (availability, session times,
            email addresses used for Google Calendar and Meet invites) is handled as described in
            our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            . Session arrangements are between you and the teacher; LIBerico facilitates the booking
            but is not a party to the tutoring relationship.
          </p>
        </Section>

        <Section title="Credits, payments, and billing">
          <p>
            LIBerico may offer free access, test credits, paid credits, subscriptions, school
            licences, or other paid features. Current credit pricing, limits, and feature costs are
            shown in the app before purchase or use. Credits are a licence to use LIBerico features;
            they are not money, stored value, or a transferable balance.
          </p>
          <p>
            Paid credit purchases are processed by Stripe. LIBerico does not store card details.
            Unless stated otherwise at checkout, fees are shown before payment and applicable taxes
            may be calculated and collected by Stripe. Currency conversion and card-provider fees
            are handled by your payment provider. Payments must be made using the payment methods
            and currencies made available at checkout.
          </p>
          <p>
            Credits do not expire under the current product model, but feature prices and credit
            rules may change with reasonable notice. You should confirm the current price and credit
            cost of a feature before purchasing credits or using a paid feature. We may suspend or
            limit paid access for unpaid charges, chargebacks, fraud, abuse, or violations of these
            Terms.
          </p>
          <p>
            Refund requests made within seven days of purchase may be reviewed individually, but are
            not guaranteed unless required by law. Refunds may be refused where credits have already
            been used, where the request appears abusive, or where the purchase was made within two
            weeks of the May or November IB examination periods. Duplicate or erroneous charges will
            be reviewed separately. For purchase questions, contact{" "}
            <a href="mailto:epetterssonruiz@gmail.com" className="text-primary hover:underline">
              epetterssonruiz@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            LIBerico, including the software, interface, prompts, feedback formats, lesson
            structure, assessment logic, design, branding, and documentation, is owned by LIBerico
            or its licensors. These Terms give you a limited, personal, non-transferable right to
            use the service during the time your account is active and in accordance with these
            Terms.
          </p>
          <p>
            Feedback and generated educational material are provided for your own learning,
            teaching, and revision. Improvements, fixes, ideas, or feature suggestions relating to
            LIBerico may be used by us without obligation, while your submitted work remains yours.
          </p>
          <p>
            Except where we expressly allow it, you may not copy, reproduce, publish, distribute,
            modify, create derivative works from, rent, lease, sell, transfer, display, transmit,
            compile, scrape, collect into a database, store a substantial portion of, or otherwise
            commercially exploit LIBerico content or services. All rights not expressly granted to
            you are reserved by LIBerico and its licensors.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            LIBerico is provided as an educational support tool. To the fullest extent permitted by
            law, we are not liable for indirect, incidental, consequential, or special damages,
            including lost grades, lost opportunity, loss of data, loss of profit, or reliance on AI
            feedback. Our total liability for any claim is limited to the amount you paid to
            LIBerico during the six months before the claim, unless a higher amount is required by
            mandatory law.
          </p>
          <p>
            Nothing in these Terms excludes liability that cannot legally be excluded, including
            rights you may have under mandatory consumer protection laws.
          </p>
        </Section>

        <Section title="Force majeure">
          <p>
            We are not responsible for failure or delay caused by events outside our reasonable
            control, including internet outages, cloud-provider incidents, payment-provider
            incidents, changes in law, labour disputes, security incidents, natural disasters, or
            other circumstances we could not reasonably prevent.
          </p>
        </Section>

        <Section title="Suspension and termination">
          <p>
            LIBerico reserves the right to prevent, restrict, suspend, or terminate access for
            technical, security, legal, operational, payment, abuse-prevention, or enforcement
            reasons, including where an account violates these Terms, misuses the service, or
            engages in harmful behaviour. We will advise you as soon as reasonably practicable where
            appropriate.
          </p>
          <p>
            You may delete your account at any time from{" "}
            <Link to="/cuenta" className="text-primary hover:underline">
              Account settings
            </Link>
            . Deletion permanently removes your profile and evaluation history from our systems.
          </p>
        </Section>

        <Section title="Governing law and disputes">
          <p>
            These Terms are governed by Swedish law, except where mandatory consumer protection
            rules in your country provide otherwise. If a dispute cannot be resolved informally, it
            may be brought before the competent Swedish courts unless mandatory law gives you the
            right to bring the dispute elsewhere.
          </p>
        </Section>

        <Section title="Severability">
          <p>
            If any part of these Terms is found to be invalid, illegal, or unenforceable, that part
            will be limited or removed to the minimum extent necessary, and the remaining Terms will
            continue in effect.
          </p>
        </Section>

        <Section title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. For material changes we will notify you by
            email or via an in-app notice before the changes take effect. Continued use of the
            service after that date constitutes acceptance of the updated Terms.
          </p>
          <p>
            Questions? Contact us at{" "}
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
          <Link to="/cookies" className="underline hover:text-foreground/70">
            Cookie Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
