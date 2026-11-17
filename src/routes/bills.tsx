import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * The page's visible H1. It is reused as the Open Graph / Twitter title so the
 * shared card always matches the headline a reader actually sees.
 */
const BILLS_HEADING = "Bills";

const BILLS_DESCRIPTION =
  "Track the bills you have pledged to or requested on Odogwu - hospital, school and rent bills, each one verified and receipted.";

/**
 * Complete page <head> metadata. Declared once, at module scope, so exactly one
 * description / og:* / twitter:* tag is emitted for this route (no duplicates
 * and no empty fallbacks from the site-wide defaults).
 *
 * Every key used by the shared root defaults (description, og:title,
 * og:description, og:type, twitter:card) is declared here as well, so the
 * deepest (route-level) value always wins the merge and the page never ships a
 * missing or blank card.
 */
const BILLS_META = [
  { title: `${BILLS_HEADING} — Odogwu` },
  { name: "description", content: BILLS_DESCRIPTION },
  { property: "og:title", content: BILLS_HEADING },
  { property: "og:description", content: BILLS_DESCRIPTION },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "Odogwu" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: BILLS_HEADING },
  { name: "twitter:description", content: BILLS_DESCRIPTION },
] as const;

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: BILLS_META.map((tag) => ({ ...tag })),
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-foreground">{BILLS_HEADING}</h1>
      <p className="mt-3 text-muted-foreground">This page is coming in a later step of the plan.</p>
      <Link to="/" className="mt-8 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Back to home
      </Link>
    </main>
  );
}
