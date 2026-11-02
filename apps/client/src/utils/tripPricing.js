// Categories sold only with transportation (no "without transport" ticket).
// 3 = Backpacking
export const WITH_TRANSPORT_ONLY_CATEGORY_IDS = [3];

export const isWithTransportOnly = (trip) =>
  WITH_TRANSPORT_ONLY_CATEGORY_IDS.includes(Number(trip?.category_id));

export const getWithoutTransportPrice = (trip) =>
  Number(trip?.without_transport_price ?? trip?.price ?? 0);

export const getWithTransportPrice = (trip) =>
  Number(
    trip?.with_transport_price ??
      trip?.transportation_price ??
      getWithoutTransportPrice(trip)
  );

// Price shown on cards and headers: the with-transport price for
// transport-only trips, otherwise the (lower) without-transport price.
export const getDisplayPrice = (trip) =>
  isWithTransportOnly(trip)
    ? getWithTransportPrice(trip)
    : getWithoutTransportPrice(trip);

// Categories that do not show a difficulty level.
// 3 = Backpacking
export const HIDE_DIFFICULTY_CATEGORY_IDS = [3];

export const showsDifficulty = (trip) =>
  Boolean(trip?.difficulty) &&
  !HIDE_DIFFICULTY_CATEGORY_IDS.includes(Number(trip?.category_id));

// Categories that do not show a distance.
// 3 = Backpacking
export const HIDE_DISTANCE_CATEGORY_IDS = [3];

export const showsDistance = (trip) =>
  Boolean(trip?.distance_label) &&
  !HIDE_DISTANCE_CATEGORY_IDS.includes(Number(trip?.category_id));

// What one trip is called on the website: "trek" for the trek categories
// (1 = Weekend treks, 2 = One day treks), "trip" for every other category
// (Backpacking, Bike rides, Tours…). Lists of everything say "trips".
export const TREK_CATEGORY_IDS = [1, 2];

export const tripWord = (trip) =>
  TREK_CATEGORY_IDS.includes(Number(trip?.category_id)) ? 'trek' : 'trip';

// A trip's own page: /treks/<slug> for treks, /trips/<slug> for other trips
export const tripPath = (trip) => `/${tripWord(trip)}s/${encodeURIComponent(trip?.slug || '')}`;
