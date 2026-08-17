const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api';

export async function loginWithGoogle(credential) {
  const response = await fetch(
    `${API_BASE_URL}/auth/google`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      credentials: 'include',

      body: JSON.stringify({
        credential,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google login failed. Status: ${response.status}`
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || 'Google login failed'
    );
  }

  return result.data;
}