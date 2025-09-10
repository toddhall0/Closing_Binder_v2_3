// src/hooks/useClientBinders.js
import { useState, useEffect, useCallback } from 'react';
import { ClientDashboardService } from '../services/clientDashboardService';

export const useClientBinders = (clientSlug) => {
  const [binders, setBinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    query: '',
    state: '',
    parties: [],
    from: '',
    to: ''
  });

  const fetchBinders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (clientSlug) {
        const { data, error } = await ClientDashboardService.getClientBindersBySlug(clientSlug, filters);
        if (error) throw error;
        setBinders(data.binders);
      } else {
        const { data, error } = await ClientDashboardService.getClientBinders(filters);
        if (error) throw error;
        setBinders(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load client binders');
      setBinders([]);
    } finally {
      setLoading(false);
    }
  }, [filters, clientSlug]);

  useEffect(() => {
    fetchBinders();
  }, [fetchBinders]);

  const updateFilters = useCallback((partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ query: '', state: '', parties: [], from: '', to: '' });
  }, []);

  return {
    binders,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refresh: fetchBinders
  };
};

export default useClientBinders;


