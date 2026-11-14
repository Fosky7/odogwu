import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. Our commitment",
    paragraphs: [
      "A bill for a hospital stay or a school term should be readable by everyone who might help pay it. We treat accessibility as part of the product, not a compliance afterthought, and we aim to meet WCAG 2.2 level AA across the feed, bill pages, checkout and these policy pages.",
    ],
  },
  {
    heading: "2. What we have built in",
    bullets: [
      "Semantic headings and landmarks so screen reader users can jump between the header, the bill, and the footer.",
      "Full keyboard support, including the collapsed navigation menu, with a visible focus ring on every control.",
      "Text and interface colours chosen to meet AA contrast ratios in both light and dark surroundings.",
      "Layouts that reflow cleanly from a small phone to a wide desktop without horizontal scrolling.",
      "Descriptive labels and error messages on every form field, including pledge amounts.",
    ],
  },
  {
    heading: "3. Known limitations",
    bullets: [
      "Photos and documents uploaded by beneficiaries may not carry useful descriptions; we are adding a prompt for alt text during submission.",
      "The payment checkout step is hosted by our payment partner and is outside our direct control, although we have selected a partner that supports keyboard and screen reader use.",
      "Some older PDFs supplied as verification evidence may not be tagged for screen readers.",
    ],
  },
  {
    heading: "4. Assistive technology we test with",
    paragraphs: [
      "We check core flows with keyboard-only navigation, NVDA on Windows, VoiceOver on macOS and iOS, and TalkBack on Android, alongside browser zoom at 200 percent.",
    ],
  },
  {
    heading: "5. Tell us about a barrier",
    paragraphs: [
      "If a page blocks you from pledging or from submitting a bill, email support@odogwu.ng with the page address and what happened. We aim to acknowledge accessibility reports within two business days and to give you a timeline for the fix.",
    ],
  },
  {
    heading: "6. Ongoing work",
    paragraphs: [
      "We review the platform against WCAG 2.2 AA each quarter, publish the outcome of that review internally, and prioritise fixes that unblock real donation flows first.",
    ],
  },
];

function AccessibilityStatementPage() {
  return (
    <LegalDocument
      title="Accessibility Statement"
      eyebrow="Inclusion"
      lastUpdated="1 February 2025"
      intro="The standard we hold ourselves to, what already works with assistive technology, the gaps we know about, and how to report a barrier."
      sections={sections}
      contactNote="Accessibility reports are handled by the engineering team, not a general inbox."
    />
  );
}

export const Route = createFileRoute("/legal/accessibility")({
  component: AccessibilityStatementPage,
});
