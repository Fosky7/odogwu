import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AUTH_CHANGE_EVENT, copyLegacyBrowserRecords } from "@/lib/authStore";
import {
  getCurrentUser,
  signIn as signInWithPassword,
  signOut as endSession,
  signUp as createAccountAndSignIn,
  type AccountUser,
  type SignInInput,
  type SignUpInput,
} from "@/services/auth";

export type AuthContextValue = {
  /** The signed-in account, or null for a visitor. */
  user: AccountUser | null;
  /** True until the persisted session has been read in the browser. */
  loading: boolean;
  signIn: (input: SignInInput) => Promise<AccountUser>;
  signUp: (input: SignUpInput) => Promise<AccountUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session provider mounted once at the root, above the shared shell.
 *
 * The browser store is the source of truth; this provider mirrors it into React
 * state so the header (and any page) re-renders the moment a sign-up, sign-in or
 * sign-out happens. It also re-reads on the store's change event and on the
 * cross-tab `storage` event, which keeps two open tabs in agreement.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate after mount: browser storage does not exist during server render.
  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  // Keep in step with writes that happen outside this component tree.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => setUser(getCurrentUser());

    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Once the backend session is hydrated for a signed-in account, ensure any
  // records that still live only in this browser are copied into the database.
  // The copier resolves the authenticated user itself, uses owner-scoped
  // idempotent upserts and only checkpoints rows read back with matching
  // values, so this effect is safe to run on every sign-in or reload.
  useEffect(() => {
    if (loading || !user) return;

    void copyLegacyBrowserRecords().catch(() => {
      /* failed writes stay pending with the browser copy kept for the next load */
    });
  }, [loading, user]);

  const signIn = useCallback(async (input: SignInInput) => {
    // Rejections propagate as AuthError so the form can show the exact copy.
    const nextUser = await signInWithPassword(input);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const nextUser = await createAccountAndSignIn(input);
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(async () => {
    await endSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * A provider-less fallback so a page can never crash the whole app just because
 * the session provider was not mounted above it. Visitors simply render as
 * signed out; the auth actions explain that the session is unavailable.
 */
const FALLBACK_AUTH: AuthContextValue = {
  user: null,
  loading: false,
  signIn: async () => {
    throw new Error("Sign in is unavailable right now. Please reload the page.");
  },
  signUp: async () => {
    throw new Error("Account creation is unavailable right now. Please reload the page.");
  },
  signOut: async () => {
    /* nothing to end when no session provider is mounted */
  },
};

/** Access the session, degrading to a signed-out visitor outside the provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? FALLBACK_AUTH;
}
