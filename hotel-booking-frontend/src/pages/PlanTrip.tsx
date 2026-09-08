import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Compass,
  CreditCard,
  Hotel,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Trash2,
  X,
} from "lucide-react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Trip, TripItem, tripTotal } from "../../../shared/itinerary";
import { tripsApi } from "../lib/trip-api";
import useAppContext from "../hooks/useAppContext";
import { invalidateBookingQueries } from "../lib/invalidate-queries";
import "./plan-trip.css";
import { formatMoney } from "../lib/currency";

const money = (paise: number) => formatMoney(paise / 100);
const examples = [
  {
    label: "Arabian Sea slow days",
    tag: "BEACH & UNWIND",
    text: "Plan a relaxing 5-night trip to Goa for two adults from Mumbai. Quiet beaches, local seafood, boutique stay. Ask me for exact dates and budget in INR.",
  },
  {
    label: "Forts, food & old cities",
    tag: "CULTURE & DISCOVERY",
    text: "Help me plan Delhi and Jaipur over 6 nights for two adults — heritage walks, good food, comfortable hotels. Ask me for dates and budget.",
  },
  {
    label: "Hills for the whole family",
    tag: "FAMILY ADVENTURE",
    text: "Plan a 4-night family trip from Bengaluru to Kochi/Kerala for two adults and two children — easy transfers, kid-friendly activities. Ask me for dates and budget.",
  },
];
const labels: Record<Trip["status"], string> = {
  draft: "A few more details",
  review: "Ready for your review",
  approved: "Approved by you",
  preparing: "Checkout needs attention",
  checkout: "Checkout in progress",
  partial: "Reservations in progress",
  completed: "Trip booked",
};

