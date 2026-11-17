/**
 * OdogwuBadge
 * ===========
 *
 * The one visible mark of the leaderboard's first place. "Odogwu" is a titled
 * man, so the badge is deliberately small and quiet: a single word next to the
 * giver's name, never a shouty banner.
 *
 * It only ever renders presentation. Who earns it is decided upstream by the
 * server-verified ranking (`leaderboard_top_givers`), so nothing here can turn
 * a browser-written pledge into a badge.
 *
 * Accessibility: the visible word is the accessible name, and `title` explains
 * what it means for anyone who stops on it.
 */

export interface OdogwuBadgeProps {
  /** Visible label. Defaults to "Odogwu". */
  label?: string;
  /** `sm` sits inside a leaderboard row, `md` is for a heading. */
  size?: "sm" | "md";
  className?: string;
}

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function OdogwuBadge({
  label = "Odogwu",
  size = "sm",
  className,
}: OdogwuBadgeProps) {
  return (
    <span
      data-testid="odogwu-badge"
      data-size={size}
      title="Odogwu — the top giver on the leaderboard"
      className={classes(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold uppercase tracking-wide",
        "border-primary/40 bg-primary/10 text-primary",
        size === "sm" ? "px-2 py-0.5 text-[0.625rem] leading-4" : "px-2.5 py-1 text-xs leading-5",
        className,
      )}
    >
      <span aria-hidden="true">★</span>
      <span>{label}</span>
    </span>
  );
}

export default OdogwuBadge;
