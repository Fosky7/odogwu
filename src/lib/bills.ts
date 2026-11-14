export type SeedBill = {
  id: string;
  title: string;
  description: string;
  amount: number;
  pledged: number;
  owner: string;
  category: string;
  createdAt: string;
};

/**
 * Bills that ship with the app. Kept empty on purpose so the Feed and
 * Dashboard can render their friendly empty states until a real bill is
 * created through /create.
 */
export const seedBills: SeedBill[] = [];
