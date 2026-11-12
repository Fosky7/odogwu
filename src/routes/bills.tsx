import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Bills — Odogwu" },
      { name: "description", content: "Bills page for Odogwu." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-foreground">Bills</h1>
      <p className="mt-3 text-muted-foreground">This page is coming in a later step of the plan.</p>
      <Link to="/" className="mt-8 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Back to home
      </Link>
    </main>
  );
}
