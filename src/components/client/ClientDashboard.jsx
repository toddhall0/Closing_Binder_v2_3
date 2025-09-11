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
              <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>Refresh</Button>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {binders.map((b) => (
              <div key={b.id} className="relative">
                <ClientBinderCard binder={b} onOpen={() => openBinder(b)} />
                {/* Firm-only delete control */}
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
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;


