import Destination from '../models/Destination.js';

// Keep destinationIds as IDs and preserve the route order chosen by the admin.
export async function getTourLocations(tour, isAdmin = false) {
  const ids = tour.destinationIds.map(String);
  const places = await Destination.find({ _id: { $in: ids },
    status: isAdmin ? { $ne: 'archived' } : 'published' })
    .select('name address locality placeGroup areaScope coordinates').lean();
  const byId = new Map(places.map(place => [String(place._id), place]));
  const routeDestinations = ids.map(id => byId.get(id)).filter(Boolean);
  return { routeDestinations,
    meetingDestination: byId.get(String(tour.meetingDestinationId)) || null };
}

export async function getMeetingDestination(id, destinationIds, status) {
  if (!id) return null;
  if (!destinationIds.map(String).includes(String(id))) return null;
  return Destination.findOne({ _id: id, status: status === 'published' ? 'published' : { $ne: 'archived' } });
}
