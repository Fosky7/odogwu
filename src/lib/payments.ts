/**
 * Money and Paystack primitives shared by checkout, the pledge sheet, the
 * receipt page and the pledge hook.
 *
 * Two responsibilities live here on purpose, because they are the same concern
 * stated in two currencies of trust:
 *
 *  1. MONEY. Every amount is handled in minor units (kobo) internally and only
 *     converted to naira for display. Nothing in the app may round, parse or
 *     trust a naira figure directly: it always goes through these helpers, so
 *     the amount validated on screen is exactly the amount sent to Paystack.
 *
 *  2. PAYSTACK INLINE. The popup is loaded on demand from Paystack's own script
 *     with the PUBLISHABLE key only. A secret key ("sk_...") is refused here
 *     outright: it belongs in the edge functions (paystack-initialize,
 *     paystack-verify, paystack-webhook), never in the browser bundle.
 *
 * The publishable key is read from `VITE_PAYSTACK_PUBLIC_KEY` at build time,
 * with documented fallbacks (<meta name="paystack-public-key"> or a
 * `window.PAYSTACK_PUBLIC_KEY` global) for hosts that inject configuration at
 * runtime rather than at build time.
 */

/* -------------------------------------------------------------------------- */
/* Currency + pledge limits                                                   */
/* -------------------------------------------------------------------------- */

/** The only currency Odogwu settles in. */
export const CURRENCY = "NGN";
export type Currency = typeof CURRENCY;

/** Symbol printed next to every amount a donor sees. */
export const CURRENCY_SYMBOL = "\u20a6";

/** Smallest pledge checkout accepts, in naira. */
export const MIN_PLEDGE_NAIRA = 100;

/** Smallest pledge checkout accepts, in kobo (\u20a6100). */
export const MIN_PLEDGE_MINOR = MIN_PLEDGE_NAIRA * 100;

/**
 * Upper sanity ceiling in kobo (\u20a6100,000,000).
 *
 * This mirrors MAX_AMOUNT_MINOR in the paystack-initialize edge function, so a
 * figure the browser would allow is never rejected by the server for being
 * absurdly large (and vice versa).
 */
export const MAX_PLEDGE_MINOR = 10_000_000_000;

/** Label above the amount the donor is about to pay. */
export const AMOUNT_DUE_LABEL = "Total due";

/* -------------------------------------------------------------------------- */
/* Money math                                                                 */
/* -------------------------------------------------------------------------- */

/** Shared formatter: grouped thousands, no trailing ".00", max two decimals. */
const nairaFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Naira -> kobo.
 *
 * Returns 0 for anything that is not a finite number so a bad value can never
 * become a charge.
 */
export function toMinorUnits(naira: number): number {
  const value = Number(naira);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

/** Kobo -> naira, rounded to the nearest kobo first. */
export function fromMinorUnits(minor: number): number {
  const value = Number(minor);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value) / 100;
}

