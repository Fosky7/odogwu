import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";

/**
 * A single block of a legal document. Keeping the copy as data (instead of free
 * form JSX) means every policy page shares one accessible, responsive layout and
 * only the words differ.
 */
export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocumentProps = {
  title: string;
  eyebrow?: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactNote?: string;
};

/** The full set of policy pages, reused in the sticky side rail. */
const POLICY_LINKS = [
  { to: "/legal/terms", label: "Terms of Service" },
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/cookies", label: "Cookie Policy" },
  { to: "/legal/donations", label: "Donation & Refund Policy" },
  { to: "/legal/accessibility", label: "Accessibility Statement" },
  { to: "/legal/contact", label: "Contact & Complaints" },
] as const;

export function LegalDocument({
  title,
  eyebrow = "Legal",
  intro,
  lastUpdated,
  sections,
  contactNote,
}: LegalDocumentProps) {
  return (
    <main className="bg-background text-foreground" data-testid="legal-document">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>Legal</li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground">{title}</li>
            </ol>
          </nav>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {intro}
          </p>
          <p className="mt-6 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Last updated {lastUpdated}
          </p>
        </div>
      </section>

      {/* Body + side rail */}
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="space-y-6">
          {sections.map((section, index) => (
            <section
              key={section.heading}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <p
                  key={`${index}-p-${paragraphIndex}`}
                  className="mt-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={`${index}-b-${bulletIndex}`}
                      className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the home page
          </Link>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground">
              Questions about this policy?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {contactNote ??
                "Our team answers legal and privacy questions within two business days."}
            </p>
            <Link
              to="/legal/contact"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact us
            </Link>
          </div>

          <nav
            aria-label="All legal pages"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              All legal pages
            </p>
            <ul className="mt-3 space-y-2">
              {POLICY_LINKS.map((policy) => (
                <li key={policy.to}>
                  <Link
                    to={policy.to}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {policy.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </main>
  );
}

export default LegalDocument;
