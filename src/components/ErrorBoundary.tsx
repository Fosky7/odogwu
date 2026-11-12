import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorFallbackProps = {
  /** The captured error, useful for custom fallbacks that want to log it. */
  error: Error | null;
  /** Clears the boundary and retries rendering the affected subtree. */
  reset: () => void;
};

/**
 * Default, human-readable fallback. Technical details stay in the console so
 * people are never shown an internal stack trace or component path.
 */
export function DefaultErrorFallback({ reset }: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      data-testid="error-boundary-fallback"
      className="mx-auto flex w-full max-w-lg flex-col items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center"
    >
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        This part of the page could not be displayed. Please try again, or refresh
        the page if the problem continues.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  /** Called after the boundary resets, e.g. to refetch data. */
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Small class-based error boundary for React 18. It keeps a rendering failure
 * inside one page section instead of blanking the whole application, and gives
 * the person a way to retry once the underlying problem is fixed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the diagnostic detail available to developers without exposing it in
    // the UI. Production monitoring can replace or augment this later.
    console.error("Unhandled UI error", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const fallbackProps: ErrorFallbackProps = {
        error: this.state.error,
        reset: this.reset,
      };

      return this.props.fallback
        ? this.props.fallback(fallbackProps)
        : <DefaultErrorFallback {...fallbackProps} />;
    }

    return this.props.children;
  }
}