/** Human amount from a naira value, e.g. `\u20a625,000` or `\u20a625,000.50`. */
export function formatNaira(naira: number): string {
  const value = Number(naira);
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${nairaFormatter.format(Math.round(value * 100) / 100)}`;
}

/** Human amount from a kobo value, e.g. 2_500_000 -> `\u20a625,000`. */
export function formatNairaMinor(minor: number): string {
  const value = Number(minor);
  if (!Number.isFinite(value)) return `${CURRENCY_SYMBOL}0`;
  return `${CURRENCY_SYMBOL}${nairaFormatter.format(Math.round(value) / 100)}`;
}

/** Alias kept for callers that read more naturally as "from minor units". */
export const formatNairaFromMinor = formatNairaMinor;

/**
 * Kobo -> the plain numeric string used as an `<input>` value.
 *
 * No grouping separators (so the URL and the field stay quotable), and whole
 * naira stay whole: 2_500_000 -> "25000", 2_500_050 -> "25000.50".
 */
export function toNairaInputValue(minor: number): string {
  const value = Number(minor);
  if (!Number.isFinite(value) || value <= 0) return "";

  const naira = Math.round(value) / 100;
  return Number.isInteger(naira) ? String(naira) : naira.toFixed(2);
}

/** An amount the donor typed, in both naira (display) and kobo (charge). */
export interface ParsedNairaAmount {
  naira: number;
  minor: number;
}

/**
 * Read a typed naira amount.
 *
 * Tolerates grouping commas, spaces and a currency sign ("\u20a625,000.50"),
 * rejects garbage ("1.2.3"), and returns null for an empty/invalid entry so the
 * caller can keep the primary action disabled instead of inventing a number.
 */
export function parseNairaInput(value: string): ParsedNairaAmount | null {
  const raw = typeof value === "string" ? value : "";
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  // "1.2.3" is not a number: reject it rather than silently truncating.
  if ((cleaned.match(/\./g) ?? []).length > 1) return null;

  const naira = Number(cleaned);
  if (!Number.isFinite(naira) || naira <= 0) return null;

  const minor = Math.round(naira * 100);
  if (!Number.isFinite(minor) || minor <= 0) return null;

  return { naira, minor };
}

/** Why an amount cannot be charged. `ok` is the only chargeable code. */
export type PledgeValidationCode =
  | "ok"
  | "empty"
  | "invalid"
  | "below-minimum"
  | "above-maximum"
  | "exceeds-balance";

/** Result of {@link validatePledgeAmount}. */
export interface PledgeValidation {
  code: PledgeValidationCode;
  /** Ready-to-print explanation, or null when the amount is chargeable. */
  message: string | null;
  /** Amount to charge in kobo. 0 unless `code` is "ok". */
  amountMinor: number;
}

/**
 * Validate a typed pledge against the documented rules, once.
 *
 * Order matters: the minimum and the bill's own balance are the messages a
 * donor can act on, so they are reported before the generic platform ceiling.
 * Nothing here can produce a chargeable amount that Paystack would refuse.
 *
 * @param value          What the donor typed (naira, as text).
 * @param remainingMinor How much the bill still needs, in kobo. 0 means
 *                       "unknown", in which case only the global limits apply.
 */
export function validatePledgeAmount(
  value: string,
  remainingMinor = 0,
): PledgeValidation {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return {
      code: "empty",
      message: `Enter the amount you would like to pledge, from ${formatNairaMinor(
        MIN_PLEDGE_MINOR,
      )}.`,
      amountMinor: 0,
    };
  }

  const parsed = parseNairaInput(raw);

  if (!parsed) {
    return {
      code: "invalid",
      message: "Enter a valid amount in Naira, for example 25000.",
      amountMinor: 0,
    };
  }

  if (parsed.minor < MIN_PLEDGE_MINOR) {
    return {
      code: "below-minimum",
      message: `Pledge at least ${formatNairaMinor(MIN_PLEDGE_MINOR)}.`,
      amountMinor: 0,
    };
  }

  const balance = Math.round(Number(remainingMinor ?? 0));

  if (Number.isFinite(balance) && balance > 0 && parsed.minor > balance) {
    return {
      code: "exceeds-balance",
      message: `That is more than the ${formatNairaMinor(balance)} still owed on this bill.`,
      amountMinor: 0,
    };
  }

  if (parsed.minor > MAX_PLEDGE_MINOR) {
    return {
      code: "above-maximum",
      message: `Pledges above ${formatNairaMinor(MAX_PLEDGE_MINOR)} are not supported yet.`,
      amountMinor: 0,
    };
  }

  return { code: "ok", message: null, amountMinor: parsed.minor };
}

/**
 * Mint the quotable reference for one pledge attempt.
 *
 * Only letters, digits and hyphens, so it satisfies the reference pattern the
 * initialize edge function enforces and stays safe inside a URL or an email.
 */
export function createPledgeReference(prefix = "ODG"): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${time}-${random}`;
}

/* -------------------------------------------------------------------------- */
/* Paystack Inline (browser only, publishable key only)                        */
/* -------------------------------------------------------------------------- */

/** The script that exposes `window.PaystackPop`. */
export const PAYSTACK_INLINE_SRC = "https://js.paystack.co/v1/inline.js";

/** Env var that carries the PUBLISHABLE key (never the secret). */
export const PAYSTACK_PUBLIC_KEY_ENV = "VITE_PAYSTACK_PUBLIC_KEY";

/**
 * Paystack requires an email on every transaction. A guest donor is represented
 * by the platform inbox rather than inventing an address on their behalf; the
 * initialize edge function uses the same fallback, so both sides agree.
 */
export const FALLBACK_DONOR_EMAIL = "donations@odogwu.ng";

/** The payment rails the checkout page advertises and the popup is opened with. */
export const PAYSTACK_CHANNELS = ["card", "bank", "ussd", "bank_transfer"] as const;
export type PaystackChannel = (typeof PAYSTACK_CHANNELS)[number];

/** The shape Paystack Inline hands back inside its success callback. */
export interface PaystackSuccessResponse {
  reference?: string;
  status?: string;
  trans?: string;
  transaction?: string;
  [key: string]: unknown;
}

/** Options accepted by `PaystackPop.setup`. */
export interface PaystackSetupOptions {
  /** The PUBLISHABLE key. */
  key: string;
  email: string;
  /** Amount in kobo. */
  amount: number;
  currency?: string;
  /** The server-issued reference this charge must settle against. */
  ref: string;
  channels?: readonly string[];
  metadata?: Record<string, unknown>;
  callback: (response: PaystackSuccessResponse) => void;
  onClose: () => void;
}

