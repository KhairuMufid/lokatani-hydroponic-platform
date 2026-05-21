/**
 * useAlerts — Alert data fetching hook with real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { httpClient } from '../services/httpClient.js';
import useAlertStore from '../stores/useAlertStore.js';

export default function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const setActiveCount = useAlertStore((s) => s.setActiveCount);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpClient.getAlerts(filters);
      if (res.success) {
        setAlerts(res.data || []);
        setCounts(res.counts || {});
        setActiveCount(res.counts?.active || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filters.status, filters.severity, filters.limit, filters.offset, setActiveCount]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, counts, loading, refetch: fetchAlerts };
}
