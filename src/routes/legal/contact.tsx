import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

const sections: LegalSection[] = [
  {
    heading: "1. General support",
    paragraphs: [
      "Email support@odogwu.ng for anything about your account, a pledge you made, or a bill you submitted. Include your receipt reference where you have one and we will find the record immediately.",
      "We reply within two business days, Monday to Friday, 9:00–17:00 West Africa Time.",
    ],
  },
  {
    heading: "2. Legal and privacy requests",
    paragraphs: [
      "Send data access, correction, deletion and other privacy requests to legal@odogwu.ng. We respond within 30 days, and we may ask you to confirm your identity before releasing personal data.",
    ],
  },
  {
    heading: "3. Report a bill or a payment",
    paragraphs: [
      "If you believe a bill is fake, duplicated, inflated, or is collecting for something other than what it describes, email safety@odogwu.ng with the bill link. We pause the bill while we investigate.",
      "If a payment looks wrong or you do not recognise a charge, contact us the same day so we can start a reversal before the bill is paid out. If you are in immediate danger, contact the Nigerian emergency services first.",
    ],
  },
  {
    heading: "4. Beneficiary help",
    paragraphs: [
      "Beneficiaries who need help gathering verification documents, or who need to update a bill's amount after a provider changes it, can email support@odogwu.ng and ask for the verification team.",
    ],
  },
  {
    heading: "5. Press and partnerships",
    paragraphs: [
      "Hospitals, schools, NGOs and employers who want to work with us on bill clearing can reach hello@odogwu.ng.",
    ],
  },
  {
    heading: "6. Where we are",
    paragraphs: [
      "Odogwu is built and operated in Lagos, Nigeria. Written notices can be addressed to Odogwu, Lagos State, Nigeria, and will be acknowledged by email.",
    ],
  },
];

function ContactPage() {
  return (
    <LegalDocument
      title="Contact & Complaints"
      eyebrow="Support"
      lastUpdated="1 February 2025"
      intro="The right inbox for every kind of question — support, privacy, a suspicious bill, or a partnership — and how quickly we answer."
      sections={sections}
      contactNote="For anything payment related, include the receipt reference from your receipt page."
    />
  );
}

export const Route = createFileRoute("/legal/contact")({
  component: ContactPage,
});
