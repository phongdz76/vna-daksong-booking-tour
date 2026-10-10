// Only editorial fields are changed on existing tours. Departure prices and booking policies stay intact.
const editorialFields = ['name', 'summary', 'description', 'themes', 'destinationIds', 'itinerary', 'sources'];
export function buildTourContent(sample, destinations, existing = null) {
  if (!['create', 'update'].includes(sample.mode)) throw new Error(`Chế độ tour không hợp lệ: ${sample.slug}`);
  if (sample.mode === 'update' && (!existing || existing.slug !== sample.slug ||
    ![sample.originalName, sample.name].includes(existing.name))) {
    throw new Error(`Tour hiện có không khớp: ${sample.slug}`);
  }
  const destinationId = slug => {
    const destination = destinations.find(item => item.slug === slug && item.status !== 'archived');
    if (!destination) throw new Error(`Thiếu điểm đến cho tour ${sample.slug}: ${slug}`);
    return destination._id;
  };
  const destinationIds = sample.destinationSlugs.map(destinationId);
  const itinerary = sample.itinerary.map(({ destinationSlug, ...stop }) => {
    if (destinationSlug && !sample.destinationSlugs.includes(destinationSlug)) throw new Error(`Điểm dừng không thuộc tour: ${destinationSlug}`);
    return { ...stop, destinationId: destinationSlug ? destinationId(destinationSlug) : null };
  });
  const content = { ...sample, destinationIds, itinerary };
  if (existing) return Object.fromEntries(editorialFields.map(field => [field, content[field]]));
  const { mode, previewId, priceFrom, previewChildPrice, destinationSlugs, originalName, ...create } = content;
  return create;
}

export function sameTourContent(existing, changes) {
  const canonical = value => JSON.stringify(value, (key, item) => key === '_id' && item === undefined ? undefined : item);
  return Object.keys(changes).every(field => canonical(existing[field]) === canonical(changes[field]));
}
