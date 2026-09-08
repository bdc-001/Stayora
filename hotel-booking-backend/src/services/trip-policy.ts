import { TripItem, TripProposal } from "../../../shared/itinerary";
export function nightsBetween(start: string, end: string): number {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(start) || !valid(end)) throw new Error("Use valid travel dates.");
  const nights = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (
    !Number.isInteger(nights) ||
    nights < 1 ||
    nights > 30 ||
    start < new Date().toISOString().slice(0, 10)
  )
    throw new Error("Choose future stays of 1–30 nights.");
  return nights;
}
export function validateProposal(p: TripProposal) {
  if (
    !p ||
    typeof p.title !== "string" ||
    typeof p.summary !== "string" ||
    typeof p.question !== "string" ||
    !Array.isArray(p.items) ||
    p.items.length > 90 ||
    !Number.isInteger(p.adults) ||
    p.adults < 1 ||
    p.adults > 20 ||
    !Number.isInteger(p.children) ||
    p.children < 0 ||
    p.children > 20 ||
    !Number.isFinite(p.budget) ||
    p.budget < 0
  )
    throw new Error(
      "The agent returned an invalid proposal. Please try again.",
    );
  for (const i of p.items) {
    if (
      !["hotel", "activity", "transport"].includes(i.kind) ||
      typeof i.title !== "string" ||
      typeof i.city !== "string" ||
      typeof i.description !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(i.date)
    )
      throw new Error("Invalid itinerary item.");
    if (i.kind === "hotel") nightsBetween(i.date, i.endDate || "");
  }
}
export function requireApproval(
  t: {
    revision: number;
    approvedRevision?: number;
    quoteExpiresAt: string;
    status: string;
  },
  revision: number,
  now = Date.now(),
) {
  if (
    revision !== t.revision ||
    t.approvedRevision !== t.revision ||
    !["approved", "preparing", "checkout", "partial", "completed"].includes(
      t.status,
    )
  )
    throw new Error("Review and approve this itinerary version first.");
  if (t.status === "approved" && Date.parse(t.quoteExpiresAt) <= now)
    throw new Error(
      "Your quote expired. Refresh the itinerary and approve the new prices.",
    );
}
export function paymentMatches(
  pi: {
    status: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  },
  tripId: string,
  userId: string,
  revision: number,
  item: TripItem,
) {
  return (
    pi.status === "succeeded" &&
    pi.currency === "inr" &&
    pi.amount === item.amount &&
    pi.metadata.tripId === tripId &&
    pi.metadata.userId === userId &&
    pi.metadata.revision === String(revision) &&
    pi.metadata.itemId === item.id
  );
}
