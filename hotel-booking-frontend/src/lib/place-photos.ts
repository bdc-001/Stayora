/**
 * Curated Unsplash photo URLs for India / subcontinent places.
 * Used only for destination chips — hotel cards use Cloudinary / seed imageUrls.
 */

const unsplash = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Place → real travel photos (verified Unsplash IDs) */
const PLACE_PHOTOS: Record<string, string[]> = {
  delhi: ["1548013146-72479768bada", "1524492412937-b28074a5d7da"],
  mumbai: ["1578662996442-48f60103fc96", "1605649487212-47bdab064df7"],
  goa: ["1507525428034-b723cf961d3e", "1537996194471-e657df975ab4"],
  jaipur: ["1524492412937-b28074a5d7da", "1548013146-72479768bada"],
  bangalore: ["1605649487212-47bdab064df7", "1578662996442-48f60103fc96"],
  bengaluru: ["1605649487212-47bdab064df7", "1578662996442-48f60103fc96"],
  kerala: ["1537996194471-e657df975ab4", "1552733407-5d5c46c3bb3b"],
  kochi: ["1537996194471-e657df975ab4", "1552733407-5d5c46c3bb3b"],
  colombo: ["1507525428034-b723cf961d3e", "1520250497591-112f2f40a3f4"],
  kathmandu: ["1506905925346-21bda4d32df4", "1469854523086-cc02fe5d8800"],
  dhaka: ["1578662996442-48f60103fc96", "1605649487212-47bdab064df7"],
  lahore: ["1524492412937-b28074a5d7da", "1548013146-72479768bada"],
};

/** Default boutique-hotel photo when a place has no mapping */
const DEFAULT_HOTEL_PHOTO = unsplash("1566073771259-6a8506099945", 400);

export function placePhotoUrl(
  place: string,
  opts?: { width?: number; index?: number },
): string {
  const key = place.trim().toLowerCase();
  const ids = PLACE_PHOTOS[key];
  const w = opts?.width ?? 400;
  if (!ids?.length) return DEFAULT_HOTEL_PHOTO.replace("w=800", `w=${w}`);
  const id = ids[(opts?.index ?? 0) % ids.length];
  return unsplash(id, w);
}
