import { supabase } from "@/integrations/supabase/client";

/**
 * The signed-in donor's own pledges, saved in the database so they follow the
 * account to any device. Signed-out visitors have none here.
 */
export type MyPledge = {
  id: string;
  reference: string;
  causeId: string;
  causeTitle: string;
  amountNaira: number;
  createdAt: string;
};

let rows: MyPledge[] = [];
let signedInUserId: string | null = null;
const listeners = new Set<() => void>();

function publish(next: MyPledge[]) {
  rows = next;
  for (const listener of listeners) listener();
}

export function subscribeToMyPledges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMyPledgesSnapshot(): MyPledge[] {
  return rows;
}

export function isSignedInToBackend(): boolean {
  return signedInUserId !== null;
}

type Row = { id: string; reference: string; cause_id: string; cause_title: string; amount_naira: number | string; created_at: string };

function toPledge(row: Row): MyPledge {
  return {
    id: row.id,
    reference: row.reference,
    causeId: row.cause_id,
    causeTitle: row.cause_title,
    amountNaira: Number(row.amount_naira) || 0,
    createdAt: row.created_at,
  };
}

export async function refreshMyPledges(): Promise<void> {
  if (!signedInUserId) {
    publish([]);
    return;
  }
  const { data, error } = await supabase
    .from("user_pledges")
    .select("id, reference, cause_id, cause_title, amount_naira, created_at")
    .order("created_at", { ascending: false });
  if (!error && data) publish((data as Row[]).map(toPledge));
}

/** Save a settled pledge against the signed-in account. No-op when signed out. */
export async function saveMyPledge(input: {
  causeId: string;
  causeTitle: string;
  amountNaira: number;
  reference: string;
}): Promise<void> {
  if (!signedInUserId) return;
  const { error } = await supabase.from("user_pledges").insert({
    cause_id: input.causeId,
    cause_title: input.causeTitle,
    amount_naira: input.amountNaira,
    reference: input.reference,
  });
  if (!error) await refreshMyPledges();
}

function setUser(id: string | null) {
  if (id === signedInUserId) return;
  signedInUserId = id;
  void refreshMyPledges();
  if (!id) publish([]);
}

if (typeof window !== "undefined") {
  void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user?.id ?? null)).catch(() => {});
  try {
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user?.id ?? null));
  } catch {
    /* auth unavailable */
  }
}
