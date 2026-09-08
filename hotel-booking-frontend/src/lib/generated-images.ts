import { faker } from "@faker-js/faker";

/** Travel imagery topics for generated place / flight / hotel photos */
export type ImageTopic =
  | "hotel"
  | "city"
  | "flight"
  | "resort"
  | "airport"
  | "travel";

/** Curated Unsplash photo IDs (path after /photo-) — verified HTTP 200 */
const PHOTO_POOLS: Record<ImageTopic, string[]> = {
  hotel: [
    "1566073771259-6a8506099945",
    "1582719508461-905c673771fd",
    "1520250497591-112f2f40a3f4",
    "1551882547-ff40c63fe5fa",
    "1571896349842-33c89424de2d",
  ],
  city: [
    "1548013146-72479768bada",
    "1524492412937-b28074a5d7da",
    "1506905925346-21bda4d32df4",
    "1469854523086-cc02fe5d8800",
    "1578662996442-48f60103fc96",
    "1605649487212-47bdab064df7",
  ],
  flight: ["1436491865332-7a61a109cc05", "1556388158-158ea5ccacbd"],
  airport: ["1436491865332-7a61a109cc05", "1556388158-158ea5ccacbd"],
  resort: [
    "1507525428034-b723cf961d3e",
    "1537996194471-e657df975ab4",
    "1552733407-5d5c46c3bb3b",
    "1520250497591-112f2f40a3f4",
  ],
  travel: [
    "1488646953014-85cb44e25828",
    "1469854523086-cc02fe5d8800",
    "1503220317375-aaad61436b1b",
    "1506905925346-21bda4d32df4",
  ],
};

/** India & subcontinent place photos */
const PLACE_PHOTOS: Record<string, string[]> = {
  delhi: ["1548013146-72479768bada", "1524492412937-b28074a5d7da"],
  mumbai: ["1578662996442-48f60103fc96", "1605649487212-47bdab064df7"],
  goa: ["1507525428034-b723cf961d3e", "1537996194471-e657df975ab4"],
  jaipur: ["1524492412937-b28074a5d7da", "1548013146-72479768bada"],
  bangalore: ["1605649487212-47bdab064df7", "1578662996442-48f60103fc96"],
  bengaluru: ["1605649487212-47bdab064df7", "1578662996442-48f60103fc96"],
  kerala: ["1537996194471-e657df975ab4", "1552733407-5d5c46c3bb3b"],
  colombo: ["1507525428034-b723cf961d3e", "1520250497591-112f2f40a3f4"],
  kathmandu: ["1506905925346-21bda4d32df4", "1469854523086-cc02fe5d8800"],
  dhaka: ["1578662996442-48f60103fc96", "1605649487212-47bdab064df7"],
  lahore: ["1524492412937-b28074a5d7da", "1548013146-72479768bada"],
  varanasi: ["1548013146-72479768bada", "1524492412937-b28074a5d7da"],
  udaipur: ["1524492412937-b28074a5d7da", "1571896349842-33c89424de2d"],
};

/** Popular places across the Indian subcontinent */
export const FEATURED_PLACES: {
  name: string;
  country: string;
  topic: ImageTopic;
}[] = [
  { name: "Delhi", country: "India", topic: "city" },
  { name: "Mumbai", country: "India", topic: "city" },
  { name: "Goa", country: "India", topic: "resort" },
  { name: "Jaipur", country: "India", topic: "city" },
  { name: "Bengaluru", country: "India", topic: "city" },
  { name: "Kerala", country: "India", topic: "resort" },
  { name: "Colombo", country: "Sri Lanka", topic: "city" },
  { name: "Kathmandu", country: "Nepal", topic: "travel" },
];

function seedNumber(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

function unsplashUrl(photoId: string, width: number, height: number): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

/**
 * Deterministic travel image via @faker-js/faker + curated Unsplash pools.
 * Same seed/place always resolves to the same photo.
 */
export function generatedImageUrl(
  seed: string,
  opts?: {
    width?: number;
    height?: number;
    topic?: ImageTopic;
    place?: string;
  },
): string {
  const width = opts?.width ?? 800;
  const height = opts?.height ?? 600;
  const topic = opts?.topic ?? "hotel";
  const n = seedNumber(seed);
  faker.seed(n);

  const placeKey = opts?.place?.trim().toLowerCase();
  const placePool = placeKey ? PLACE_PHOTOS[placeKey] : undefined;
  const pool =
    placePool && placePool.length > 0 ? placePool : PHOTO_POOLS[topic];
  const photoId = faker.helpers.arrayElement(pool);

  return unsplashUrl(photoId, width, height);
}

/** Reliable secondary fallback (Picsum) if Unsplash fails */
export function picsumImageUrl(
  seed: string,
  width = 800,
  height = 600,
): string {
  const n = seedNumber(seed).toString(36);
  return `https://picsum.photos/seed/${encodeURIComponent(n)}/${width}/${height}`;
}