/** The handle Paystack returns; opening it renders the popup. */
export interface PaystackHandler {
  openIframe: () => void;
}

/** The global object Paystack Inline installs on `window`. */
export interface PaystackPop {
  setup: (options: PaystackSetupOptions) => PaystackHandler;
}

/**
 * Shape of `window` once Paystack has loaded.
 *
 * Deliberately a local view (not a `declare global` augmentation) so this
 * module never collides with another declaration of `Window.PaystackPop`.
 */
type PaystackWindow = Window & { PaystackPop?: PaystackPop };

/** The key Vite replaced at build time, when it was configured there. */
function readBuildTimePublicKey(): string | null {
  try {
    // Vite statically replaces `import.meta.env` (and `.KEY` on it) at build
    // time. The cast keeps this file compiling in tsconfigs that do not pull in
    // the `vite/client` ambient types.
    // @ts-ignore -- `import.meta.env` is injected by the bundler.
    const env = import.meta.env as Record<string, unknown> | undefined;
    const raw = env?.[PAYSTACK_PUBLIC_KEY_ENV];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  } catch {
    /* not running under the bundler: fall through to the runtime sources */
  }
  return null;
}

/** A key injected as a global by the hosting page. */
function readGlobalPublicKey(): string | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as Record<string, unknown>;
  const raw = scope.PAYSTACK_PUBLIC_KEY ?? scope.VITE_PAYSTACK_PUBLIC_KEY;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/** A key injected into the document head at runtime. */
function readMetaPublicKey(): string | null {
  if (typeof document === "undefined") return null;
  const node = document.querySelector<HTMLMetaElement>(
    `meta[name="${PAYSTACK_PUBLIC_KEY_ENV}"], meta[name="paystack-public-key"]`,
  );
  const content = node?.content?.trim();
  return content ? content : null;
}

/**
 * Resolve the Paystack publishable key, or null when it is not configured.
 *
 * A secret key is refused outright: shipping `sk_...` to the browser would let
 * anyone charge, refund or read every transaction on the account. When the
 * key is missing the caller reports "Could not start payment" instead of
 * opening a half-configured popup.
 */
export function readPaystackPublicKey(): string | null {
  const candidate =
    readBuildTimePublicKey() ?? readGlobalPublicKey() ?? readMetaPublicKey();

  if (!candidate) return null;

  if (candidate.startsWith("sk_")) {
    console.error(
      `[payments] ${PAYSTACK_PUBLIC_KEY_ENV} contains a SECRET key. Use the publishable key (pk_...) in the browser and keep the secret in the edge functions.`,
    );
    return null;
  }

  if (!candidate.startsWith("pk_")) {
    console.warn(
      `[payments] ${PAYSTACK_PUBLIC_KEY_ENV} does not look like a Paystack publishable key (expected a "pk_" prefix).`,
    );
  }

  return candidate;
}

/**
 * The in-flight (or already fulfilled) script load. Cached so a donor who
 * retries after cancelling never downloads Paystack twice.
 */
let paystackLoader: Promise<PaystackPop> | null = null;

/**
 * Load Paystack Inline on demand and hand back `PaystackPop`.
 *
 * The script is added exactly once, the load fails after 15 seconds instead of
 * hanging a donor on a spinner, and a failed load is retryable (the cached
 * promise is cleared so the next tap tries again).
 */
export function loadPaystackInline(): Promise<PaystackPop> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Paystack can only be opened in the browser."),
    );
  }

  const scope = window as unknown as PaystackWindow;

  if (scope.PaystackPop) {
    return Promise.resolve(scope.PaystackPop);
  }

  if (paystackLoader) return paystackLoader;

  paystackLoader = new Promise<PaystackPop>((resolve, reject) => {
    // If an earlier attempt left a broken script tag behind, replace it.
    document
      .querySelectorAll<HTMLScriptElement>(`script[src="${PAYSTACK_INLINE_SRC}"]`)
      .forEach((node) => node.remove());

    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_SRC;
    script.async = true;
    script.dataset.odogwuPaystack = "true";

    let timer: number | undefined;

    function cleanup(): void {
      if (timer !== undefined) window.clearTimeout(timer);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    }

    function onLoad(): void {
      cleanup();
      const loaded = (window as unknown as PaystackWindow).PaystackPop;
      if (loaded) {
        resolve(loaded);
      } else {
        reject(new Error("Paystack loaded without exposing PaystackPop."));
      }
    }

    function onError(): void {
      cleanup();
      reject(new Error("Could not load Paystack."));
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);

    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out loading Paystack."));
    }, 15_000);
  }).catch((error: unknown) => {
    // A failed load must be retryable: the donor may be on a flaky connection.
    paystackLoader = null;
    throw error;
  });

  return paystackLoader;
}
