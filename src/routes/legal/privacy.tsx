import { createFileRoute } from "@tanstack/react-router";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/LegalDocument";

/** Date shown in the "Last updated" line on this legal page. */
const LAST_UPDATED = "November 12, 2026";

const sections: LegalSection[] = [
  {
    heading: "1. What this policy covers",
    paragraphs: [
      "This policy explains how Odogwu collects, uses and protects personal data when you visit the site, create an account, pledge towards a bill, or submit a bill for verification. It is written to align with the Nigeria Data Protection Act 2023.",
    ],
  },
  {
    heading: "2. What we collect",
    bullets: [
      "Account details: your name, email address and a securely hashed password.",
      "Bill details: the beneficiary name, the amount owed, the provider, supporting documents and the story you choose to publish.",
      "Pledge details: the amount, the bill it supports and the reference our payment partner returns. We never see or store your full card number.",
      "Technical data: device type, browser, approximate location and pages visited, used to keep the platform fast and safe.",
    ],
  },
  {
    heading: "3. How we use your data",
    bullets: [
      "To verify bills and publish them on the feed.",
      "To process pledges, issue receipts and show funding totals.",
      "To detect fraud, duplicate bills and payment abuse.",
      "To answer support, legal and privacy questions.",
      "To meet our record-keeping and tax obligations.",
    ],
  },
  {
    heading: "4. Lawful bases",
    paragraphs: [
      "We rely on contract where the processing is needed to run your pledge or your bill, on legal obligation for financial records, on legitimate interests for fraud prevention and platform security, and on your consent for anything optional such as product updates.",
    ],
  },
  {
    heading: "5. Who we share with",
    paragraphs: [
      "We share the minimum necessary data with the payment processor that takes pledges, with hosting and monitoring providers that run the site, and with the reviewers who verify bills. We do not sell personal data, and we do not share your contact details with other donors or beneficiaries.",
    ],
  },
  {
    heading: "6. What is public by design",
    paragraphs: [
      "A published bill is public: its beneficiary first name, amount, verified status, story and funding total are visible to everyone, because that is what lets donors trust the platform. Never put information in a bill story that you would not want publicly read.",
    ],
  },
  {
    heading: "7. How long we keep data",
    paragraphs: [
      "We keep account data while your account is open. Pledge and payout records are kept for seven years to satisfy financial record-keeping rules. Verification documents are kept only as long as needed to defend a bill and are then deleted or anonymised.",
    ],
  },
  {
    heading: "8. Your rights",
    bullets: [
      "Ask for a copy of the personal data we hold about you.",
      "Correct anything inaccurate, or ask us to delete data we no longer need.",
      "Object to processing based on legitimate interests.",
      "Withdraw consent for optional communications at any time.",
      "Complain to the Nigeria Data Protection Commission if we do not resolve your concern.",
    ],
  },
  {
    heading: "9. How we protect data",
    paragraphs: [
      "Data is encrypted in transit, access is limited to the people who need it, and administrative actions are logged. If a breach affects your rights we will notify you and the regulator without undue delay.",
    ],
  },
  {
    heading: "10. Children",
    paragraphs: [
      "Odogwu is not for children. A bill for a child's hospital treatment or school fees is submitted and managed by a parent or guardian who holds the account.",
    ],
  },
  {
    // Referenced by the compulsory agreement checkbox on the create account
    // page, so the consent wording lives on the page the checkbox links to.
    heading: "11. Agreeing to this policy when you create an account",
    paragraphs: [
      "The create account page asks you to tick a compulsory checkbox confirming that you have read and agree to this Privacy Policy and our Terms of Service. We do not create an account unless that box is ticked, and while it is unticked the page tells you to agree before you continue.",
      "When you tick the box and create your account, we record your agreement on your account: the version of this policy you accepted, which is the document published under the last updated date at the top of this page, and the time you accepted it. We keep that record so we can show that you were told what we do with your personal data before you signed up.",
      "Agreeing to this policy is part of creating the account. It is not consent to marketing or optional product updates, which you choose separately and can withdraw at any time.",
    ],
    bullets: [
      "The processing described in sections 2 to 9 happens because you have an Odogwu account and use the platform, not only because you ticked the box.",
      "You can still exercise every right in section 8 after signing up, including asking for a copy of the personal data we hold about you and of the record of your agreement.",
      "If you do not agree to this policy, please do not create an account.",
    ],
  },
];

function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      eyebrow="Privacy"
      lastUpdated={LAST_UPDATED}
      intro="What we collect, why we collect it, who we share it with, and the choices you have over your own data on Odogwu."
      sections={sections}
      contactNote="Write to our data protection contact for access, correction or deletion requests."
    />
  );
}

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Odogwu" },
      { name: "description", content: "What personal data Odogwu collects from donors and beneficiaries, how it is used and your rights." },
      { property: "og:title", content: "Privacy Policy — Odogwu" },
      { property: "og:description", content: "What personal data Odogwu collects from donors and beneficiaries, how it is used and your rights." },
    ],
  }),
  component: PrivacyPolicyPage,
});
