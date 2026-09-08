/**
 * Wipe + seed MongoDB demo data (Mongoose — not Prisma).
 *
 * Usage: npm run seed
 * Requires MONGODB_CONNECTION_STRING in .env
 *
 * Destroys: User, Hotel, Booking, Review, Analytics collections.
 * Creates test@user.com / 12345678 as admin (for /admin + manual testing).
 * Populates every documented schema field for realistic demos.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user";
import Hotel from "../models/hotel";
import Booking from "../models/booking";
import Review from "../models/review";
import Analytics from "../models/analytics";

/** Distinct real Unsplash hotel/destination photos (no placeholders) */
const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const HOTEL_PHOTOS = {
  delhi: [u("1566073771259-6a8506099945"), u("1582719508461-905c673771fd")],
  goa: [u("1520250497591-112f2f40a3f4"), u("1507525428034-b723cf961d3e")],
  bengaluru: [u("1551882547-ff40c63fe5fa"), u("1571896349842-33c89424de2d")],
  jaipur: [u("1548013146-72479768bada"), u("1524492412937-b28074a5d7da")],
  colombo: [u("1537996194471-e657df975ab4"), u("1552733407-5d5c46c3bb3b")],
};

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const daysAgo = (n: number) => daysFromNow(-n);

async function seed() {
  const uri = process.env.MONGODB_CONNECTION_STRING;
  if (!uri) {
    console.error("Missing MONGODB_CONNECTION_STRING");
    process.exit(1);
  }

  const wantsTls =
    uri.includes("mongodb+srv://") ||
    /[?&]tls=true/i.test(uri) ||
    /[?&]ssl=true/i.test(uri);

  await mongoose.connect(uri, {
    ...(wantsTls
      ? { tls: true, tlsAllowInvalidCertificates: false }
      : {}),
  });
  console.log("Connected. Wiping demo collections…");

  await Promise.all([
    Review.deleteMany({}),
    Booking.deleteMany({}),
    Hotel.deleteMany({}),
    Analytics.deleteMany({}),
    User.deleteMany({}),
  ]);

  console.log("Seeding users (all schema fields)…");
  const admin = await new User({
    email: "test@user.com",
    password: "12345678",
    firstName: "Test",
    lastName: "Admin",
    image: "https://i.pravatar.cc/150?u=admin",
    role: "admin",
    phone: "+91 11 4000 0001",
    address: {
      street: "12 Lodhi Road",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      zipCode: "110003",
    },
    preferences: {
      preferredDestinations: ["Delhi", "Jaipur", "Goa"],
      preferredHotelTypes: ["Boutique", "Luxury"],
      budgetRange: { min: 50, max: 200 },
    },
    totalBookings: 0,
    totalSpent: 0,
    lastLogin: daysAgo(0),
    emailVerified: true,
    isActive: true,
  }).save();

  const owner = await new User({
    email: "owner@hotel.com",
    password: "12345678",
    firstName: "Hotel",
    lastName: "Owner",
    image: "https://i.pravatar.cc/150?u=owner",
    role: "hotel_owner",
    phone: "+91 832 000 0002",
    address: {
      street: "Calangute–Baga Road",
      city: "Goa",
      state: "Goa",
      country: "India",
      zipCode: "403516",
    },
    preferences: {
      preferredDestinations: ["Goa", "Kochi", "Mumbai"],
      preferredHotelTypes: ["Boutique", "Family"],
      budgetRange: { min: 40, max: 150 },
    },
    totalBookings: 0,
    totalSpent: 0,
    lastLogin: daysAgo(1),
    emailVerified: true,
    isActive: true,
  }).save();

  const guest = await new User({
    email: "guest@user.com",
    password: "12345678",
    firstName: "Guest",
    lastName: "Traveler",
    image: "https://i.pravatar.cc/150?u=guest",
    role: "user",
    phone: "+91 80 4000 0123",
    address: {
      street: "100 Feet Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      zipCode: "560038",
    },
    preferences: {
      preferredDestinations: ["Bengaluru", "Goa", "Delhi"],
      preferredHotelTypes: ["Budget", "Apartment"],
      budgetRange: { min: 40, max: 120 },
    },
    totalBookings: 0,
    totalSpent: 0,
    lastLogin: daysAgo(2),
    emailVerified: true,
    isActive: true,
  }).save();

  console.log("Seeding hotels (all schema fields)…");
  const hotelA = await new Hotel({
    userId: owner.id,
    name: "Lodhi Garden Boutique",
    city: "Delhi",
    country: "India",
    description:
      "A calm Lutyens-side boutique with courtyard rooms, minutes from India Gate and Khan Market.",
    type: ["Boutique", "Luxury"],
    adultCount: 2,
    childCount: 1,
    facilities: ["Free WiFi", "Parking", "Spa", "Restaurant"],
    pricePerNight: 12000,
    starRating: 5,
    imageUrls: HOTEL_PHOTOS.delhi,
    lastUpdated: new Date(),
    location: {
      latitude: 28.5916,
      longitude: 77.2197,
      address: {
        street: "12 Lodhi Road",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        zipCode: "110003",
      },
    },
    contact: {
      phone: "+91 11 4000 0001",
      email: "stay@lodhigarden.example",
      website: "https://lodhigarden.example",
    },
    policies: {
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationPolicy: "Free cancel 48h before check-in",
      petPolicy: "Pets on request (₹2,000/night)",
      smokingPolicy: "Non-smoking property",
    },
    amenities: {
      parking: true,
      wifi: true,
      pool: false,
      gym: true,
      spa: true,
      restaurant: true,
      bar: true,
      airportShuttle: true,
      businessCenter: true,
    },
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
    occupancyRate: 72,
    isActive: true,
    isFeatured: true,
  }).save();

  const hotelB = await new Hotel({
    userId: admin.id,
    name: "Baga Shore Stay",
    city: "Goa",
    country: "India",
    description:
      "Family-friendly rooms a short walk from Baga beach — palm shade, pool, and simple Goan meals.",
    type: ["Resort", "Family"],
    adultCount: 4,
    childCount: 2,
    facilities: ["Free WiFi", "Family Rooms", "Swimming Pool", "Restaurant"],
    pricePerNight: 9000,
    starRating: 4,
    imageUrls: HOTEL_PHOTOS.goa,
    lastUpdated: new Date(),
    location: {
      latitude: 15.5573,
      longitude: 73.7517,
      address: {
        street: "Calangute–Baga Road",
        city: "Goa",
        state: "Goa",
        country: "India",
        zipCode: "403516",
      },
    },
    contact: {
      phone: "+91 832 000 0003",
      email: "hello@bagashore.example",
      website: "https://bagashore.example",
    },
    policies: {
      checkInTime: "14:00",
      checkOutTime: "10:00",
      cancellationPolicy: "Free cancel 24h before check-in",
      petPolicy: "No pets",
      smokingPolicy: "Smoking area outdoors only",
    },
    amenities: {
      parking: true,
      wifi: true,
      pool: true,
      gym: false,
      spa: false,
      restaurant: true,
      bar: true,
      airportShuttle: true,
      businessCenter: false,
    },
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
    occupancyRate: 65,
    isActive: true,
    isFeatured: true,
  }).save();

  const hotelC = await new Hotel({
    userId: owner.id,
    name: "Indiranagar Garden Suites",
    city: "Bengaluru",
    country: "India",
    description:
      "Spacious suites in Indiranagar with kitchenettes — ideal for longer tech/city stays.",
    type: ["Apartment"],
    adultCount: 3,
    childCount: 2,
    facilities: ["Free WiFi", "Parking", "Airport Shuttle", "Kitchenette"],
    pricePerNight: 8500,
    starRating: 4,
    imageUrls: HOTEL_PHOTOS.bengaluru,
    lastUpdated: new Date(),
    location: {
      latitude: 12.9784,
      longitude: 77.6408,
      address: {
        street: "100 Feet Road, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        zipCode: "560038",
      },
    },
    contact: {
      phone: "+91 80 4000 0004",
      email: "stay@indiranagar.example",
      website: "https://indiranagar.example",
    },
    policies: {
      checkInTime: "15:00",
      checkOutTime: "11:00",
      cancellationPolicy: "Non-refundable within 7 days",
      petPolicy: "Small pets allowed",
      smokingPolicy: "Strictly non-smoking",
    },
    amenities: {
      parking: true,
      wifi: true,
      pool: false,
      gym: false,
      spa: false,
      restaurant: false,
      bar: false,
      airportShuttle: true,
      businessCenter: false,
    },
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
    occupancyRate: 40,
    isActive: true,
    isFeatured: false,
  }).save();

  const hotelD = await new Hotel({
    userId: owner.id,
    name: "Pink City Haveli",
    city: "Jaipur",
    country: "India",
    description:
      "Heritage-inspired haveli near the City Palace — rooftop views and Rajasthani breakfast.",
    type: ["Boutique", "Heritage"],
    adultCount: 2,
    childCount: 1,
    facilities: ["Free WiFi", "Restaurant", "Rooftop", "Parking"],
    pricePerNight: 7500,
    starRating: 4,
    imageUrls: HOTEL_PHOTOS.jaipur,
    lastUpdated: new Date(),
    location: {
      latitude: 26.9239,
      longitude: 75.8267,
      address: {
        street: "Near City Palace",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        zipCode: "302002",
      },
    },
    contact: {
      phone: "+91 141 4000 0005",
      email: "stay@pinkcity.example",
      website: "https://pinkcity.example",
    },
    policies: {
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationPolicy: "Free cancel 48h before check-in",
      petPolicy: "No pets",
      smokingPolicy: "Non-smoking rooms",
    },
    amenities: {
      parking: true,
      wifi: true,
      pool: false,
      gym: false,
      spa: false,
      restaurant: true,
      bar: false,
      airportShuttle: true,
      businessCenter: false,
    },
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
    occupancyRate: 55,
    isActive: true,
    isFeatured: true,
  }).save();

  const hotelE = await new Hotel({
    userId: admin.id,
    name: "Galle Face Breeze",
    city: "Colombo",
    country: "Sri Lanka",
    description:
      "Seafront rooms on Galle Face — sunset walks and easy access to Colombo’s cafés.",
    type: ["Boutique", "Luxury"],
    adultCount: 2,
    childCount: 1,
    facilities: ["Free WiFi", "Restaurant", "Sea View", "Spa"],
    pricePerNight: 11000,
    starRating: 5,
    imageUrls: HOTEL_PHOTOS.colombo,
    lastUpdated: new Date(),
    location: {
      latitude: 6.9271,
      longitude: 79.8449,
      address: {
        street: "Galle Face",
        city: "Colombo",
        state: "Western Province",
        country: "Sri Lanka",
        zipCode: "00100",
      },
    },
    contact: {
      phone: "+94 11 200 0006",
      email: "stay@galleface.example",
      website: "https://galleface.example",
    },
    policies: {
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationPolicy: "Free cancel 48h before check-in",
      petPolicy: "No pets",
      smokingPolicy: "Non-smoking property",
    },
    amenities: {
      parking: true,
      wifi: true,
      pool: true,
      gym: true,
      spa: true,
      restaurant: true,
      bar: true,
      airportShuttle: true,
      businessCenter: true,
    },
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
    occupancyRate: 60,
    isActive: true,
    isFeatured: true,
  }).save();

  console.log("Seeding bookings (status × paymentStatus matrix + all fields)…");
  const bookingSpecs: Array<{
    hotelId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    adultCount: number;
    childCount: number;
    status: "pending" | "confirmed" | "cancelled" | "completed" | "refunded";
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    paymentMethod?: string;
    specialRequests?: string;
    checkIn: Date;
    checkOut: Date;
    createdAt: Date;
    totalCost: number;
    stripePaymentIntentId?: string;
    cancellationReason?: string;
    refundAmount?: number;
  }> = [
    {
      hotelId: hotelA.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 1,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "card",
      specialRequests: "High floor with river view if available",
      checkIn: daysFromNow(14),
      checkOut: daysFromNow(17),
      createdAt: daysAgo(2),
      totalCost: 67500,
      stripePaymentIntentId: "pi_seed_upcoming_paid",
    },
    {
      hotelId: hotelA.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 0,
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "card",
      specialRequests: "Late check-in after 21:00",
      checkIn: daysFromNow(30),
      checkOut: daysFromNow(32),
      createdAt: daysAgo(1),
      totalCost: 45000,
    },
    {
      hotelId: hotelB.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 0,
      status: "cancelled",
      paymentStatus: "refunded",
      paymentMethod: "card",
      specialRequests: "",
      checkIn: daysFromNow(10),
      checkOut: daysFromNow(12),
      createdAt: daysAgo(5),
      totalCost: 24000,
      stripePaymentIntentId: "pi_seed_cancelled_refunded",
      cancellationReason: "Change of plans",
      refundAmount: 190,
    },
    {
      hotelId: hotelB.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 3,
      childCount: 1,
      status: "cancelled",
      paymentStatus: "paid",
      paymentMethod: "card",
      specialRequests: "Cot for toddler",
      checkIn: daysFromNow(20),
      checkOut: daysFromNow(22),
      createdAt: daysAgo(8),
      totalCost: 24000,
      cancellationReason: "Legacy cancel without PI",
    },
    {
      hotelId: hotelA.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 0,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "card",
      specialRequests: "Quiet room away from lift",
      checkIn: daysAgo(20),
      checkOut: daysAgo(17),
      createdAt: daysAgo(40),
      totalCost: 67500,
      stripePaymentIntentId: "pi_seed_completed_paid",
    },
    {
      hotelId: hotelB.id,
      userId: admin.id,
      firstName: "Test",
      lastName: "Admin",
      email: "test@user.com",
      phone: "+44 20 7946 0001",
      adultCount: 1,
      childCount: 0,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "card",
      specialRequests: "Early check-in if possible",
      checkIn: daysAgo(10),
      checkOut: daysAgo(8),
      createdAt: daysAgo(25),
      totalCost: 24000,
      stripePaymentIntentId: "pi_seed_admin_completed",
    },
    {
      hotelId: hotelA.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 0,
      status: "refunded",
      paymentStatus: "refunded",
      paymentMethod: "card",
      specialRequests: "",
      checkIn: daysAgo(5),
      checkOut: daysAgo(3),
      createdAt: daysAgo(15),
      totalCost: 45000,
      refundAmount: 360,
      stripePaymentIntentId: "pi_seed_status_refunded",
      cancellationReason: "Full refund issued",
    },
    {
      hotelId: hotelC.id,
      userId: guest.id,
      firstName: "Guest",
      lastName: "Traveler",
      email: "guest@user.com",
      phone: "+44 7700 900123",
      adultCount: 2,
      childCount: 1,
      status: "pending",
      paymentStatus: "failed",
      paymentMethod: "card",
      specialRequests: "Accessible room",
      checkIn: daysFromNow(7),
      checkOut: daysFromNow(9),
      createdAt: daysAgo(0),
      totalCost: 30000,
    },
  ];

  const savedBookings = [];
  for (const spec of bookingSpecs) {
    const b = await new Booking({
      userId: spec.userId,
      hotelId: spec.hotelId,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email: spec.email,
      phone: spec.phone,
      adultCount: spec.adultCount,
      childCount: spec.childCount,
      checkIn: spec.checkIn,
      checkOut: spec.checkOut,
      totalCost: spec.totalCost,
      status: spec.status,
      paymentStatus: spec.paymentStatus,
      paymentMethod: spec.paymentMethod,
      specialRequests: spec.specialRequests || "",
      stripePaymentIntentId: spec.stripePaymentIntentId,
      cancellationReason: spec.cancellationReason,
      refundAmount: spec.refundAmount || 0,
      createdAt: spec.createdAt,
      updatedAt: spec.createdAt,
    }).save();
    savedBookings.push(b);
  }

  const paidActive = savedBookings.filter(
    (b) =>
      b.paymentStatus === "paid" &&
      b.status !== "cancelled" &&
      b.status !== "refunded"
  );
  for (const hotel of [hotelA, hotelB, hotelC]) {
    const mine = paidActive.filter((b) => b.hotelId === hotel.id);
    hotel.totalBookings = mine.length;
    hotel.totalRevenue = mine.reduce((s, b) => s + (b.totalCost || 0), 0);
    await hotel.save();
  }

  console.log("Seeding reviews (all schema fields)…");
  const completed = savedBookings.filter((b) => b.status === "completed");
  if (completed[0]) {
    await new Review({
      userId: completed[0].userId,
      hotelId: completed[0].hotelId,
      bookingId: completed[0].id,
      rating: 5,
      comment: "Wonderful stay — staff were exceptional and rooms spotless.",
      categories: {
        cleanliness: 5,
        service: 5,
        location: 5,
        value: 4,
        amenities: 5,
      },
      isVerified: true,
      helpfulCount: 12,
    }).save();
  }
  if (completed[1]) {
    await new Review({
      userId: completed[1].userId,
      hotelId: completed[1].hotelId,
      bookingId: completed[1].id,
      rating: 4,
      comment: "Solid value near the attractions. Breakfast could be stronger.",
      categories: {
        cleanliness: 4,
        service: 4,
        location: 5,
        value: 4,
        amenities: 3,
      },
      isVerified: false,
      helpfulCount: 3,
    }).save();
  }

  for (const hotel of [hotelA, hotelB]) {
    const reviews = await Review.find({ hotelId: hotel.id });
    if (reviews.length) {
      hotel.reviewCount = reviews.length;
      hotel.averageRating =
        Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
        ) / 10;
      await hotel.save();
    }
  }

  console.log("Seeding analytics snapshot (full metrics + breakdown)…");
  await Analytics.create({
    date: new Date(),
    metrics: {
      totalBookings: savedBookings.length,
      totalRevenue: paidActive.reduce((s, b) => s + (b.totalCost || 0), 0),
      totalUsers: 3,
      totalHotels: 3,
      averageBookingValue: 250,
      conversionRate: 62.5,
      cancellationRate: 25,
      averageRating: 4.5,
    },
    breakdown: {
      byStatus: {
        pending: 2,
        confirmed: 1,
        cancelled: 2,
        completed: 2,
        refunded: 1,
      },
      byPaymentStatus: {
        pending: 1,
        paid: 4,
        failed: 1,
        refunded: 2,
      },
      byDestination: [
        { city: "Delhi", bookings: 4, revenue: 1140 },
        { city: "Goa", bookings: 3, revenue: 648 },
        { city: "Bengaluru", bookings: 1, revenue: 0 },
      ],
      byHotelType: [
        { type: "Boutique", bookings: 4, revenue: 1140 },
        { type: "Resort", bookings: 3, revenue: 648 },
        { type: "Apartment", bookings: 1, revenue: 0 },
      ],
    },
  });

  guest.totalBookings = paidActive.filter((b) => b.userId === guest.id).length;
  guest.totalSpent = paidActive
    .filter((b) => b.userId === guest.id)
    .reduce((s, b) => s + (b.totalCost || 0), 0);
  await guest.save();

  admin.totalBookings = paidActive.filter((b) => b.userId === admin.id).length;
  admin.totalSpent = paidActive
    .filter((b) => b.userId === admin.id)
    .reduce((s, b) => s + (b.totalCost || 0), 0);
  await admin.save();

  console.log("Seed complete.");
  console.log("  Admin login: test@user.com / 12345678 (role=admin)");
  console.log("  Owner login: owner@hotel.com / 12345678");
  console.log("  Guest login: guest@user.com / 12345678");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
