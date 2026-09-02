const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

async function parseResponse(response: Response) {
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

export async function getTrekCategories() {
  const response = await fetch(`${API_BASE_URL}/trek-category`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}

export async function getTreksByCategory(categoryId: number) {
  const response = await fetch(
    `${API_BASE_URL}/get-all-trek-details?category_id=${encodeURIComponent(categoryId)}`,
    {
      credentials: 'include',
    }
  );

  const result = await parseResponse(response);
  return result.data;
}

export async function getFeaturedTrips() {
  const response = await fetch(`${API_BASE_URL}/featured-trips`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}

export async function getReviews() {
  const response = await fetch(`${API_BASE_URL}/reviews`, {
    credentials: 'include',
  });

  const result = await parseResponse(response);
  return result.data;
}
