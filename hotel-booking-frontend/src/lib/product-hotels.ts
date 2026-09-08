/** Exclude QA / fixture hotels from guest-facing lists */
export function isProductHotel(hotel: {
  name?: string;
  description?: string;
  imageUrls?: string[];
}): boolean {
  const name = (hotel.name || "").toLowerCase();
  const desc = (hotel.description || "").toLowerCase();
  if (
    /\bqa\b|qa hotel|test hotel|dublin getaways|lorem ipsum/i.test(name) ||
    desc.includes("lorem ipsum")
  ) {
    return false;
  }
  return Array.isArray(hotel.imageUrls) && hotel.imageUrls.length > 0;
}
