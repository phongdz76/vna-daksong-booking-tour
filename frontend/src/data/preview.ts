import type { Departure, Destination, ListResponse, Tour } from "../types/api";
import sampleDestinations from "./sampleDestinations.json";
import sampleTours from "./sampleTours.json";
const hero = "https://static.dggv.edu.vn/360/1730690452343_z5997324418175_b447115dd96ccd7f7bd7b83f95a27101.jpg";
import forest from "../assets/stitch/forest.jpg";
const waterfall = "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg";
import windHills from "../assets/stitch/wind-hills.jpg";
const trekking = "https://static.dggv.edu.vn/360/1678326424686_123201-nam-nung-4.jpg";
const coffee = "https://static.dggv.edu.vn/360/1672307656009_z3997641887437_72d09d5c883f6782cf010de95a02b508.jpg";
const camping = "https://static.dggv.edu.vn/360/1678284609637_1.jpg";
const culture = "https://static.dggv.edu.vn/360/1672307604677_z3997641506907_ff6e17b67121e6b6a218553db5c79124.jpg";
const cover = "https://static.dggv.edu.vn/360/1678326424686_123201-nam-nung-4.jpg";
const campfire = "https://static.dggv.edu.vn/360/1672307628550_z3997641691854_c1a54beb77e38d88c1da8ae3447b4f59.jpg";
const clouds = "https://static.dggv.edu.vn/360/1678326310525_daknong-thac-luu-ly.jpg";
const trail = "https://static.dggv.edu.vn/360/1730690452343_z5997324418175_b447115dd96ccd7f7bd7b83f95a27101.jpg";
const meal = "https://static.dggv.edu.vn/360/1672307656009_z3997641887437_72d09d5c883f6782cf010de95a02b508.jpg";
const reviewTour = "https://static.dggv.edu.vn/360/1678287988008_2.jpg";
import mapPreview from "../assets/stitch/map-preview.jpg";
const destinationWaterfall = "https://static.dggv.edu.vn/360/1678287988008_2.jpg";
const teaHills = "https://static.dggv.edu.vn/360/1678284609637_1.jpg";

export const previewImages = {
  hero,
  forest,
  waterfall,
  windHills,
  trekking,
  coffee,
  camping,
  culture,
  cover,
  campfire,
  clouds,
  trail,
  meal,
  reviewTour,
  mapPreview,
  destinationWaterfall,
  teaHills,
};
// Explicit design preview only. Never use this data to hide API errors or send its IDs to the backend.
const previewDestinationIds = ["preview-forest", "preview-waterfall", "preview-wind-hills", "preview-culture", "preview-coffee", "preview-dao-trung"];
export const previewDestinations: Destination[] = sampleDestinations.map((destination, index) => ({
  ...destination,
  _id: previewDestinationIds[index],
  category: destination.category as Destination["category"],
}));
export const previewTours: Tour[] = sampleTours.map((sample) => ({
  ...sample,
  _id: sample.previewId,
  themes: sample.themes as Tour["themes"],
  destinationIds: sample.destinationSlugs.map((slug) => {
    const index = sampleDestinations.findIndex((destination) => destination.slug === slug);
    return previewDestinationIds[index];
  }),
  itinerary: sample.itinerary.map(({ title, description }) => ({ title, description })),
}));
export const previewDepartures: Departure[] = previewTours.filter((tour) => tour.priceFrom != null || tour.referencePrice != null).flatMap((tour) =>
  [7, 14, 21].map((days, index) => {
    const departure = new Date();
    departure.setDate(departure.getDate() + days);
    departure.setHours(7, 30, 0, 0);
    return {
      _id: `${tour._id}-departure-${index}`,
      tourId: tour._id,
      departureAt: departure.toISOString(),
      bookingDeadline: new Date(departure.getTime() - 86400000).toISOString(),
      adultPrice: tour.priceFrom ?? tour.referencePrice ?? 0,
      childPrice: tour.childPolicy
        ? sampleTours.find((sample) => sample.previewId === tour._id)?.previewChildPrice ?? null
        : null,
      maxGuestsPerBooking: 12,
      status: "open" as const,
    };
  }),
);
export function previewList<T>(data: T[]): ListResponse<T> {
  return {
    data,
    pagination: {
      page: 1,
      limit: data.length || 12,
      total: data.length,
      pages: data.length ? 1 : 0,
    },
  };
}
export const previewHomeTours = previewList(previewTours);
export const previewHomeDestinations = previewList(previewDestinations.slice(0, 3));