function Payment({
  trip,
  item,
  secret,
  onSaved,
  onClose,
}: {
  trip: Trip;
  item: TripItem;
  secret: string;
  onSaved: (t: Trip) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError("");
    try {
      const existing = await stripe.retrievePaymentIntent(secret);
      if (existing.error) throw new Error(existing.error.message);
      if (existing.paymentIntent?.status !== "succeeded") {
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Payment form is not ready.");
        const result = await stripe.confirmCardPayment(secret, {
          payment_method: { card },
        });
        if (result.error) throw new Error(result.error.message);
        if (result.paymentIntent?.status !== "succeeded")
          throw new Error(
            "Payment is processing. Recover the reservation once payment is confirmed.",
          );
      }
      onSaved(await tripsApi.update(trip, "confirm", { itemId: item.id }));
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to confirm. Use Recover reservation before paying again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={pay} className="trip-payment">
      <div className="trip-row">
        <h3>Confirm this stay</h3>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Close payment"
        >
          <X size={20} />
        </button>
      </div>
      <p>
        {item.title} · {money(item.amount)}
      </p>
      <p className="trip-muted">
        {item.date} → {item.endDate}
      </p>
      <p className="trip-terms">{item.terms}</p>
      <div className="trip-card-input">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      {error && (
        <p role="alert" className="trip-error">
          {error}
        </p>
      )}
      <button className="trip-primary" disabled={busy || !stripe} type="submit">
        {busy ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <CreditCard size={18} />
        )}{" "}
        Pay {money(item.amount)} & book this stay
      </button>
      <p className="trip-muted">
        Only this stay is charged. Other itinerary items keep their own booking
        status.
      </p>
    </form>
  );
}
function TripStudio() {
  const { isLoggedIn, stripePromise } = useAppContext();
  const account = isLoggedIn
    ? localStorage.getItem("user_id") ||
      localStorage.getItem("session_id") ||
      "guest"
    : "guest";
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const id = params.get("trip");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [input, setInput] = useState(
    () => sessionStorage.getItem(`trip-prompt:${account}`) || "",
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [payment, setPayment] = useState<{
    item: TripItem;
    secret: string;
  } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const history = useQuery(["trips", account], tripsApi.list, {
    enabled: isLoggedIn,
    retry: false,
  });
  const saved = useQuery(["trip", account, id], () => tripsApi.get(id!), {
    enabled: isLoggedIn && !!id,
    retry: false,
  });
  useEffect(() => {
    setTrip(null);
    setPayment(null);
    setConsent(false);
    setInput(
      (account !== "guest" && sessionStorage.getItem("trip-prompt-handoff")) ||
        sessionStorage.getItem(`trip-prompt:${account}`) ||
        "",
    );
    if (account !== "guest") sessionStorage.removeItem("trip-prompt-handoff");
  }, [account]);
  useEffect(() => {
    if (saved.error) {
      setTrip(null);
      setPayment(null);
    }
  }, [saved.error]);
  useEffect(() => {
    if (saved.data && saved.data._id === id) setTrip(saved.data);
  }, [saved.data, id]);
  useEffect(() => {
    if (!id) setTrip(null);
    setPayment(null);
    setConsent(false);
  }, [id]);
  useEffect(() => {
    setConsent(false);
  }, [trip?.revision]);
  useEffect(() => {
    sessionStorage.setItem(`trip-prompt:${account}`, input);
  }, [input, account]);
  useEffect(() => {
    if (trip?.messages.length)
      end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [trip?.messages.length]);
  function receive(t: Trip) {
    setTrip(t);
    setParams({ trip: t._id });
    queryClient.setQueryData(["trip", account, t._id], t);
    void queryClient.invalidateQueries(["trips"]);
  }
  async function perform(name: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(name);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please retry.",
      );
    } finally {
      setBusy("");
    }
  }
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || input.trim().length < 3) return;
    void perform("Planning your trip", async () => {
      receive(
        trip
          ? await tripsApi.update(trip, "messages", { message: input })
          : await tripsApi.create(input),
      );
      setInput("");
    });
  };
  const editable =
    !trip ||
    (["draft", "review", "approved"].includes(trip.status) &&
      !trip.proposal.items.some((i) => i.paymentIntentId || i.bookingId));
  const total = trip ? tripTotal(trip.proposal.items) : 0;
  const confirmed =
    trip?.proposal.items.filter((i) => i.status === "confirmed").length || 0;
  const dates = trip
    ? [...new Set(trip.proposal.items.map((i) => i.date))].sort()
    : [];
  const expired = !!trip && Date.parse(trip.quoteExpiresAt) <= Date.now();
  return (
    <main className="trip-studio">
      <div className="trip-topline">
        <span>
          <span className="trip-dot" /> STAYORA CONCIERGE
        </span>
        <span className="trip-muted">
          <ShieldCheck size={15} /> You approve. We take care of the details.
        </span>
      </div>
      <header className="trip-heading">
        <div>
          <h1>
            A great trip starts
            <br />
            with <em>one conversation.</em>
          </h1>
          <p>
            Tell us what you have in mind. Your travel agent will bring it
            together.
          </p>
        </div>
        <div className="trip-orbit" aria-hidden="true">
          <Compass size={58} strokeWidth={1} />
          <span>
            <Sparkles size={19} />
          </span>
        </div>
      </header>
      <div className="trip-steps" aria-label="Booking steps">
        {["Tell us your plans", "Shape your itinerary", "Approve & book"].map(
          (s, i) => (
            <div
              key={s}
              className={
                (trip
                  ? trip.status === "draft"
                    ? 0
                    : trip.status === "review"
                      ? 1
                      : 2
                  : 0) >= i
                  ? "active"
                  : ""
              }
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              {s}
            </div>
          ),
        )}
      </div>
      <div className="trip-workspace">
        <section className="trip-chat" aria-label="Travel conversation">
          <div className="trip-panel-header">
            <div className="trip-row">
              <div className="trip-avatar">
                <Sparkles size={20} />
              </div>
              <div>
                <h2>Your travel companion</h2>
                <p className="trip-muted">Thoughtful plans. Your final say.</p>
              </div>
            </div>
            <button
              aria-label="Start a new trip"
              disabled={!!busy}
              onClick={() => {
                setParams({});
                setTrip(null);
                setError("");
                setInput("");
              }}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="trip-messages" aria-live="polite">
            <div className="trip-message assistant">
              <span className="trip-message-label">STAYORA</span>
              <p>Where in India (or nearby) are you headed?</p>
              <p className="trip-muted">
                Share dates, cities from Delhi to Colombo, who’s coming, and
                what the trip should feel like. We’ll shape the rest together.
              </p>
            </div>
            {!trip && (
              <div className="trip-starters">
                {examples.map((e) => (
                  <button
                    disabled={!!busy}
                    key={e.tag}
                    onClick={() => setInput(e.text)}
                  >
                    <span>{e.tag}</span>
                    <strong>{e.label}</strong>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            )}
            {trip?.messages.map((m, i) => (
              <div key={i} className={`trip-message ${m.role}`}>
                <span className="trip-message-label">
                  {m.role === "user" ? "YOU" : "STAYORA"}
                </span>
                <p>{m.content}</p>
              </div>
            ))}
            {busy === "Planning your trip" && (
              <div className="trip-thinking" role="status">
                <Loader2 size={18} className="animate-spin" />
                <span>Considering your preferences and matching stays…</span>
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="trip-composer">
            <label htmlFor="trip-input" className="sr-only">
              Describe your trip or request a change
            </label>
            <textarea
              id="trip-input"
              maxLength={4000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!busy || !editable}
              placeholder={
                editable
                  ? "A week in Italy, small hotels, great food…"
                  : "Checkout has started. Start a new trip for a different itinerary."
              }
              rows={3}
            />
            <div className="trip-row">
              <span className="trip-muted">
                {editable
                  ? "Every detail can be refined together"
                  : "Your approved itinerary is locked"}
              </span>
              {isLoggedIn ? (
                <button
                  aria-label="Send trip request"
                  className="trip-send"
                  disabled={!!busy || !editable || input.trim().length < 3}
                >
                  <Send size={18} />
                </button>
              ) : (
                <Link
                  className="trip-signin"
                  to="/sign-in"
                  state={{ from: { pathname: "/plan-trip" } }}
                  onClick={() =>
                    sessionStorage.setItem("trip-prompt-handoff", input)
                  }
                >
                  Sign in to plan <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </form>
        </section>
        <section className="trip-itinerary" aria-label="Your itinerary">
          <div className="trip-panel-header">
            <div>
              <span className="trip-eyebrow">THE BIG PICTURE</span>
              <h2>
                {trip ? trip.proposal.title : "Your itinerary, coming together"}
              </h2>
            </div>
            <span className="trip-status">
              {trip ? labels[trip.status] : "A blank canvas"}
            </span>
          </div>
          {Boolean(error || saved.error || history.error) && (
            <div className="trip-error" role="alert">
              {error ||
                (saved.error instanceof Error
                  ? saved.error.message
                  : history.error instanceof Error
                    ? history.error.message
                    : "")}
              <button
                disabled={!!busy}
                onClick={() => {
                  setError("");
                  if (id) void saved.refetch();
                  void history.refetch();
                }}
              >
                {" "}
                Reload saved trips
              </button>
            </div>
          )}
          {saved.isLoading && (
            <p role="status" className="trip-muted p-6">
              Loading your saved itinerary…
            </p>
          )}
          {!trip ? (
            <div className="trip-empty">
              <div className="trip-map-art" aria-hidden="true">
                <div className="trip-map-line" />
                <span className="trip-pin pin-one">
                  <Hotel size={24} />
                </span>
                <span className="trip-pin pin-two">
                  <MapPin size={24} />
                </span>
                <span className="trip-pin pin-three">
                  <Compass size={24} />
                </span>
              </div>
              <span className="trip-eyebrow">
                LESS PLANNING. MORE POSSIBILITY.
              </span>
              <h3>
                From “what if” to
                <br />
                “we’re going.”
              </h3>
              <p>
                Your stays, daily discoveries, and travel connections will
                appear here as we plan.
              </p>
              <div className="trip-promise">
                <ShieldCheck size={20} />
                <span>
                  Nothing is booked or charged
                  <br />
                  until you review and confirm.
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="trip-overview">
                <p>{trip.proposal.summary}</p>
                <div className="trip-chips">
                  <span>
                    {trip.proposal.adults} adults · {trip.proposal.children}{" "}
                    children
                  </span>
                  <span>Version {trip.revision}</span>
                  <span>
                    {trip.proposal.budget
                      ? `${money(trip.proposal.budget * 100)} trip budget`
                      : "Budget to be discussed"}
                  </span>
                  {confirmed > 0 && (
                    <span>
                      {confirmed} reservation{confirmed > 1 ? "s" : ""}{" "}
                      confirmed
                    </span>
                  )}
                </div>
              </div>
              {!trip.proposal.items.length && (
                <p className="trip-muted p-6">
                  Answer your companion’s question to start shaping the
                  itinerary.
                </p>
              )}
              <div className="trip-days">
                {dates.map((date, d) => (
                  <section key={date} className="trip-day">
                    <div className="trip-day-label">
                      <b>{String(d + 1).padStart(2, "0")}</b>
                      <div>
                        <h3>
                          {new Date(`${date}T12:00:00`).toLocaleDateString(
                            "en-IN",
                            { weekday: "long", day: "numeric", month: "short" },
                          )}
                        </h3>
                        <span>
                          {
                            trip.proposal.items.find((i) => i.date === date)
                              ?.city
                          }
                        </span>
                      </div>
                    </div>
                    {trip.proposal.items
                      .filter((i) => i.date === date)
                      .map((item) => (
                        <article key={item.id} className="trip-item">
                          <div className={`trip-item-icon ${item.kind}`}>
                            {item.kind === "hotel" ? (
                              <Hotel size={20} />
                            ) : item.kind === "transport" ? (
                              <TrainFront size={20} />
                            ) : (
                              <Compass size={20} />
                            )}
                          </div>
                          <div className="trip-item-body">
                            <div className="trip-row">
                              <span className="trip-eyebrow">
                                {item.kind === "hotel"
                                  ? "YOUR STAY"
                                  : item.kind === "transport"
                                    ? "GETTING THERE"
                                    : "A LITTLE DISCOVERY"}
                              </span>
                              {editable && (
                                <button
                                  disabled={!!busy}
                                  aria-label={`Remove ${item.title}`}
                                  onClick={() =>
                                    void perform("Removing item", async () =>
                                      receive(
                                        await tripsApi.update(trip, "remove", {
                                          itemId: item.id,
                                        }),
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <h4>{item.title}</h4>
                            <p>{item.description}</p>
                            {item.endDate && (
                              <p className="trip-muted">
                                {item.date} → {item.endDate}
                              </p>
                            )}
                            <div className="trip-row trip-item-price">
                              <strong>
                                {item.status === "unavailable"
                                  ? "Arrange separately"
                                  : money(item.amount)}
                              </strong>
                              <span
                                className={
                                  item.status === "confirmed"
                                    ? "trip-confirmed"
                                    : "trip-muted"
                                }
                              >
                                {item.status === "confirmed"
                                  ? "✓ Confirmed"
                                  : item.status === "cancelled"
                                    ? "Cancelled / unavailable"
                                    : item.status === "quoted"
                                      ? "Property quote"
                                      : "Not booked"}
                              </span>
                            </div>
                            <details>
                              <summary>
                                {item.status === "unavailable"
                                  ? "Booking availability"
                                  : "Cancellation & booking terms"}
                              </summary>
                              <p>{item.terms}</p>
                            </details>
                            {item.bookingId && (
                              <p className="trip-reference">
                                Reservation: {item.bookingId}
                              </p>
                            )}
                            {[
                              "approved",
                              "preparing",
                              "checkout",
                              "partial",
                            ].includes(trip.status) &&
                              item.status === "quoted" && (
                                <div className="trip-book-actions">
                                  <button
                                    className="trip-secondary"
                                    disabled={
                                      !!busy ||
                                      !import.meta.env.VITE_STRIPE_PUB_KEY
                                    }
                                    onClick={() =>
                                      void perform(
                                        "Preparing secure checkout",
                                        async () => {
                                          const p = await tripsApi.checkout(
                                            trip,
                                            item.id,
                                          );
                                          receive(await tripsApi.get(trip._id));
                                          setPayment({
                                            item,
                                            secret: p.clientSecret,
                                          });
                                        },
                                      )
                                    }
                                  >
                                    <CreditCard size={15} /> Review & pay for
                                    stay
                                  </button>
                                  {item.paymentIntentId && (
                                    <button
                                      className="trip-text-button"
                                      disabled={!!busy}
                                      onClick={() =>
                                        void perform(
                                          "Recovering reservation",
                                          async () => {
                                            receive(
                                              await tripsApi.update(
                                                trip,
                                                "confirm",
                                                { itemId: item.id },
                                              ),
                                            );
                                            await invalidateBookingQueries(
                                              queryClient,
                                            );
                                          },
                                        )
                                      }
                                    >
                                      Recover reservation
                                    </button>
                                  )}
                                </div>
                              )}
                          </div>
                        </article>
                      ))}
                  </section>
                ))}
              </div>
              {payment && (
                <Elements
                  stripe={stripePromise}
                  key={payment.secret}
                  options={{ clientSecret: payment.secret }}
                >
                  <Payment
                    trip={trip}
                    item={payment.item}
                    secret={payment.secret}
                    onSaved={(t) => {
                      receive(t);
                      void invalidateBookingQueries(queryClient);
                    }}
                    onClose={() => setPayment(null)}
                  />
                </Elements>
              )}
              {!!trip.proposal.items.length && (
                <div className="trip-approval">
                  <div className="trip-row">
                    <div>
                      <span className="trip-eyebrow">BOOKABLE STAYS TOTAL</span>
                      <h3>{money(total)}</h3>
                    </div>
                    <ShieldCheck size={30} />
                  </div>
                  <p>
                    Activities and transport marked “Arrange separately” use
                    India-subcontinent market references (INR via Frankfurter
                    FX) and are excluded from the bookable total. Hotel quotes
                    follow Stayora property listings in INR; room-level
                    availability is not supplied by this website.
                  </p>
                  {trip.proposal.budget > 0 &&
                    total > trip.proposal.budget * 100 && (
                      <p className="trip-error">
                        Stays exceed your trip budget. Ask your companion for
                        lower-cost options.
                      </p>
                    )}
                  {trip.status === "review" && (
                    <>
                      <label className="trip-consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        I’ve reviewed the itinerary, prices, and terms. I
                        understand unbooked items must be arranged separately.
                      </label>
                      <button
                        className="trip-primary"
                        disabled={!consent || !!busy || expired}
                        onClick={() =>
                          void perform("Saving approval", async () =>
                            receive(
                              await tripsApi.update(trip, "approve", {
                                approvedTotal: total,
                              }),
                            ),
                          )
                        }
                      >
                        <CheckCheck size={18} /> Approve itinerary{" "}
                        <ArrowRight size={18} />
                      </button>
                    </>
                  )}
                  {["review", "approved", "checkout", "partial"].includes(
                    trip.status,
                  ) && (
                    <button
                      disabled={!!busy}
                      className="trip-text-button"
                      onClick={() =>
                        void perform("Refreshing quotes", async () =>
                          receive(await tripsApi.update(trip, "refresh")),
                        )
                      }
                    >
                      <RefreshCw size={14} />{" "}
                      {expired
                        ? "Quote expired — refresh remaining stays"
                        : "Refresh remaining property quotes"}
                    </button>
                  )}
                  {trip.approvedAt && (
                    <p className="trip-approved-note">
                      <Check size={15} /> Version {trip.approvedRevision}{" "}
                      approved by you. Each stay requires payment confirmation.
                    </p>
                  )}
                  {!import.meta.env.VITE_STRIPE_PUB_KEY && (
                    <p className="trip-muted">
                      Payments are not configured on this deployment yet.
                    </p>
                  )}
                  {confirmed > 0 && (
                    <Link to="/my-bookings" className="trip-text-button">
                      View confirmed reservations <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {busy && busy !== "Planning your trip" && (
        <p className="trip-working" role="status">
          <Loader2 className="animate-spin" size={16} />
          {busy}…
        </p>
      )}
      {!!history.data?.length && (
        <section className="trip-history">
          <div className="trip-row">
            <h2>Pick up where you left off</h2>
            <span className="trip-muted">Your saved journeys</span>
          </div>
          <div>
            {history.data.map((t) => (
              <button
                disabled={!!busy}
                key={t._id}
                onClick={() => {
                  setParams({ trip: t._id });
                  setTrip(t);
                  setError("");
                }}
              >
                <Compass size={22} />
                <span>
                  <strong>{t.proposal.title}</strong>
                  <small>
                    {labels[t.status]} ·{" "}
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default function PlanTrip() {
  const { isLoggedIn } = useAppContext();
  const account = isLoggedIn
    ? localStorage.getItem("user_id") ||
      localStorage.getItem("session_id") ||
      "guest"
    : "guest";
  return <TripStudio key={account} />;
}
