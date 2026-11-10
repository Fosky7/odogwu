import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Odogwu</h1>
      <p className="max-w-prose text-muted-foreground">
        Your app's entry route is ready. Ask Kross to build the first real screen when you're ready.
      </p>
    </main>
  );
}
