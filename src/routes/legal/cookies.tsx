import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. What cookies are",
    paragraphs: [
      "Cookies are small text files a site stores in your browser. They let a site remember who you are between page loads — which is how you stay signed in while you move from the feed to a bill page and on to checkout.",
    ],
  },
  {
    heading: "2. Cookies we cannot run the site without",
    bullets: [
      "Session and sign-in cookies, so you are not asked to log in on every page.",
      "Security cookies that protect forms against cross-site request forgery.",
      "Load-balancing cookies that keep your request on the same server for the length of a visit.",
    ],
  },
  {
    heading: "3. Preference cookies",
    paragraphs: [
      "These remember small choices — for example that you dismissed a notice, or which filters you last used on the feed — so the site feels the same the next time you return. Clearing them only costs you those conveniences.",
    ],
  },
  {
    heading: "4. Analytics",
    paragraphs: [
      "We use limited, aggregated analytics to understand which bills and pages people actually use. We do not build advertising profiles and we do not sell analytics data.",
    ],
  },
  {
    heading: "5. Third-party cookies",
    paragraphs: [
      "When you start a pledge, our payment partner may set its own cookies inside the checkout step so it can process the payment securely and detect fraud. Those cookies are controlled by the payment partner and are not set until you reach checkout.",
    ],
  },
  {
    heading: "6. Controlling cookies",
    paragraphs: [
      "Every major browser lets you view, block and delete cookies from its settings. Blocking essential cookies will sign you out and can stop pledges from completing, so we recommend allowing them while you use Odogwu.",
    ],
  },
  {
    heading: "7. Changes to this policy",
    paragraphs: [
      "If we introduce a new category of cookie we will update this page and, where the law requires it, ask for your consent before the cookie is set.",
    ],
  },
];

function CookiePolicyPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      eyebrow="Privacy"
      lastUpdated="1 February 2025"
      intro="The cookies Odogwu sets, what each one does, and how you can control them without breaking your account or your checkout."
      sections={sections}
    />
  );
}

export const Route = createFileRoute("/legal/cookies")({
  component: CookiePolicyPage,
});
