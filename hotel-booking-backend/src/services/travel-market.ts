/**
 * India-subcontinent travel market helpers.
 * - Transparent domestic/regional flight reference bands in INR (not bookable tickets)
 * - Optional Frankfurter FX note for context only
 *
 * Bookable stays come only from Mongo hotel inventory + Stripe INR (paise).
 */

export type MarketFlightHint = {
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  estimateInr: number;
  currencyNote: string;
  source: "route-band" | "amadeus";
  bookable: false;
};

type Airport = {
  iata: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

/** Major airports across the Indian subcontinent */
const AIRPORTS: Airport[] = [
  { iata: "DEL", city: "Delhi", country: "India", lat: 28.5562, lon: 77.1 },
  { iata: "BOM", city: "Mumbai", country: "India", lat: 19.0896, lon: 72.8656 },
  { iata: "BLR", city: "Bengaluru", country: "India", lat: 13.1986, lon: 77.7066 },
  { iata: "MAA", city: "Chennai", country: "India", lat: 12.9941, lon: 80.1709 },
  { iata: "HYD", city: "Hyderabad", country: "India", lat: 17.2403, lon: 78.4294 },
  { iata: "CCU", city: "Kolkata", country: "India", lat: 22.6547, lon: 88.4467 },
  { iata: "GOI", city: "Goa", country: "India", lat: 15.3808, lon: 73.8314 },
  { iata: "JAI", city: "Jaipur", country: "India", lat: 26.8242, lon: 75.8122 },
  { iata: "COK", city: "Kochi", country: "India", lat: 10.152, lon: 76.4019 },
  { iata: "AMD", city: "Ahmedabad", country: "India", lat: 23.0772, lon: 72.6347 },
  { iata: "PNQ", city: "Pune", country: "India", lat: 18.5822, lon: 73.9197 },
  { iata: "IXC", city: "Chandigarh", country: "India", lat: 30.6735, lon: 76.7885 },
  { iata: "CMB", city: "Colombo", country: "Sri Lanka", lat: 7.1808, lon: 79.8841 },
  { iata: "KTM", city: "Kathmandu", country: "Nepal", lat: 27.6966, lon: 85.3591 },
  { iata: "DAC", city: "Dhaka", country: "Bangladesh", lat: 23.8433, lon: 90.3978 },
  { iata: "LHE", city: "Lahore", country: "Pakistan", lat: 31.5216, lon: 74.4036 },
  { iata: "KHI", city: "Karachi", country: "Pakistan", lat: 24.9065, lon: 67.1608 },
];

const CITY_TO_IATA: Record<string, string> = Object.fromEntries(
  AIRPORTS.flatMap((a) => [
    [a.city.toLowerCase(), a.iata],
    [a.iata.toLowerCase(), a.iata],
  ]),
);
CITY_TO_IATA["bangalore"] = "BLR";
CITY_TO_IATA["bombay"] = "BOM";
CITY_TO_IATA["calcutta"] = "CCU";
CITY_TO_IATA["madras"] = "MAA";
CITY_TO_IATA["kerala"] = "COK";
CITY_TO_IATA["kochi"] = "COK";
CITY_TO_IATA["cochin"] = "COK";
CITY_TO_IATA["new delhi"] = "DEL";

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

/** Typical India domestic economy one-way INR bands by distance (transparent heuristic). */
function inrBandForDistance(km: number): number {
  if (km < 400) return 3500;
  if (km < 800) return 5500;
  if (km < 1400) return 7500;
  if (km < 2200) return 11000;
  return 16000;
}

export function resolveAirport(cityOrIata: string): Airport | undefined {
  const key = cityOrIata.trim().toLowerCase();
  const iata = CITY_TO_IATA[key];
  if (!iata) return undefined;
  return AIRPORTS.find((a) => a.iata === iata);
}

export async function estimateSubcontinentFlight(
  originCity: string,
  destinationCity: string,
): Promise<MarketFlightHint | null> {
  const origin = resolveAirport(originCity);
  const destination = resolveAirport(destinationCity);
  if (!origin || !destination || origin.iata === destination.iata) return null;

  const distanceKm = haversineKm(origin, destination);
  const estimateInr = inrBandForDistance(distanceKm);

  return {
    origin: origin.iata,
    destination: destination.iata,
    originCity: origin.city,
    destinationCity: destination.city,
    distanceKm,
    estimateInr,
    currencyNote: `Reference fare ~₹${estimateInr.toLocaleString("en-IN")} via India domestic distance band (~${distanceKm} km). Not a live ticket; arrange separately.`,
    source: "route-band",
    bookable: false,
  };
}

/** Popular corridors for agent context (Delhi/Mumbai hub network). */
export async function popularIndiaRoutes(): Promise<MarketFlightHint[]> {
  const pairs: [string, string][] = [
    ["Delhi", "Mumbai"],
    ["Delhi", "Goa"],
    ["Mumbai", "Goa"],
    ["Delhi", "Jaipur"],
    ["Bengaluru", "Goa"],
    ["Delhi", "Kathmandu"],
    ["Mumbai", "Colombo"],
    ["Delhi", "Dhaka"],
    ["Bengaluru", "Colombo"],
    ["Delhi", "Kochi"],
  ];
  const out: MarketFlightHint[] = [];
  for (const [o, d] of pairs) {
    const hint = await estimateSubcontinentFlight(o, d);
    if (hint) out.push(hint);
  }
  return out;
}

export type MarketContext = {
  region: "india-subcontinent";
  currency: "INR";
  flights: MarketFlightHint[];
  note: string;
};

export async function buildIndiaMarketContext(): Promise<MarketContext> {
  const flights = await popularIndiaRoutes();
  return {
    region: "india-subcontinent",
    currency: "INR",
    flights,
    note: "Stayora books hotels from on-platform inventory in INR (Stripe paise). Flight/activity figures are market references for India & neighbours only — not tickets.",
  };
}

/**
 * Match a transport item title/city to a market hint and return INR paise estimate.
 */
export async function marketAmountForTransport(opts: {
  title: string;
  city: string;
  originHint?: string;
}): Promise<{ amountPence: number; terms: string } | null> {
  const text = `${opts.title} ${opts.city} ${opts.originHint || ""}`.toLowerCase();
  const flights = await popularIndiaRoutes();
  const hit = flights.find(
    (f) =>
      text.includes(f.originCity.toLowerCase()) &&
      text.includes(f.destinationCity.toLowerCase()),
  );
  if (hit) {
    return {
      // Field name kept for trip-planner compatibility; value is INR paise (₹ × 100).
      amountPence: Math.round(hit.estimateInr * 100),
      terms: hit.currencyNote,
    };
  }
  // Single-city domestic hop: estimate from Delhi hub if destination known
  const dest = resolveAirport(opts.city);
  if (dest && dest.iata !== "DEL") {
    const fromDelhi = await estimateSubcontinentFlight("Delhi", dest.city);
    if (fromDelhi) {
      return {
        amountPence: Math.round(fromDelhi.estimateInr * 100),
        terms: fromDelhi.currencyNote,
      };
    }
  }
  return null;
}
