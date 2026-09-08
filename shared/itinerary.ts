export type TripItem = {
  id: string;
  kind: "hotel" | "activity" | "transport";
  title: string;
  city: string;
  date: string;
  endDate?: string;
  description: string;
  hotelId?: string;
  amount: number;
  terms: string;
  status: "quoted" | "unavailable" | "confirmed" | "cancelled";
  bookingId?: string;
  paymentIntentId?: string;
  paymentRevision?: number;
};
export type TripProposal = {
  title: string;
  summary: string;
  question: string;
  adults: number;
  children: number;
  budget: number;
  items: TripItem[];
};
export type Trip = {
  _id: string;
  revision: number;
  status:
    | "draft"
    | "review"
    | "approved"
    | "preparing"
    | "checkout"
    | "completed"
    | "partial";
  messages: { role: "user" | "assistant"; content: string }[];
  proposal: TripProposal;
  quoteExpiresAt: string;
  approvedRevision?: number;
  approvedAt?: string;
  approvedTotal?: number;
  createdAt: string;
  updatedAt: string;
};
export const tripTotal = (items: TripItem[]) =>
  items
    .filter(
      (i) => i.kind === "hotel" && ["quoted", "confirmed"].includes(i.status),
    )
    .reduce((sum, i) => sum + i.amount, 0);
