import { randomUUID } from "crypto";
import Hotel from "../models/hotel";
import { TripProposal } from "../../../shared/itinerary";
import { nightsBetween, validateProposal } from "./trip-policy";
import {
  buildIndiaMarketContext,
  marketAmountForTransport,
} from "./travel-market";

export async function quoteProposal(
  proposal: TripProposal,
): Promise<TripProposal> {
  validateProposal(proposal);
  const items = [];
  for (const raw of proposal.items) {
    const item = {
      ...raw,
      id: randomUUID(),
      amount: 0,
      terms: "",
      status: "unavailable" as "quoted" | "unavailable",
    };
    delete item.paymentIntentId;
    delete item.paymentRevision;
    delete item.bookingId;
    if (
      item.kind === "hotel" &&
      item.hotelId &&
      /^[a-f0-9]{24}$/i.test(item.hotelId)
    ) {
      const h = await Hotel.findOne({
        _id: item.hotelId,
        isActive: { $ne: false },
        adultCount: { $gte: proposal.adults },
        childCount: { $gte: proposal.children },
      });
      if (
        h &&
        h.city.toLowerCase() === item.city.toLowerCase() &&
        Number.isFinite(h.pricePerNight) &&
        h.pricePerNight > 0
      ) {
        item.title = h.name;
        item.amount =
          Math.round(h.pricePerNight * 100) *
          nightsBetween(item.date, item.endDate || "");
        item.terms =
          h.policies?.cancellationPolicy ||
          "Contact the property for cancellation terms before paying.";
        item.status = "quoted";
      }
    }
    if (item.kind === "transport" && item.status === "unavailable") {
      const market = await marketAmountForTransport({
        title: item.title,
        city: item.city,
      });
      if (market) {
        item.amount = market.amountPence;
        item.terms = market.terms;
      }
    }
    if (item.status === "unavailable" && !item.terms) {
      item.terms =
        item.kind === "activity"
          ? "Suggested experience in the Indian subcontinent — arrange separately (not sold on Stayora)."
          : "Suggested only. No connected booking provider or matching property.";
    }
    if (item.status === "unavailable") {
      delete item.hotelId;
    }
    items.push(item);
  }
  return { ...proposal, items };
}

export async function planTrip(messages: { role: string; content: string }[]) {
  if (!process.env.AGENT_SERVICE_URL || !process.env.AGENT_SERVICE_TOKEN)
    throw new Error(
      "Trip planning is not configured yet. Set up the itinerary agent service to start planning.",
    );
  const hotels = await Hotel.find({
    isActive: { $ne: false },
    "imageUrls.0": { $exists: true, $ne: "" },
    name: { $not: /qa\b|qa hotel|test hotel|dublin getaways/i },
    description: { $not: /lorem ipsum/i },
  })
    .select(
      "_id name city country pricePerNight adultCount childCount facilities",
    )
    .sort({ pricePerNight: 1 })
    .limit(150)
    .lean();
  const market = await buildIndiaMarketContext();
  const response = await fetch(
    `${process.env.AGENT_SERVICE_URL.replace(/\/$/, "")}/itinerary/plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENT_SERVICE_TOKEN}`,
      },
      body: JSON.stringify({
        messages,
        hotels,
        today: new Date().toISOString().slice(0, 10),
        market,
      }),
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!response.ok)
    throw new Error(
      "The travel agent is temporarily unavailable. Your saved trip is unchanged; please retry.",
    );
  return quoteProposal((await response.json()) as TripProposal);
}
