import { store } from '../store';
import { authSuccess, logoutSuccess } from '../store/authSlice';

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Standard typed API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Custom request wrapper that automatically handles Bearer tokens and automatic token refreshing
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${BASE_URL}${endpoint}`;
  const state = store.getState();
  const token = state.auth.token;

  // Clone headers
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If access token is expired, attempt to refresh it
    if (response.status === 401 && token) {
      console.log('[API Service] Access token expired, attempting to refresh...');

      const refreshSuccess = await attemptTokenRefresh();

      if (refreshSuccess) {
        // Retry original request with the fresh token
        const freshToken = store.getState().auth.token;
        if (freshToken) {
          headers.set('Authorization', `Bearer ${freshToken}`);
        }
        response = await fetch(url, { ...config, headers });
      } else {
        // Logout if refresh fails
        store.dispatch(logoutSuccess());
        throw new Error('Session expired. Please log in again.');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    console.error(`[API Service Error] URL: ${url}`, error);
    return {
      success: false,
      message: error.message || 'Network error occurred.'
    };
  }
};

/**
 * Helper to refresh access tokens using cookies
 */
const attemptTokenRefresh = async (): Promise<boolean> => {
  try {
    const refreshUrl = `${BASE_URL}/auth/refresh-token`;
    // Pass credentials to allow HTTP-Only refresh cookie to be sent
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.accessToken) {
      const state = store.getState();
      if (state.auth.user) {
        // Store fresh access token and retain user state
        store.dispatch(
          authSuccess({
            user: state.auth.user,
            token: data.accessToken,
          })
        );
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('[API Service] Token refresh request error:', err);
    return false;
  }
};
