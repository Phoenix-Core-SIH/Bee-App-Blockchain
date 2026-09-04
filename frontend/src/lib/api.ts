import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type FetchOptions = RequestInit & {
  requireAuth?: boolean;
};

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = false, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (requireAuth) {
    const token = Cookies.get('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    } else {
      throw new Error('No authentication token found');
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error || data.message || 'An error occurred';
    throw new Error(errorMessage);
  }

  return data;
}
