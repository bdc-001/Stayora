const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
process.env.JWT_SECRET_KEY = "isolated-itinerary-test-secret";
process.env.STRIPE_API_KEY = "sk_test_local_fake";
const Trip = require("../src/models/trip").default;
const Hotel = require("../src/models/hotel").default;
const Booking = require("../src/models/booking").default;
const User = require("../src/models/user").default;
const policy = require("../src/services/trip-policy");
const planner = require("../src/services/trip-planner");
const router = require("../src/routes/trips").default;
let db, app, hotel, user, token, trip;
let intents = new Map(),
  failCreate = false;
const originalCreate = Stripe.resources.PaymentIntents.prototype.create;
const originalRetrieve = Stripe.resources.PaymentIntents.prototype.retrieve;
Stripe.resources.PaymentIntents.prototype.create = async function (data, opts) {
  if (failCreate) throw new Error("Simulated temporary provider outage");
  if (!intents.has(opts.idempotencyKey))
    intents.set(opts.idempotencyKey, {
      ...data,
      id: `pi_${intents.size}`,
      client_secret: "test_secret",
      status: "requires_payment_method",
    });
  return intents.get(opts.idempotencyKey);
};
Stripe.resources.PaymentIntents.prototype.retrieve = async function (id) {
  return [...intents.values()].find((p) => p.id === id);
};
const post = (action, body = {}) =>
  request(app)
    .post(`/api/trips/${trip._id}/${action}`)
    .set("Authorization", token)
    .send({ revision: trip.revision, ...body });
