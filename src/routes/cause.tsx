import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/cause")({
  head: () => ({
    meta: [
      { title: "Bill details — Odogwu" },
      {
        name: "description",
        content:
          "Verified bill details, proof documents and live funding progress on Odogwu.",
      },
    ],
  }),
  component: CauseLayoutPage,
});

/**
 * Layout for the /cause address space. The bill itself lives in
 * src/routes/cause.$id.tsx so that every bill address (/cause/1, /cause/999)
 * is served by one dynamic page that reads its own URL params.
 *
 * If the matched detail page cannot resolve the bill in the URL (for example
 * /cause/999) it renders nothing. This layout detects that empty result and
 * shows the polished missing-bill state with a way back to the feed.
 */
function CauseLayoutPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const billId = /^\/cause\/([^/]+)\/?$/.exec(pathname)?.[1];
  const outletRef = useRef<HTMLDivElement | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMissing(false);

    if (!billId) return;
    const container = outletRef.current;
    if (!container) return;

    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      const hasContent = (container.textContent ?? "").trim().length > 0;
      setMissing(!hasContent);
    };

    const timers = [200, 700, 1500].map((delay) =>
      window.setTimeout(evaluate, delay),
    );

    const observer = new MutationObserver(evaluate);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [billId, pathname]);

  return (
    <div>
      <div ref={outletRef}>
        <Outlet />
      </div>

      {missing ? (
        <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Search className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            We couldn&rsquo;t find that bill
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The bill you are looking for may have been fully paid, removed, or
            the link is incorrect.
          </p>
          <Link
            to="/feed"
            data-testid="cause-back-to-feed"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Back to feed
          </Link>
        </section>
      ) : null}
    </div>
  );
}
