const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

// Reads the file name from a Content-Disposition header,
// preferring the UTF-8 filename* form over the plain one.
export function getDownloadFileName(contentDisposition, fallback) {
  if (contentDisposition) {
    const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encoded) {
      try {
        return decodeURIComponent(encoded[1].trim());
      } catch {
        // Fall through to the plain filename
      }
    }

    const plain = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (plain) {
      return plain[1].trim();
    }
  }

  return fallback;
}

async function parseResponse(response) {
  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(`API returned an invalid JSON response (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed with status ${response.status}`
    );
  }

  if (!result?.success) {
    throw new Error(result?.message || 'Request failed');
  }

  return result;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// GET with retries: the server can be slow to wake up or briefly lose
// its database connection, so retry network errors and 5xx responses.
async function getWithRetry(path, { retries = 2, signal } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: 'include',
        signal,
      });

      if (response.status >= 500 && attempt < retries) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await parseResponse(response);
      return result.data;
    } catch (error) {
      if (error?.name === 'AbortError' || attempt >= retries) {
        throw error;
      }

      await wait(800 * (attempt + 1));
    }
  }
}

export async function getTrekCategories(options) {
  const data = await getWithRetry('/trek-category', options);
  return Array.isArray(data) ? data : [];
}

export async function getTreksByCategory(categoryId, options) {
  const data = await getWithRetry(
    `/get-all-trek-details?category_id=${encodeURIComponent(categoryId)}`,
    options
  );
  return Array.isArray(data) ? data : [];
}

export async function getFeaturedTrips(options) {
  const data = await getWithRetry('/featured-trips', options);
  return Array.isArray(data) ? data : [];
}

export async function getPickupPoints(tripId, options) {
  const data = await getWithRetry(
    `/pickup-points?trip_id=${encodeURIComponent(tripId)}`,
    options
  );
  return Array.isArray(data) ? data : [];
}

export async function getReviews() {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}

export async function getWhyUs() {
  const response = await fetch(`${API_BASE_URL}/why-us`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}

export async function getFaq() {
  const response = await fetch(`${API_BASE_URL}/faq`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}

export async function saveTripInterest(tripId, type = 'interested') {
  const response = await fetch(`${API_BASE_URL}/trip-interest`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trip_id: tripId,
      type,
      source: 'website',
    }),
  });

  const result = await parseResponse(response);
  return result.data;
}
