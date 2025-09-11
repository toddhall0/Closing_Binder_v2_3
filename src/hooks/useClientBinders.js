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
        let list = data.binders;
        // Client-side closingDate range filter; assume noon MST (UTC-7) for date comparisons
        if (filters.from || filters.to) {
          const parseMDY = (s) => {
            let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) { return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }; }
            m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
            if (m) { let y = Number(m[3]); if (y < 100) y = 2000 + y; return { y, mo: Number(m[1]), d: Number(m[2]) }; }
            const dt = new Date(s);
            if (isNaN(dt.getTime())) return null;
            return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
          };
          const noonMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 19, 0, 0, 0);
          const startOfDayMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
          const endOfDayMSTUtcTs = ({ y, mo, d }) => {
            const t = Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
            const dt = new Date(t);
            dt.setUTCDate(dt.getUTCDate() + 1);
            dt.setUTCHours(6, 59, 59, 999);
            return dt.getTime();
          };
          const parseNoonMSTTs = (val) => {
            if (!val) return null;
            const s = String(val).trim();
            const parts = parseMDY(s);
            if (!parts) return null;
            return noonMSTUtcTs(parts);
          };
          const fromTs = filters.from ? startOfDayMSTUtcTs(parseMDY(String(filters.from).trim())) : null;
          const toTs = filters.to ? endOfDayMSTUtcTs(parseMDY(String(filters.to).trim())) : null;
          list = list.filter((b) => {
            const cd = b?.cover_page_data?.closingDate || b?.closing_date || b?.projects?.cover_page_data?.closingDate || b?.projects?.closing_date || null;
            const ts = parseNoonMSTTs(cd);
            if (ts == null) return false;
            if (fromTs != null && ts < fromTs) return false;
            if (toTs != null && ts > toTs) return false;
            return true;
          });
        }
        setBinders(list);
      } else {
        const { data, error } = await ClientDashboardService.getClientBinders(filters);
        if (error) throw error;
        let list = data;
        if (filters.from || filters.to) {
          const parseMDY = (s) => {
            let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (m) { return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }; }
            m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
            if (m) { let y = Number(m[3]); if (y < 100) y = 2000 + y; return { y, mo: Number(m[1]), d: Number(m[2]) }; }
            const dt = new Date(s);
            if (isNaN(dt.getTime())) return null;
            return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() };
          };
          const noonMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 19, 0, 0, 0);
          const startOfDayMSTUtcTs = ({ y, mo, d }) => Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
          const endOfDayMSTUtcTs = ({ y, mo, d }) => {
            const t = Date.UTC(y, mo - 1, d, 7, 0, 0, 0);
            const dt = new Date(t);
            dt.setUTCDate(dt.getUTCDate() + 1);
            dt.setUTCHours(6, 59, 59, 999);
            return dt.getTime();
          };
          const parseNoonMSTTs = (val) => {
            if (!val) return null;
            const s = String(val).trim();
            const parts = parseMDY(s);
            if (!parts) return null;
            return noonMSTUtcTs(parts);
          };
          const fromTs = filters.from ? startOfDayMSTUtcTs(parseMDY(String(filters.from).trim())) : null;
          const toTs = filters.to ? endOfDayMSTUtcTs(parseMDY(String(filters.to).trim())) : null;
          list = list.filter((b) => {
            const cd = b?.cover_page_data?.closingDate || b?.closing_date || b?.projects?.cover_page_data?.closingDate || b?.projects?.closing_date || null;
            const ts = parseNoonMSTTs(cd);
            if (ts == null) return false;
            if (fromTs != null && ts < fromTs) return false;
            if (toTs != null && ts > toTs) return false;
            return true;
          });
        }
        setBinders(list);
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


