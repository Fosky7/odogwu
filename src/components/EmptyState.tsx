import type { ReactNode } from "react";

export type EmptyStateProps = {
  /** Short, plain-language headline for the empty state. */
  title: string;
  /** Optional supporting copy that explains what to do next. */
  description?: string;
  /** Optional decorative icon shown above the headline. */
  icon?: ReactNode;
  /** Optional call-to-action, usually a link or button. */
  action?: ReactNode;
  /** Extra layout classes for the surrounding page. */
  className?: string;
  /** Stable hook for browser verification. */
  testId?: string;
};

/**
 * Shared empty state used when a list, deck or dashboard section has nothing
 * to show. It keeps the wording, spacing and action placement consistent
 * across the app while letting each page supply its own next step.
 *
 * The action slot stretches to full width on phones so primary actions such as
 * "Refresh feed" or "Browse bills" stay comfortably tappable, then collapses
 * back to an inline row on wider screens.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
  testId,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center sm:px-6 sm:py-12 ${className}`.trim()}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          {icon}
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-foreground">{title}</h2>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action ? (
        <div className="mt-6 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {action}
        </div>
      ) : null}
    </div>
  );
}
