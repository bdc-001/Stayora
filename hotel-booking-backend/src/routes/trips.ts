import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import verifyToken from "../middleware/auth";
import Trip, { StoredTrip } from "../models/trip";
import Booking from "../models/booking";
import Hotel from "../models/hotel";
import User from "../models/user";
import { planTrip, quoteProposal } from "../services/trip-planner";
import { paymentMatches, requireApproval } from "../services/trip-policy";
import { tripTotal } from "../../../shared/itinerary";
const router = express.Router();
const stripe = () => new Stripe(process.env.STRIPE_API_KEY as string);
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
router.use(verifyToken);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 20,
    keyGenerator: (req) => req.userId,
    message: {
      message: "Please wait a minute before making more trip requests.",
    },
  }),
);
router.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid trip ID." });
    return;
  }
  next();
});
const revisionOf = (req: Request) => {
  if (!Number.isInteger(req.body.revision))
    throw new Error("A trip revision is required.");
  return req.body.revision as number;
};
const inputOf = (req: Request) => {
  const m = req.body.message;
  if (typeof m !== "string" || m.trim().length < 3 || m.length > 4000)
    throw new Error("Describe your trip in 3–4000 characters.");
  return m.trim();
};
const owned = async (req: Request) => {
  const t = await Trip.findOne({ _id: req.params.id, userId: req.userId });
  if (!t) throw Object.assign(new Error("Trip not found."), { status: 404 });
  return reconcile(t);
};
async function reconcile(t: mongoose.HydratedDocument<StoredTrip>) {
  // Cancellation/refund is owned by the booking API; reflect its current truth.
  const refs = t.proposal.items
    .filter((i) => i.bookingId)
    .map((i) => i.bookingId);
  if (refs.length) {
    const bookings = await Booking.find({
      _id: { $in: refs },
      userId: t.userId,
    }).select("_id status paymentStatus");
    for (const item of t.proposal.items) {
      if (!item.bookingId) continue;
      const b = bookings.find((b) => String(b._id) === item.bookingId);
      if (
        (!b ||
          ["cancelled", "refunded"].includes(b.status) ||
          b.paymentStatus === "refunded") &&
        item.status !== "cancelled"
      ) {
        item.status = "cancelled";
        await Trip.updateOne(
          { _id: t._id },
          {
            $set: { "proposal.items.$[item].status": "cancelled" },
            $inc: { __v: 1 },
          },
          { arrayFilters: [{ "item.bookingId": item.bookingId }] },
        );
        t.set("__v", t.get("__v") + 1);
      }
    }
    if (
      t.proposal.items.some((i) => i.status === "cancelled") &&
      t.status === "completed"
    ) {
      await Trip.updateOne(
        { _id: t._id, status: "completed" },
        { $set: { status: "partial" }, $inc: { __v: 1 } },
      );
      t.status = "partial";
      t.set("__v", t.get("__v") + 1);
    }
  }
  return t;
}
const expiry = () => new Date(Date.now() + 15 * 60000).toISOString();
router.get(
  "/",
  wrap(async (req, res) => {
    res.json(
      await Promise.all(
        (
          await Trip.find({ userId: req.userId })
            .sort({ updatedAt: -1 })
            .limit(30)
        ).map(reconcile),
      ),
    );
  }),
);
router.post(
  "/",
  wrap(async (req, res) => {
    const messages = [{ role: "user" as const, content: inputOf(req) }];
    const proposal = await planTrip(messages);
    const t = await Trip.create({
      userId: req.userId,
      revision: 1,
      status: proposal.question ? "draft" : "review",
      proposal,
      messages: [
        ...messages,
        { role: "assistant", content: proposal.question || proposal.summary },
      ],
      quoteExpiresAt: expiry(),
    });
    res.status(201).json(t);
  }),
);
router.get(
  "/:id",
  wrap(async (req, res) => {
    res.json(await owned(req));
  }),
);
router.post(
  "/:id/messages",
  wrap(async (req, res) => {
    const t = await owned(req);
    const revision = revisionOf(req);
    if (
      t.proposal.items.some((i) => i.paymentIntentId || i.bookingId) ||
      t.revision !== revision ||
      !["draft", "review", "approved"].includes(t.status)
    )
      return res
        .status(409)
        .json({
          message:
            "This trip changed or checkout has started. Reload the saved trip.",
        });
    if (t.messages.length >= 40)
      throw new Error("This conversation is full. Start a new trip.");
    const messages = [
      ...t.messages,
      { role: "user" as const, content: inputOf(req) },
    ];
    const proposal = await planTrip(messages);
    const updated = await Trip.findOneAndUpdate(
      {
        _id: t._id,
        userId: req.userId,
        revision,
        __v: t.get("__v"),
        status: { $in: ["draft", "review", "approved"] },
      },
      {
        $set: {
          proposal,
          messages: [
            ...messages,
            {
              role: "assistant",
              content: proposal.question || proposal.summary,
            },
          ],
          status: proposal.question ? "draft" : "review",
          quoteExpiresAt: expiry(),
        },
        $inc: { revision: 1, __v: 1 },
        $unset: { approvedRevision: 1, approvedAt: 1, approvedTotal: 1 },
      },
      { new: true },
    );
    if (!updated)
      return res
        .status(409)
        .json({ message: "Your trip changed in another tab. Reload it." });
    res.json(updated);
  }),
);
router.post(
  "/:id/remove",
  wrap(async (req, res) => {
    const t = await owned(req);
    const revision = revisionOf(req);
    if (t.proposal.items.some((i) => i.paymentIntentId || i.bookingId))
      throw new Error(
        "Paid or initiated stays cannot be removed. Start a new trip for a different itinerary.",
      );
    if (!t.proposal.items.some((i) => i.id === req.body.itemId))
      throw new Error("Item not found.");
    const proposal = {
      ...t.proposal,
      items: t.proposal.items.filter((i) => i.id !== req.body.itemId),
    };
    const updated = await Trip.findOneAndUpdate(
      {
        _id: t._id,
        userId: req.userId,
        revision,
        __v: t.get("__v"),
        status: { $in: ["review", "approved"] },
      },
      {
        $set: { proposal, status: "review" },
        $inc: { revision: 1, __v: 1 },
        $unset: { approvedRevision: 1, approvedAt: 1, approvedTotal: 1 },
      },
      { new: true },
    );
    if (!updated)
      return res
        .status(409)
        .json({
          message: "Cannot edit after checkout begins. Reload your trip.",
        });
    res.json(updated);
  }),
);
router.post(
  "/:id/refresh",
  wrap(async (req, res) => {
    const t = await owned(req);
    const revision = revisionOf(req);
    // Preserve initiated payments and confirmed reservations, including their original approval revision.
    const unpaid = t.proposal.items.filter(
      (i) => !i.paymentIntentId && !i.bookingId,
    );
    const refreshed = await quoteProposal({ ...t.proposal, items: unpaid });
    let next = 0;
    const proposal = {
      ...t.proposal,
      items: t.proposal.items.map((i) =>
        i.paymentIntentId || i.bookingId ? i : refreshed.items[next++],
      ),
    };
    const updated = await Trip.findOneAndUpdate(
      {
        _id: t._id,
        userId: req.userId,
        revision,
        __v: t.get("__v"),
        status: { $in: ["review", "approved", "checkout", "partial"] },
      },
      {
        $set: { proposal, status: "review", quoteExpiresAt: expiry() },
        $inc: { revision: 1, __v: 1 },
        $unset: { approvedRevision: 1, approvedAt: 1, approvedTotal: 1 },
      },
      { new: true },
    );
    if (!updated)
      return res
        .status(409)
        .json({
          message:
            "Finish or retry the pending checkout request before refreshing.",
        });
    res.json(updated);
  }),
);
router.post(
  "/:id/approve",
  wrap(async (req, res) => {
    const t = await owned(req);
    const revision = revisionOf(req);
    if (
      t.proposal.question ||
      !t.proposal.items.length ||
      Date.parse(t.quoteExpiresAt) <= Date.now()
    )
      throw new Error(
        "Complete the trip details and refresh expired prices before approval.",
      );
    if (req.body.approvedTotal !== tripTotal(t.proposal.items))
      throw new Error("The total changed. Review it again.");
    const updated = await Trip.findOneAndUpdate(
      {
        _id: t._id,
        userId: req.userId,
        revision,
        __v: t.get("__v"),
        status: "review",
      },
      {
        $set: {
          status: "approved",
          approvedRevision: revision,
          approvedAt: new Date().toISOString(),
          approvedTotal: tripTotal(t.proposal.items),
        },
        $push: {
          approvals: {
            userId: req.userId,
            revision,
            total: tripTotal(t.proposal.items),
            currency: "inr",
            at: new Date().toISOString(),
            itemIds: t.proposal.items.map((i) => i.id),
          },
        },
        $inc: { __v: 1 },
      },
      { new: true },
    );
    if (!updated)
      return res
        .status(409)
        .json({
          message: "This version cannot be approved. Reload your trip.",
        });
    res.json(updated);
  }),
);
router.post(
  "/:id/checkout",
  wrap(async (req, res) => {
    let t = await owned(req);
    const revision = revisionOf(req);
    requireApproval(t, revision);
    const item = t.proposal.items.find((i) => i.id === req.body.itemId);
    if (
      !item ||
      item.kind !== "hotel" ||
      item.status !== "quoted" ||
      !item.hotelId
    )
      throw new Error("This item is not available for checkout.");
    // Existing intent is recoverable even after quote expiry; never create a second charge.
    if (item.paymentIntentId) {
      const pi = await stripe().paymentIntents.retrieve(item.paymentIntentId);
      return res.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        amount: pi.amount,
      });
    }
    if (t.status !== "preparing" && Date.parse(t.quoteExpiresAt) <= Date.now())
      throw new Error(
        "Quote expired. Refresh remaining stays and approve the updated itinerary.",
      );
    if (t.status === "preparing" && t.preparingItemId !== item.id)
      throw new Error(
        "Retry the pending stay checkout before starting another.",
      );
    if (t.status !== "preparing") {
      const fresh = await quoteProposal({ ...t.proposal, items: [item] });
      if (
        fresh.items[0].status !== "quoted" ||
        fresh.items[0].amount !== item.amount ||
        fresh.items[0].terms !== item.terms
      )
        throw new Error(
          "Property price or terms changed. Refresh and approve before checkout.",
        );
    }
    const locked = await Trip.findOneAndUpdate(
      {
        _id: t._id,
        userId: req.userId,
        revision,
        __v: t.get("__v"),
        approvedRevision: revision,
        $or: [
          { status: { $in: ["approved", "checkout", "partial"] } },
          { status: "preparing", preparingItemId: item.id },
        ],
      },
      {
        $set: { status: "preparing", preparingItemId: item.id },
        $inc: { __v: 1 },
      },
      { new: true },
    );
    if (!locked)
      return res
        .status(409)
        .json({ message: "The trip changed. Reload before paying." });
    t = locked;
    let pi: Stripe.PaymentIntent;
    try {
      pi = await stripe().paymentIntents.create(
        {
          amount: item.amount,
          currency: "inr",
          payment_method_types: ["card"],
          metadata: {
            tripId: String(t._id),
            itemId: item.id,
            revision: String(revision),
            userId: req.userId,
            hotelId: item.hotelId,
          },
        },
        { idempotencyKey: `trip:${t._id}:${revision}:${item.id}` },
      );
    } catch (error) {
      // These errors occur before creation. Ambiguous network/5xx errors retain the
      // preparation claim and idempotency key so recovery cannot create another charge.
      if (
        [
          "StripeInvalidRequestError",
          "StripeAuthenticationError",
          "StripePermissionError",
        ].includes(error.type)
      ) {
        await Trip.updateOne(
          {
            _id: t._id,
            revision,
            status: "preparing",
            preparingItemId: item.id,
          },
          {
            $set: { status: "approved" },
            $unset: { preparingItemId: 1 },
            $inc: { __v: 1 },
          },
        );
      }
      throw new Error(
        "Payment setup failed. Retry this stay to recover the same payment, or refresh prices when available.",
      );
    }
    // Persist before handing a client secret to the browser. Repeating uses Stripe's same key.
    await Trip.updateOne(
      { _id: t._id, revision, status: "preparing", preparingItemId: item.id },
      {
        $set: {
          status: "checkout",
          "proposal.items.$[item].paymentIntentId": pi.id,
          "proposal.items.$[item].paymentRevision": revision,
        },
        $unset: { preparingItemId: 1 },
        $inc: { __v: 1 },
      },
      { arrayFilters: [{ "item.id": item.id }] },
    );
    res.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: pi.amount,
    });
  }),
);
router.post(
  "/:id/confirm",
  wrap(async (req, res) => {
    const t = await owned(req);
    const revision = revisionOf(req);
    if (t.revision !== revision)
      throw new Error(
        "Reload the latest itinerary before recovering a reservation.",
      );
    const item = t.proposal.items.find((i) => i.id === req.body.itemId);
    if (!item?.paymentIntentId || !item.hotelId)
      throw new Error("Start checkout for this stay first.");
    if (item.bookingId) return res.json(t);
    const pi = await stripe().paymentIntents.retrieve(item.paymentIntentId);
    if (
      !paymentMatches(pi, String(t._id), req.userId, item.paymentRevision, item)
    )
      throw new Error(
        "Payment is not confirmed for this approved stay. No new payment was created.",
      );
    const user = await User.findById(req.userId);
    if (!user) throw new Error("User not found.");
    // Mongo transactions make booking, counters and trip status one recoverable commit.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await Trip.findOne({
          _id: t._id,
          userId: req.userId,
          revision,
        }).session(session);
        if (!current) throw new Error("Trip changed.");
        const entry = current.proposal.items.find((i) => i.id === item.id)!;
        if (entry.bookingId) return;
        const [booking] = await Booking.create(
          [
            {
              userId: req.userId,
              hotelId: item.hotelId,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              adultCount: current.proposal.adults,
              childCount: current.proposal.children,
              checkIn: new Date(item.date),
              checkOut: new Date(item.endDate!),
              totalCost: item.amount / 100,
              status: "confirmed",
              paymentStatus: "paid",
              stripePaymentIntentId: pi.id,
            },
          ],
          { session },
        );
        entry.status = "confirmed";
        entry.bookingId = String(booking._id);
        if (current.status !== "review" && current.status !== "preparing")
          current.status = current.proposal.items.every(
            (i) => i.status === "confirmed",
          )
            ? "completed"
            : "partial";
        current.markModified("proposal");
        await current.save({ session });
        await Hotel.updateOne(
          { _id: item.hotelId },
          { $inc: { totalBookings: 1, totalRevenue: item.amount / 100 } },
          { session },
        );
        await User.updateOne(
          { _id: req.userId },
          { $inc: { totalBookings: 1, totalSpent: item.amount / 100 } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    res.json(await owned(req));
  }),
);
router.use(
  (
    error: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (
      error.name === "MongoServerError" ||
      error.name === "MongoNetworkError"
    ) {
      res
        .status(503)
        .json({
          message:
            "Reservation storage is unavailable. If you paid, use Recover reservation; do not pay again.",
        });
      return;
    }
    res
      .status(error.status || 400)
      .json({ message: error.message || "Unable to update your trip." });
  },
);
export default router;
