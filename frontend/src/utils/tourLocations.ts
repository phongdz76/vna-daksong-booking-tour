import type { Coordinates, PlaceLocation } from "../types/location";

export const placeGroupLabels = {
  nature: "Thiên nhiên", culture: "Văn hóa", rest: "Ẩm thực & nghỉ chân", pickup: "Điểm đón khách",
};
export const areaScopeLabels = {
  daksong: "Trong Đắk Song", nearby: "Khu vực lân cận", unspecified: "Chưa phân khu vực",
};
export function getPlaceGroup(place: PlaceLocation & { category?: string }) {
  return place.placeGroup || (place.category === "food" ? "rest" :
    ["culture", "history"].includes(place.category || "") ? "culture" : "nature");
}
export function hasCoordinates(place?: PlaceLocation | null): boolean {
  const point = place?.coordinates;
  return Boolean(point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180);
}
export function placeMapUrl(place: PlaceLocation) {
  const query = hasCoordinates(place)
    ? `${place.coordinates!.latitude},${place.coordinates!.longitude}`
    : [place.name, place.address].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?" + new URLSearchParams({ api: "1", query });
}

export function parseCoordinatePair(value: string): Coordinates | null {
  const parts = value.trim().split(/[,;\s]+/);
  if (parts.length !== 2 || parts.some(part => !/^[+-]?\d+(?:\.\d+)?$/.test(part))) return null;
  const coordinates = { latitude: Number(parts[0]), longitude: Number(parts[1]) };
  return hasCoordinates({ coordinates } as PlaceLocation) ? coordinates : null;
}

// No fixed origin: Google Maps lets the visitor use their location or choose a start.
export function placeDirectionsUrl(place: PlaceLocation): string | null {
  if (!hasCoordinates(place)) return null;
  return "https://www.google.com/maps/dir/?" + new URLSearchParams({ api: "1",
    destination: `${place.coordinates!.latitude},${place.coordinates!.longitude}`, travelmode: "driving" });
}

export function getRoutePoints(places: PlaceLocation[], meeting?: PlaceLocation | null) {
  const ordered = meeting ? [meeting, ...places.filter(place => place._id !== meeting._id)] : places;
  return ordered.filter(hasCoordinates);
}

// Google Maps mobile URLs support three waypoints. Split longer routes into
// connected legs so every selected, mapped destination is included.
export function buildRouteLinks(places: PlaceLocation[]) {
  const mapped = places.filter(hasCoordinates);
  const links: { url: string; from: string; to: string }[] = [];
  const coordinate = (place: PlaceLocation) => `${place.coordinates!.latitude},${place.coordinates!.longitude}`;
  for (let start = 0; start < mapped.length - 1; start += 4) {
    const points = mapped.slice(start, start + 5);
    const params = new URLSearchParams({ api: "1", origin: coordinate(points[0]),
      destination: coordinate(points[points.length - 1]), travelmode: "driving" });
    if (points.length > 2) params.set("waypoints", points.slice(1, -1).map(coordinate).join("|"));
    links.push({ url: "https://www.google.com/maps/dir/?" + params,
      from: points[0].name, to: points[points.length - 1].name });
  }
  return links;
}
