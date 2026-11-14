/**
 * The standing verified bills shown in both the home swipe deck and the
 * /feed deck. They live in one module so the two pages can never drift apart
 * about what a bill says.
 */
export type FeedBill = {
  id: string;
  /** Present on bills that came through the admin verification queue. */
  title?: string;
  beneficiary: string;
  amount: string;
  raised: string;
  goal: string;
  percent: number;
  type: string;
  location: string;
  story: string;
  daysLeft: number;
};

export const FEED_BILLS: FeedBill[] = [
  {
    id: "bill-adaeze-hospital",
    beneficiary: "Adaeze",
    amount: "₦25,000",
    raised: "₦18,750",
    goal: "₦25,000",
    percent: 75,
    type: "Hospital bill",
    location: "Enugu, Nigeria",
    story:
      "Adaeze's mother was admitted for malaria and typhoid last week. The hospital will not release her until the outstanding bill is cleared.",
    daysLeft: 6,
  },
  {
    id: "bill-emeka-school",
    beneficiary: "Emeka",
    amount: "₦42,000",
    raised: "₦12,600",
    goal: "₦42,000",
    percent: 30,
    type: "School fees",
    location: "Owerri, Nigeria",
    story:
      "Emeka is in JSS3 and has been sent home twice this term because his school fees are still unpaid.",
    daysLeft: 11,
  },
  {
    id: "bill-fatima-medical",
    beneficiary: "Fatima",
    amount: "₦68,500",
    raised: "₦51,375",
    goal: "₦68,500",
    percent: 75,
    type: "Medical bill",
    location: "Kaduna, Nigeria",
    story:
      "Fatima needs to complete her physiotherapy sessions after a road accident earlier this year. Each session costs ₦8,500.",
    daysLeft: 4,
  },
  {
    id: "bill-chinedu-rent",
    beneficiary: "Chinedu",
    amount: "₦30,000",
    raised: "₦6,000",
    goal: "₦30,000",
    percent: 20,
    type: "Rent",
    location: "Lagos, Nigeria",
    story:
      "Chinedu's landlord issued a quit notice after he lost his job at the market during the floods. He needs two months of rent to stay.",
    daysLeft: 9,
  },
];
