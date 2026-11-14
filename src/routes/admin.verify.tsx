import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { VerificationQueue } from "@/components/VerificationQueue";
import { VERIFICATION_QUEUE_HEADING } from "@/services/admin";

export const Route = createFileRoute("/admin/verify")({
  head: () => ({
    meta: [
      { title: "Verification queue — Odogwu" },
      {
        name: "description",
        content:
          "Review submitted bills, inspect the attached proof and approve or reject each request before it reaches the public feed.",
      },
    ],
  }),
  component: AdminVerifyPage,
});

function AdminVerifyPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Review desk
      </span>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
        {VERIFICATION_QUEUE_HEADING}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Check the proof behind each request. Approved requests appear on the public feed immediately;
        rejected ones stay out of it.
      </p>

      <VerificationQueue />

      {/* Direct doorway back to the public deck, so a reviewer can check what a
          decision did without leaving the review desk. */}
      <nav
        aria-label="Review desk"
        className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold"
      >
        <Link to="/feed" className="text-primary hover:underline">
          Bills
        </Link>
      </nav>

      <p className="mt-4 text-sm text-muted-foreground">
        Decisions are final for this session.{" "}
        <Link to="/feed" className="font-semibold text-primary hover:underline">
          Open the public feed
        </Link>{" "}
        to see what donors are looking at now.
      </p>
    </section>
  );
}
