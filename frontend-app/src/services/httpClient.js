/**
 * HTTP Client — REST API wrapper
 */

import { API_BASE } from '../utils/constants.js';

import useAuthStore from '../stores/useAuthStore.js';

async function request(url, options = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    
    // Intercept 401 Unauthorized globally (Except for login endpoint to prevent flashing toast bug)
    if (res.status === 401 && !url.includes('/auth/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login'; // Force redirect to prevent infinite loops or broken state
      return { success: false, error: 'Unauthorized: Session expired' };
    }
    
    return await res.json();
  } catch (error) {
    console.error(`[HTTP] Error fetching ${url}:`, error);
    throw error;
  }
}

export const httpClient = {
  getDashboardSummary: () => request('/dashboard/summary'),
  getDashboardTrend: (days = 7) => request(`/dashboard/trend?days=${days}`),
  getLatestDetection: (opts = {}) => request('/detect/latest', opts),
  getLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/logs?${qs}`);
  },
  getLogStats: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/logs/stats?${qs}`);
  },
  getLogDetails: (id) => request(`/logs/${id}/details`),
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts?${qs}`);
  },
  acknowledgeAlert: (id) =>
    request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  resolveAlert: (id) =>
    request(`/alerts/${id}/resolve`, { method: 'PATCH' }),
  getPests: () => request('/pests'),
  getDss: (pestName) => request(`/dss/${pestName}`),
  getSessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sessions?${qs}`);
  },
  login: (username, password) => 
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
};