const approve = async () => {
  const r = await post("approve", {
    approvedTotal: trip.proposal.items.reduce((s, i) => s + i.amount, 0),
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  trip = r.body;
};
before(async () => {
  db = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "8.0.12" },
  });
  await mongoose.connect(db.getUri());
  app = express();
  app.use(express.json(), cookieParser());
  app.use("/api/trips", router);
});
beforeEach(async () => {
  await Promise.all([
    Trip.deleteMany({}),
    Hotel.deleteMany({}),
    Booking.deleteMany({}),
    User.deleteMany({}),
  ]);
  intents.clear();
  failCreate = false;
  user = await User.create({
    firstName: "Test",
    lastName: "Traveller",
    email: "traveller@example.test",
    password: "test-password-only",
  });
  token =
    "Bearer " +
    jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET_KEY);
  hotel = await Hotel.create({
    userId: String(user._id),
    name: "Test London Stay",
    city: "London",
    country: "UK",
    description: "Test property",
    type: ["Boutique"],
    adultCount: 4,
    childCount: 2,
    facilities: ["WiFi"],
    pricePerNight: 100,
    starRating: 4,
    imageUrls: [],
    lastUpdated: new Date(),
    policies: { cancellationPolicy: "Test cancellation terms" },
  });
  trip = await Trip.create({
    userId: String(user._id),
    revision: 1,
    status: "review",
    messages: [],
    quoteExpiresAt: new Date(Date.now() + 900000).toISOString(),
    proposal: {
      title: "Test trip",
      summary: "A test trip",
      question: "",
      adults: 2,
      children: 0,
      budget: 1000,
      items: [
        {
          id: "stay1",
          kind: "hotel",
          title: hotel.name,
          city: "London",
          date: "2027-06-01",
          endDate: "2027-06-03",
          description: "Two nights",
          hotelId: String(hotel._id),
          amount: 20000,
          terms: "Test cancellation terms",
          status: "quoted",
        },
      ],
    },
  });
});
after(async () => {
  Stripe.resources.PaymentIntents.prototype.create = originalCreate;
  Stripe.resources.PaymentIntents.prototype.retrieve = originalRetrieve;
  await mongoose.disconnect();
  if (db) await db.stop();
});
test("authentication and ownership enforced", async () => {
  assert.equal((await request(app).get("/api/trips")).status, 401);
  const other =
    "Bearer " +
    jwt.sign(
      { userId: String(new mongoose.Types.ObjectId()) },
      process.env.JWT_SECRET_KEY,
    );
  assert.equal(
    (
      await request(app)
        .get(`/api/trips/${trip._id}`)
        .set("Authorization", other)
    ).status,
    404,
  );
});
test("unapproved, stale and mismatched total requests cannot pay", async () => {
  assert.equal((await post("checkout", { itemId: "stay1" })).status, 400);
  assert.equal((await post("approve", { approvedTotal: 1 })).status, 400);
  assert.equal(
    (await post("approve", { revision: 0, approvedTotal: 20000 })).status,
    409,
  );
  assert.equal(intents.size, 0);
});
test("removal invalidates approval and increments revision", async () => {
  await approve();
  const r = await post("remove", { itemId: "stay1" });
  assert.equal(r.status, 200);
  assert.equal(r.body.revision, 2);
  assert.equal(r.body.approvedRevision, undefined);
  assert.equal(r.body.status, "review");
});
test("changed property prices reject checkout without a charge", async () => {
  await approve();
  await Hotel.updateOne({ _id: hotel._id }, { $set: { pricePerNight: 150 } });
  assert.equal((await post("checkout", { itemId: "stay1" })).status, 400);
  assert.equal(intents.size, 0);
  const r = await post("refresh");
  assert.equal(r.status, 200);
  assert.equal(r.body.proposal.items[0].amount, 30000);
  assert.equal(r.body.approvedRevision, undefined);
});
test("concurrent checkout and confirmation only produce one reservation", async () => {
  await approve();
  const results = await Promise.all([
    post("checkout", { itemId: "stay1" }),
    post("checkout", { itemId: "stay1" }),
  ]);
  results.forEach((r) =>
    assert.ok([200, 409].includes(r.status), JSON.stringify(r.body)),
  );
  assert.ok(results.some((r) => r.status === 200));
  assert.equal(intents.size, 1);
  const pi = [...intents.values()][0];
  assert.equal((await post("confirm", { itemId: "stay1" })).status, 400);
  pi.status = "succeeded";
  const done = await Promise.all([
    post("confirm", { itemId: "stay1" }),
    post("confirm", { itemId: "stay1" }),
  ]);
  done.forEach((r) => assert.equal(r.status, 200, JSON.stringify(r.body)));
  assert.equal(await Booking.countDocuments(), 1);
  assert.equal((await Hotel.findById(hotel._id)).totalBookings, 1);
  assert.equal((await User.findById(user._id)).totalSpent, 200);
});
test("failed Stripe creation is retryable even after original quote expires", async () => {
  await approve();
  failCreate = true;
  assert.equal((await post("checkout", { itemId: "stay1" })).status, 400);
  await Trip.updateOne(
    { _id: trip._id },
    { $set: { quoteExpiresAt: "2020-01-01T00:00:00Z" } },
  );
  failCreate = false;
  const retry = await post("checkout", { itemId: "stay1" });
  assert.equal(retry.status, 200, JSON.stringify(retry.body));
  assert.equal(intents.size, 1);
});
test("remaining quotes refresh while preserving initiated payment approval", async () => {
  const second = {
    ...trip.proposal.items[0],
    id: "stay2",
    date: "2027-06-03",
    endDate: "2027-06-05",
  };
  trip.proposal.items.push(second);
  trip.markModified("proposal");
  await trip.save();
  await approve();
  assert.equal((await post("checkout", { itemId: "stay1" })).status, 200);
  await Hotel.updateOne({ _id: hotel._id }, { $set: { pricePerNight: 150 } });
  const refreshed = await post("refresh");
  assert.equal(refreshed.status, 200, JSON.stringify(refreshed.body));
  trip = refreshed.body;
  assert.equal(trip.proposal.items[0].amount, 20000);
  assert.equal(trip.proposal.items[0].paymentRevision, 1);
  assert.equal(trip.proposal.items[1].amount, 30000);
  [...intents.values()][0].status = "succeeded";
  assert.equal((await post("confirm", { itemId: "stay1" })).status, 200);
  assert.equal(
    (await post("checkout", { itemId: trip.proposal.items[1].id })).status,
    400,
  );
  await approve();
  assert.equal(
    (await post("checkout", { itemId: trip.proposal.items[1].id })).status,
    200,
  );
});
test("cancelled booking is never reported as confirmed on trip reads", async () => {
  await approve();
  await post("checkout", { itemId: "stay1" });
  [...intents.values()][0].status = "succeeded";
  await post("confirm", { itemId: "stay1" });
  await Booking.updateMany(
    {},
    { $set: { status: "cancelled", paymentStatus: "refunded" } },
  );
  const r = await request(app)
    .get(`/api/trips/${trip._id}`)
    .set("Authorization", token);
  assert.equal(r.body.proposal.items[0].status, "cancelled");
  assert.equal(r.body.status, "partial");
  assert.equal((await post("confirm", { itemId: "stay1" })).status, 200);
  assert.equal(await Booking.countDocuments(), 1);
});
test("unconnected suppliers and forged model prices cannot become bookable", async () => {
  const proposal = await planner.quoteProposal({
    ...trip.proposal,
    items: [
      {
        ...trip.proposal.items[0],
        amount: 1,
        status: "confirmed",
        paymentIntentId: "forged",
      },
      {
        id: "x",
        kind: "activity",
        city: "London",
        date: "2027-06-01",
        title: "Museum",
        description: "Visit",
        amount: 500,
        status: "quoted",
        hotelId: String(hotel._id),
      },
    ],
  });
  assert.equal(proposal.items[0].amount, 20000);
  assert.equal(proposal.items[0].paymentIntentId, undefined);
  assert.equal(proposal.items[1].status, "unavailable");
  assert.equal(proposal.items[1].hotelId, undefined);
});
test("date and payment amount guards reject invalid data", () => {
  assert.throws(() => policy.nightsBetween("2027-02-30", "2027-03-02"));
  assert.throws(() => policy.nightsBetween("2027-06-03", "2027-06-01"));
  assert.equal(
    policy.paymentMatches(
      { status: "succeeded", amount: 1, currency: "inr", metadata: {} },
      String(trip._id),
      String(user._id),
      1,
      trip.proposal.items[0],
    ),
    false,
  );
});

