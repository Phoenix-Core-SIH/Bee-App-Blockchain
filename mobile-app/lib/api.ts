import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your LAN IP so a physical phone on the same Wi-Fi can reach this machine.
// 10.0.2.2 is the alias Android emulators use for the host machine.
const IS_EMULATOR = false; // set true if running in Android emulator
const DJANGO_BASE_URL = IS_EMULATOR
  ? 'http://10.0.2.2:8000'
  : 'http://192.168.1.197:8000'; // ← your machine LAN IP

const TOKEN_KEY = 'hivetrack_access_token';
const REFRESH_KEY = 'hivetrack_refresh_token';

// ── Token helpers ──────────────────────────────────────────────────────────────
export async function saveTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

// ── API client ─────────────────────────────────────────────────────────────────
async function apiRequest(
  path: string,
  options: RequestInit = {},
  authenticated = true,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${DJANGO_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, data: err };
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const Auth = {
  requestOtp: (phone_number: string) =>
    apiRequest('/api/accounts/request-otp/', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    }, false),

  verifyOtp: (phone_number: string, otp: string) =>
    apiRequest('/api/accounts/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ phone_number, otp }),
    }, false),

  me: () => apiRequest('/api/accounts/me/'),
};

// ── Apiaries ───────────────────────────────────────────────────────────────────
export const Apiaries = {
  list: () => apiRequest('/api/farm/apiaries/'),
  detail: (id: number) => apiRequest(`/api/farm/apiaries/${id}/`),
  create: (data: { name: string; location: string; latitude?: number; longitude?: number }) =>
    apiRequest('/api/farm/apiaries/', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Hives ──────────────────────────────────────────────────────────────────────
export const Hives = {
  list: (apiaryId?: number) =>
    apiRequest(apiaryId ? `/api/farm/hives/?apiary=${apiaryId}` : '/api/farm/hives/'),
  detail: (id: number) => apiRequest(`/api/farm/hives/${id}/`),
  create: (data: { apiary: number; hive_tag: string; last_known_yield_kg?: number }) =>
    apiRequest('/api/farm/hives/', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Harvests ───────────────────────────────────────────────────────────────────
export const Harvests = {
  list: () => apiRequest('/api/farm/harvests/'),
  create: (data: { apiary: number; batch_number: string; yield_kg: number; harvest_date: string }) =>
    apiRequest('/api/farm/harvests/', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Alerts ─────────────────────────────────────────────────────────────────────
export const Alerts = {
  list: () => apiRequest('/api/farm/alerts/'),
};
