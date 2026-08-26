// app/privacy-policy/page.tsx
//
// PUBLIC route — place this OUTSIDE the (dashboard) route group so it does not
// inherit the auth-gated dashboard layout. Anyone (including carrier/TCR
// compliance reviewers) must be able to open https://www.suprah-app.com/privacy-policy
// with no login, no redirect, and no client-side auth check.
//
// Server component, statically rendered: the full policy text is present in the
// initial HTML so automated compliance crawlers that don't execute JS still see
// the SMS consent language.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Suprah AI",
  description:
    "Privacy Policy for the Suprah AI platform and communications sent on behalf of its dealership clients, including SMS/text messaging consent and opt-out terms.",
  alternates: { canonical: "https://www.suprah-app.com/privacy-policy" },
  robots: { index: true, follow: true },
};

// Fully static — no request-time data.
export const dynamic = "force-static";

const LAST_UPDATED = "August 25, 2026";

const SECTIONS = [
  { id: "information-we-collect", label: "1. Information We Collect" },
  { id: "how-information-is-used", label: "2. How Your Information Is Used" },
  { id: "sms-text-messaging", label: "3. SMS / Text Messaging" },
  { id: "how-information-is-shared", label: "4. How Information Is Shared" },
  { id: "cookies", label: "5. Cookies and Website Analytics" },
  { id: "data-security", label: "6. Data Security" },
  { id: "data-retention", label: "7. Data Retention" },
  { id: "your-choices", label: "8. Your Choices and Rights" },
  { id: "childrens-privacy", label: "9. Children's Privacy" },
  { id: "changes", label: "10. Changes to This Policy" },
  { id: "contact", label: "11. Contact" },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-base font-black uppercase tracking-[0.12em] text-foreground sm:text-lg"
    >
      {children}
    </h2>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      {/* ── Digital backdrop: same subtle grid + ambient glow as the dashboard ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(120,120,120,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,120,120,0.05)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent_80%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(700px_circle_at_15%_-5%,rgba(16,185,129,0.06),transparent_55%),radial-gradient(600px_circle_at_85%_0%,rgba(34,211,238,0.04),transparent_55%)]" />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* ── Header banner ── */}
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 px-5 py-7 backdrop-blur-xl sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/50 to-transparent" />
          </div>
          <div className="relative">
            <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
              Suprah.AI
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
              Privacy{" "}
              <span className="bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="mt-2 text-xs font-medium text-muted-foreground/70 sm:text-sm">
              Last updated: {LAST_UPDATED} ·{" "}
              <a
                href="https://www.suprah-app.com"
                className="text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                www.suprah-app.com
              </a>
            </p>
          </div>
        </header>

        {/* ── Intro ── */}
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/80">
          <p>
            Suprah AI (&ldquo;Suprah,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) provides a customer relationship management and communications
            platform used by automotive dealerships to manage customer inquiries, appointments,
            purchases, and communications, including text messaging.
          </p>
          <p>
            This Privacy Policy applies to the Suprah AI platform and to customer communications
            sent through it on behalf of the dealerships that use our platform (&ldquo;Dealership
            Clients&rdquo;).{" "}
            <strong className="font-bold text-foreground">
              All Dealership Clients on the Suprah AI platform — including Action Auto Utah
              (Action Auto Sales and Finance, LLC), 170 W State Street, Lehi, UT 84043 — adhere
              to this Privacy Policy for communications sent through the platform.
            </strong>{" "}
            When you interact with a Dealership Client by phone, text message, or through their
            website forms, this policy governs how that information is collected and handled
            within the Suprah AI platform, together with any privacy policy published by the
            Dealership Client itself.
          </p>
        </div>

        {/* ── Table of contents ── */}
        <nav
          aria-label="Table of contents"
          className="mt-6 rounded-2xl border border-border/30 bg-background/40 p-4 sm:p-5"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
            On this page
          </p>
          <ul className="mt-2.5 grid gap-x-6 gap-y-1.5 text-xs font-medium sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-foreground/70 transition-colors hover:text-emerald-500"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Body ── */}
        <div className="mt-8 space-y-10 text-sm leading-relaxed text-foreground/80">
          {/* 1 */}
          <section className="space-y-3">
            <SectionHeading id="information-we-collect">1. Information We Collect</SectionHeading>
            <p>Through the platform, we and our Dealership Clients may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Contact information:</strong> your name,
                phone number, email address, and mailing address.
              </li>
              <li>
                <strong className="text-foreground">Inquiry and transaction information:</strong>{" "}
                the vehicles you ask about, appointments you schedule, and details related to
                your purchase, trade-in, financing, or service visit with a Dealership Client.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> records of calls,
                emails, and text messages exchanged with a Dealership Client through the
                platform.
              </li>
              <li>
                <strong className="text-foreground">Website usage information:</strong> basic
                technical data such as IP address, browser type, and pages visited, collected
                through cookies and similar technologies on our website.
              </li>
            </ul>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <SectionHeading id="how-information-is-used">
              2. How Your Information Is Used
            </SectionHeading>
            <p>Information collected through the platform is used to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Respond to your inquiries about vehicles, pricing, and availability;</li>
              <li>Schedule and confirm appointments and test drives;</li>
              <li>
                Support purchases, trade-ins, financing, and service handled by the Dealership
                Client;
              </li>
              <li>Send you updates about your transaction or appointment;</li>
              <li>
                Send occasional promotional offers from the Dealership Client if you have
                consented to receive them;
              </li>
              <li>Operate, secure, and improve the Suprah AI platform; and</li>
              <li>Comply with legal and regulatory requirements.</li>
            </ul>
          </section>

          {/* 3 — SMS: the section carrier compliance reviewers check. Visually
              distinguished so it is impossible to miss. */}
          <section className="space-y-3">
            <SectionHeading id="sms-text-messaging">3. SMS / Text Messaging</SectionHeading>
            <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/6 p-4 sm:p-5">
              <p>
                By providing your mobile phone number to a Dealership Client on the Suprah AI
                platform — in person, over the phone, or through forms on the dealership&rsquo;s
                website — you consent to receive text messages from that dealership regarding
                your inquiries, appointments, vehicle purchase, financing status, and occasional
                promotional offers.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">Message frequency varies.</strong>
                </li>
                <li>
                  <strong className="text-foreground">Message and data rates may apply.</strong>
                </li>
                <li>
                  <strong className="text-foreground">
                    Consent is not a condition of purchase.
                  </strong>
                </li>
                <li>
                  Reply <strong className="text-foreground">STOP</strong> at any time to opt out
                  of text messages.
                </li>
                <li>
                  Reply <strong className="text-foreground">HELP</strong> for assistance, or
                  contact the dealership directly. For Action Auto Utah:{" "}
                  <a
                    href="https://www.actionautoutah.com"
                    className="text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    www.actionautoutah.com
                  </a>{" "}
                  or{" "}
                  <a
                    href="tel:+13852303168"
                    className="text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    +1&nbsp;385&nbsp;230&nbsp;3168
                  </a>
                  .
                </li>
              </ul>
              <p>
                <strong className="font-bold text-foreground">
                  No mobile opt-in data or telephone numbers will be shared with, or sold to,
                  third parties or affiliates for marketing or promotional purposes.
                </strong>{" "}
                Text messaging originator opt-in data and consent will not be shared with any
                third parties, excluding vendors and service providers acting on behalf of
                Suprah AI or the Dealership Client solely to deliver those messages (such as the
                SMS carrier service provider), who are contractually prohibited from using your
                information for any other purpose. This commitment applies to Suprah AI and to
                every Dealership Client on the platform, including Action Auto Utah (Action Auto
                Sales and Finance, LLC).
              </p>
            </div>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <SectionHeading id="how-information-is-shared">
              4. How Information Is Shared
            </SectionHeading>
            <p>We do not sell your personal information. Information within the platform is shared only:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Between <strong className="text-foreground">you and the Dealership Client</strong>{" "}
                you are communicating with — your information belongs to that dealership
                relationship and is not shared with other dealerships on the platform;
              </li>
              <li>
                With <strong className="text-foreground">service providers</strong> that help
                operate the platform (such as hosting, telephony, and messaging carriers), only
                so they can perform services on our or the Dealership Client&rsquo;s behalf;
              </li>
              <li>
                With <strong className="text-foreground">lenders and financial institutions</strong>,
                at your request, to process a financing application with the Dealership Client;
              </li>
              <li>
                With <strong className="text-foreground">government agencies</strong> as required
                for vehicle titling, registration, and other legal obligations;
              </li>
              <li>
                When <strong className="text-foreground">required by law</strong>, such as in
                response to a subpoena or other legal process; or
              </li>
              <li>
                In connection with a <strong className="text-foreground">business transfer</strong>,
                such as a merger or sale, in which case this policy will continue to apply to
                your information.
              </li>
            </ul>
            <p>
              As stated above, mobile phone numbers and text-messaging opt-in data are never
              shared with or sold to third parties or affiliates for their own marketing or
              promotional purposes.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <SectionHeading id="cookies">5. Cookies and Website Analytics</SectionHeading>
            <p>
              Our website may use cookies and similar technologies to remember preferences and
              understand how visitors use the site. You can control cookies through your browser
              settings. Disabling cookies may affect some features.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <SectionHeading id="data-security">6. Data Security</SectionHeading>
            <p>
              We use reasonable administrative, technical, and physical safeguards designed to
              protect personal information processed on the platform. However, no method of
              transmission or storage is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <SectionHeading id="data-retention">7. Data Retention</SectionHeading>
            <p>
              Personal information is retained only as long as needed for the purposes described
              in this policy, to meet the Dealership Client&rsquo;s legal obligations (such as
              vehicle sales and financing record-keeping requirements), and to resolve disputes.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <SectionHeading id="your-choices">8. Your Choices and Rights</SectionHeading>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Text messages:</strong> reply STOP to any
                message to opt out at any time.
              </li>
              <li>
                <strong className="text-foreground">Marketing emails:</strong> use the
                unsubscribe link in any promotional email.
              </li>
              <li>
                <strong className="text-foreground">Access, correction, or deletion:</strong>{" "}
                you may request access to, correction of, or deletion of your personal
                information by contacting the Dealership Client you interacted with, or by
                contacting us using the details below. Requests will be honored as required by
                applicable law.
              </li>
            </ul>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <SectionHeading id="childrens-privacy">9. Children&rsquo;s Privacy</SectionHeading>
            <p>
              The platform and Dealership Client services are intended for adults. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <SectionHeading id="changes">10. Changes to This Policy</SectionHeading>
            <p>
              We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo;
              date at the top shows when it was last revised. Material changes will be posted on
              this page.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <SectionHeading id="contact">11. Contact</SectionHeading>
            <div className="rounded-2xl border border-border/30 bg-background/40 p-4 sm:p-5">
              <p>
                <strong className="text-foreground">Suprah AI</strong> —{" "}
                <a
                  href="https://www.suprah-app.com"
                  className="text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  www.suprah-app.com
                </a>
              </p>
              <p className="mt-3">
                For dealership-specific questions, contact the Dealership Client directly:
              </p>
              <p className="mt-1.5">
                <strong className="text-foreground">Action Auto Utah</strong> (Action Auto Sales
                and Finance, LLC), 170 W State Street, Lehi, UT 84043 —{" "}
                <a
                  href="tel:+13852303168"
                  className="text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  +1&nbsp;385&nbsp;230&nbsp;3168
                </a>{" "}
                —{" "}
                <a
                  href="https://www.actionautoutah.com"
                  className="text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  www.actionautoutah.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-12 border-t border-border/30 pt-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            © {new Date().getFullYear()} Suprah AI · Last updated {LAST_UPDATED}
          </p>
          <Link
            href="/"
            className="mt-2 inline-block text-xs font-medium text-emerald-500 transition-colors hover:text-emerald-400"
          >
            ← Back to Suprah.AI
          </Link>
        </footer>
      </main>
    </div>
  );
}