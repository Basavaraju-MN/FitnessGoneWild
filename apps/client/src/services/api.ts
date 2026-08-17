const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api';

export async function getTrekCategories() {
  const response = await fetch(
    `${API_BASE_URL}/trek-category`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch trek categories. Status: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || 'Failed to fetch trek categories'
    );
  }

  return result.data;
}

export async function getTreksByCategory(categoryId) {
  const response = await fetch(
    `${API_BASE_URL}/get-all-trek-details?category_id=${categoryId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch trek details. Status: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || 'Failed to fetch trek details'
    );
  }

  return result.data;
}