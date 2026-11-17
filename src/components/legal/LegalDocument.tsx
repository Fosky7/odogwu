import { useEffect, type ReactNode } from "react";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocumentProps {
  /** Page title, rendered as the single h1. */
  title: string;
  /** Small uppercase label above the title (e.g. "Privacy"). */
  eyebrow: string;
  /** Human readable last-updated date, e.g. "November 12, 2026". */
  lastUpdated: string;
  /** Lead paragraph shown directly under the title block. */
  intro: string;
  /** Ordered body sections. */
  sections: LegalSection[];
  /** Optional follow-up note shown after the final section. */
  contactNote?: string;
  /**
   * Document (browser tab) title for this page. Must be unique per legal page.
   * Defaults to the visible title, which is already unique per page.
   */
  documentTitle?: string;
  /**
   * Meta description for this page. Must be unique per legal page.
   * Defaults to the page intro, which is already unique per page.
   */
  documentDescription?: string;
}

const relatedLinks = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/donations", label: "Donation & Refund Policy" },
  { href: "/legal/accessibility", label: "Accessibility Statement" },
  { href: "/legal/contact", label: "Contact" },
] as const;

/** Maximum length we keep for the generated meta description. */
const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Shared shell for every legal / policy page.
 *
 * Renders a consistent header block (eyebrow, title, last-updated line, intro),
 * the numbered sections, an optional closing note and a cross-link footer so a
 * reader can move between policies without going back to the site footer.
 *
 * It also owns this page's document title and meta description so every legal
 * page exposes its own unique title/description instead of inheriting a shared
 * default from another content page.
 */
export function LegalDocument({
  title,
  eyebrow,
  lastUpdated,
  intro,
  sections,
  contactNote,
  documentTitle,
  documentDescription,
}: LegalDocumentProps) {
  const resolvedTitle = (documentTitle ?? title).trim();
  const resolvedDescription = truncate(
    (documentDescription ?? intro).replace(/\s+/g, " ").trim(),
    MAX_DESCRIPTION_LENGTH,
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (resolvedTitle) {
      document.title = resolvedTitle;
    }

    if (resolvedDescription) {
      setMetaDescription(resolvedDescription);
    }
  }, [resolvedTitle, resolvedDescription]);

  return (
    <main className="bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {"Last updated "}
            <span className="font-medium text-foreground">{lastUpdated}</span>
          </p>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{intro}</p>
        </header>

        <div className="mt-8 border-t border-border" />

        {sections.map((section, sectionIndex) => (
          <section key={`${sectionIndex}-${section.heading}`} className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {section.heading}
            </h2>
            {renderParagraphs(section.paragraphs)}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
                {section.bullets.map((bullet, bulletIndex) => (
                  <li key={`${sectionIndex}-bullet-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {contactNote ? (
          <aside className="mt-10 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{contactNote}</p>
          </aside>
        ) : null}

        <nav aria-label="Other legal pages" className="mt-12 border-t border-border pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Other legal pages
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

/** Create or update the document's meta description tag. */
function setMetaDescription(description: string): void {
  let meta = document.querySelector('meta[name="description"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", description);
}

/** Trim a string to a maximum length on a word boundary. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Render an ordered list of body paragraphs (or nothing if absent). */
function renderParagraphs(paragraphs?: string[]): ReactNode {
  if (!paragraphs || paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p
          key={`paragraph-${paragraphIndex}`}
          className="mt-3 text-base leading-relaxed text-muted-foreground"
        >
          {paragraph}
        </p>
      ))}
    </>
  );
}
