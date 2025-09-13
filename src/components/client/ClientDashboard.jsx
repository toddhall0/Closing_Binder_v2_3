import React, { useMemo } from 'react';
import useClientBinders from '../../hooks/useClientBinders';
import { ClientBinderCard } from './ClientBinderCard';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ClientDashboardService } from '../../services/clientDashboardService';
import { supabase } from '../../lib/supabase';

const partyOptions = [
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'buyer_attorney', label: "Buyer's Attorney" },
  { key: 'seller_attorney', label: "Seller's Attorney" },
  { key: 'lender', label: 'Lender' },
  { key: 'title_company', label: 'Title Company' },
  { key: 'escrow_agent', label: 'Escrow Agent' }
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user } = useAuth();
  const [client, setClient] = React.useState(null);
  const { binders, loading, error, filters, updateFilters, clearFilters, refresh } = useClientBinders(slug);
  const [isFirmAdmin, setIsFirmAdmin] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('cards'); // 'cards' | 'list'
  const [sortBy, setSortBy] = React.useState('published_at');
  const [sortDir, setSortDir] = React.useState('desc');

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        if (!slug || !user) { setIsFirmAdmin(false); return; }
        const { data: client } = await supabase
          .from('clients')
          .select('owner_id')
          .eq('slug', slug)
          .maybeSingle();
        setIsFirmAdmin(!!client && client.owner_id === user.id);
      } catch {
        setIsFirmAdmin(false);
      }
    };
    checkRole();
  }, [slug, user]);

  // Load client details for prominent display
  React.useEffect(() => {
    const loadClient = async () => {
      try {
        if (!slug) { setClient(null); return; }
        const { data, error } = await ClientDashboardService.getClientBySlug(slug);
        if (!error) setClient(data);
      } catch {
        setClient(null);
      }
    };
    loadClient();
  }, [slug]);

  const selectedParties = useMemo(() => new Set(filters.parties || []), [filters.parties]);

  const getBinderState = (b) => {
    const addr = b?.property_address || b?.projects?.property_address || '';
    const m = String(addr).match(/\b([A-Z]{2})\b/);
    return m ? m[1] : '';
  };

  const getBinderClosingDate = (b) => {
    const c = b?.cover_page_data || {};
    return c.closingDate ?? c.closing_date ?? b?.closing_date ?? b?.projects?.closing_date ?? null;
  };

  const getBinderPrice = (b) => {
    const c = b?.cover_page_data || {};
    const v = c.purchasePrice ?? c.purchase_price ?? b?.purchase_price ?? b?.projects?.purchase_price ?? null;
    const n = typeof v === 'number' ? v : parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : null;
  };

  const sortedBinders = useMemo(() => {
    const list = [...binders];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'title':
          av = (a.title || a.projects?.title || '').toLowerCase();
          bv = (b.title || b.projects?.title || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'address':
          av = (a.property_address || a.projects?.property_address || '').toLowerCase();
          bv = (b.property_address || b.projects?.property_address || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'state':
          av = getBinderState(a);
          bv = getBinderState(b);
          return av.localeCompare(bv) * dir;
        case 'closing_date':
          av = getBinderClosingDate(a) ? new Date(getBinderClosingDate(a)).getTime() : 0;
          bv = getBinderClosingDate(b) ? new Date(getBinderClosingDate(b)).getTime() : 0;
          return (av - bv) * dir;
        case 'price':
          av = getBinderPrice(a) ?? -Infinity;
          bv = getBinderPrice(b) ?? -Infinity;
          return (av - bv) * dir;
        default:
          av = new Date(a.published_at || a.created_at || 0).getTime();
          bv = new Date(b.published_at || b.created_at || 0).getTime();
          return (av - bv) * dir;
      }
    });
    return list;
  }, [binders, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const toggleParty = (key) => {
    const next = new Set(selectedParties);
    if (next.has(key)) next.delete(key); else next.add(key);
    updateFilters({ parties: Array.from(next) });
  };

  const openBinder = (binder) => {
    // Use access_code public viewer; route is already configured
    if (binder.access_code) {
      navigate(`/client-binder/${binder.access_code}`);
    }
  };

  const handleDeleteBinder = async (binder) => {
    if (!window.confirm('Remove this binder from the client dashboard?')) return;
    try {
      const { success, error } = await ClientDashboardService.deletePublishedBinder(binder.id);
      if (error || !success) throw error || new Error('Delete failed');
      refresh();
    } catch (e) {
      console.error('Delete binder failed:', e);
      alert('Failed to delete binder.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                {client?.name ? (
                  <>
                    <h1 className="text-3xl font-semibold text-gray-900">{client.name}</h1>
                    <p className="mt-1 text-sm text-gray-600">Client Dashboard — Your Closing Binders</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-medium text-gray-900">Your Closing Binders</h1>
                    <p className="mt-1 text-sm text-gray-600">Access your cover page, table of contents, and documents</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode((m) => (m === 'cards' ? 'list' : 'cards'))}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
                  disabled={loading}
                >
                  {viewMode === 'cards' ? 'List View' : 'Card View'}
                </button>
                <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>Refresh</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by title, address, description..."
              value={filters.query || ''}
              onChange={(e) => updateFilters({ query: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              placeholder="e.g., NY"
              value={filters.state || ''}
              onChange={(e) => updateFilters({ state: e.target.value.toUpperCase() })}
              className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
            />
          </div>
          <div className="flex space-x-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={filters.from || ''}
                onChange={(e) => updateFilters({ from: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={filters.to || ''}
                onChange={(e) => updateFilters({ to: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Parties</label>
          <div className="flex flex-wrap gap-2">
            {partyOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => toggleParty(p.key)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${selectedParties.has(p.key) ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'}`}
              >
                {p.label}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : binders.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900">No binders found</h3>
            <p className="text-sm text-gray-600 mt-1">Try adjusting your filters.</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedBinders.map((b) => (
              <div key={b.id} className="relative">
                <ClientBinderCard binder={b} onOpen={() => openBinder(b)} />
                {isFirmAdmin && (
                  <button
                    onClick={() => handleDeleteBinder(b)}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 border border-red-200 rounded px-2 py-1 text-xs"
                    title="Remove from client dashboard"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('title')}>Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('address')}>Address</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('state')}>State</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('price')}>Purchase Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('closing_date')}>Closing Date</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedBinders.map((b) => {
                  const title = b?.title || b?.projects?.title || 'Closing Binder';
                  const address = b?.property_address || b?.projects?.property_address || '';
                  const state = getBinderState(b);
                  const price = getBinderPrice(b);
                  const closing = getBinderClosingDate(b);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{title}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{address || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{state || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{price != null ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{closing ? new Date(closing).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => openBinder(b)} className="text-sm text-black hover:underline">Open</button>
                        {isFirmAdmin && (
                          <button onClick={() => handleDeleteBinder(b)} className="ml-3 text-sm text-red-600 hover:underline">Remove</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;