test("refresh cannot overwrite a concurrent confirmed reservation", async () => {
  const second = {
    ...trip.proposal.items[0],
    id: "stay2",
    date: "2027-06-03",
    endDate: "2027-06-05",
  };
  trip.proposal.items.push(second);
  trip.markModified("proposal");
  await trip.save();
  await approve();
  await post("checkout", { itemId: "stay1" });
  const original = planner.quoteProposal;
  let release, started;
  const entered = new Promise((r) => (started = r));
  const gate = new Promise((r) => (release = r));
  planner.quoteProposal = async (p) => {
    started();
    await gate;
    return original(p);
  };
  try {
    const refreshing = post("refresh").then((r) => r);
    await entered;
    [...intents.values()][0].status = "succeeded";
    assert.equal((await post("confirm", { itemId: "stay1" })).status, 200);
    release();
    assert.equal((await refreshing).status, 409);
    assert.equal((await post("confirm", { itemId: "stay1" })).status, 200);
    assert.equal(await Booking.countDocuments(), 1);
  } finally {
    planner.quoteProposal = original;
    release();
  }
});
test("refresh cannot detach a concurrently created payment", async () => {
  await approve();
  const original = planner.quoteProposal;
  let release, started;
  let calls = 0;
  const entered = new Promise((r) => (started = r));
  const gate = new Promise((r) => (release = r));
  planner.quoteProposal = async (p) => {
    if (++calls === 1) {
      started();
      await gate;
    }
    return original(p);
  };
  try {
    const refreshing = post("refresh").then((r) => r);
    await entered;
    assert.equal((await post("checkout", { itemId: "stay1" })).status, 200);
    release();
    assert.equal((await refreshing).status, 409);
    const stored = await Trip.findById(trip._id);
    assert.ok(stored.proposal.items[0].paymentIntentId);
    assert.equal(intents.size, 1);
  } finally {
    planner.quoteProposal = original;
    release();
  }
});
