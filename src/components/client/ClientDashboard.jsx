import React, { useMemo } from 'react';
import useClientBinders from '../../hooks/useClientBinders';
import { ClientBinderCard } from './ClientBinderCard';
import { Button } from '../common/ui/Button';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ClientDashboardService } from '../../services/clientDashboardService';
import { supabase } from '../../lib/supabase';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user } = useAuth();
  const [client, setClient] = React.useState(null);
  const { binders, loading, error, filters, updateFilters, clearFilters, refresh } = useClientBinders(slug);
  const [isFirmAdmin, setIsFirmAdmin] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('list'); // 'cards' | 'list'
  const [sortBy, setSortBy] = React.useState('published_at');
  const [sortDir, setSortDir] = React.useState('desc');
  const [firmLogoUrl, setFirmLogoUrl] = React.useState(null);

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

  // Load client details for prominent display (by slug or first membership)
  React.useEffect(() => {
    const loadClient = async () => {
      try {
        if (slug) {
          const { data, error } = await ClientDashboardService.getClientBySlug(slug);
          if (!error) setClient(data);
          return;
        }
        // No slug: find a client the current user belongs to via client_users
        const email = (user?.email || '').toLowerCase();
        if (!email) { setClient(null); return; }
        const { data: membership } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('email', email)
          .limit(1)
          .maybeSingle();
        if (membership?.client_id) {
          const { data: c } = await supabase
            .from('clients')
            .select('*')
            .eq('id', membership.client_id)
            .maybeSingle();
          if (c) setClient(c);
        } else {
          setClient(null);
        }
      } catch {
        setClient(null);
      }
    };
    loadClient();
  }, [slug, user?.email]);

  // Resolve firm logo URL by listing storage to find the actual object
  React.useEffect(() => {
    const loadLogo = async () => {
      try {
        const ownerId = client?.owner_id || user?.id || null;
        if (!ownerId) { setFirmLogoUrl(null); return; }
        const buckets = ['documents', 'images', 'public', 'public-assets'];
        const names = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'];
        for (const b of buckets) {
          const { data, error } = await supabase.storage.from(b).list(`firm-logos/${ownerId}`, { limit: 100 });
          if (error || !data) continue;
          const found = data.find((obj) => names.includes(obj.name));
          if (found) {
            const { data: pub } = supabase.storage.from(b).getPublicUrl(`firm-logos/${ownerId}/${found.name}`);
            if (pub?.publicUrl) {
              setFirmLogoUrl(`${pub.publicUrl}?t=${Date.now()}`);
              return;
            }
          }
        }
        setFirmLogoUrl(null);
      } catch {
        setFirmLogoUrl(null);
      }
    };
    loadLogo();
  }, [client?.owner_id, user?.id]);

  // Parties filter removed; ignore filters.parties

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

  const getBinderBuyerCompany = (b) => {
    try {
      const c = b?.cover_page_data || {};
      const buyerFromCover = c?.contact_info?.buyer?.company || c?.buyer || null;
      return (buyerFromCover || b?.buyer || b?.projects?.buyer || '').toString();
    } catch (_) {
      return (b?.buyer || b?.projects?.buyer || '').toString();
    }
  };

  const getBinderSellerCompany = (b) => {
    try {
      const c = b?.cover_page_data || {};
      const sellerFromCover = c?.contact_info?.seller?.company || c?.seller || null;
      return (sellerFromCover || b?.seller || b?.projects?.seller || '').toString();
    } catch (_) {
      return (b?.seller || b?.projects?.seller || '').toString();
    }
  };

  const getClosingYear = (b) => {
    const d = getBinderClosingDate(b);
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return String(dt.getFullYear());
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
        case 'buyer_company':
          av = getBinderBuyerCompany(a).toLowerCase();
          bv = getBinderBuyerCompany(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'seller_company':
          av = getBinderSellerCompany(a).toLowerCase();
          bv = getBinderSellerCompany(b).toLowerCase();
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

  // Firm-style resizable columns for list view
  const defaultColumnWidths = React.useMemo(() => ({
    title: 240,
    client: 220,
    state: 90,
    buyer: 220,
    seller: 220,
    price: 140,
    closing_date: 140,
    actions: 140
  }), []);

  const [columnWidths, setColumnWidths] = React.useState(defaultColumnWidths);
  const resizeRef = React.useRef(null);

  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = Number(columnWidths[key]) || Number(defaultColumnWidths[key]) || 120;
    resizeRef.current = { key, startX, startWidth };

    const handleMouseMove = (ev) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const raw = resizeRef.current.startWidth + dx;
      const minWidth = key === 'state' ? 70 : 110;
      const maxWidth = 600;
      const next = Math.max(minWidth, Math.min(maxWidth, Math.round(raw)));
      setColumnWidths((prev) => ({ ...prev, [resizeRef.current.key]: next }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const ColGroup = () => (
    <colgroup>
      <col style={{ width: columnWidths.title }} />
      <col style={{ width: columnWidths.client }} />
      <col style={{ width: columnWidths.state }} />
      <col style={{ width: columnWidths.buyer }} />
      <col style={{ width: columnWidths.seller }} />
      <col style={{ width: columnWidths.price }} />
      <col style={{ width: columnWidths.closing_date }} />
      <col style={{ width: columnWidths.actions }} />
    </colgroup>
  );

  const HeaderCell = ({ label, sortKey, widthKey, onSort }) => (
    <th
      onClick={onSort ? () => onSort(sortKey) : undefined}
      className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none relative"
    >
      <span className="pr-2">{label}</span>
      <span
        onMouseDown={(e) => startResize(e, widthKey || sortKey)}
        className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize bg-transparent hover:bg-gray-300"
        role="separator"
        aria-orientation="vertical"
      />
    </th>
  );

  const TableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        <HeaderCell label="Title" sortKey="title" widthKey="title" onSort={toggleSort} />
        <HeaderCell label="Client" sortKey="client_name" widthKey="client" onSort={toggleSort} />
        <HeaderCell label="State" sortKey="state" widthKey="state" onSort={toggleSort} />
        <HeaderCell label="Buyer" sortKey="buyer_company" widthKey="buyer" onSort={toggleSort} />
        <HeaderCell label="Seller" sortKey="seller_company" widthKey="seller" onSort={toggleSort} />
        <HeaderCell label="Purchase Price" sortKey="price" widthKey="price" onSort={toggleSort} />
        <HeaderCell label="Closing Date" sortKey="closing_date" widthKey="closing_date" onSort={toggleSort} />
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none relative">
          <span className="pr-2">Actions</span>
          <span
            onMouseDown={(e) => startResize(e, 'actions')}
            className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize bg-transparent hover:bg-gray-300"
            role="separator"
            aria-orientation="vertical"
          />
        </th>
      </tr>
    </thead>
  );

  // Grouped list behavior: by state, closing year, or client
  const groupedForList = useMemo(() => {
    if (sortBy !== 'state' && sortBy !== 'closing_date' && sortBy !== 'client_name') return null;
    const groups = [];
    const keyToIndex = new Map();
    for (const b of sortedBinders) {
      let key = '—';
      if (sortBy === 'state') key = getBinderState(b) || '—';
      else if (sortBy === 'closing_date') key = getClosingYear(b) || '—';
      else if (sortBy === 'client_name') key = (b.client_name || '').toString() || '—';
      if (!keyToIndex.has(key)) {
        keyToIndex.set(key, groups.length);
        groups.push({ key, items: [] });
      }
      groups[keyToIndex.get(key)].items.push(b);
    }
    return groups;
  }, [sortedBinders, sortBy]);

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
            <div className="flex items-stretch justify-between">
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
              <div className="flex-none overflow-hidden m-0 p-0">
                {firmLogoUrl ? (
                  <img src={firmLogoUrl} alt="Firm Logo" className="block h-auto w-auto max-h-[150px] max-w-[400px] object-contain m-0 p-0" />
                ) : (
                  (() => {
                    const ownerId = client?.owner_id || user?.id || null;
                    if (!ownerId) return null;
                    const base = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const buckets = ['documents', 'images', 'public', 'public-assets'];
                    const names = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp'];
                    const bust = `t=${Date.now()}`;
                    return (
                      <>
                        {buckets.flatMap((b) => (
                          names.map((n) => {
                            const u = `${base}/storage/v1/object/public/${b}/firm-logos/${ownerId}/${n}?${bust}`;
                            return (
                              <img
                                key={`${b}-${n}`}
                                src={u}
                                alt="Firm Logo"
                                className="block h-auto w-auto max-h-[150px] max-w-[400px] object-contain m-0 p-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            );
                          })
                        ))}
                      </>
                    );
                  })()
                )}
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
            <select
              className="block w-full px-3 py-2 border border-gray-300 h-10"
              value={filters.state || ''}
              onChange={(e) => updateFilters({ state: e.target.value })}
            >
              <option value="">All states</option>
              {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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

        {/* Clear filters and view toggle */}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={clearFilters}>Clear</Button>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>Refresh</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setViewMode((m) => (m === 'cards' ? 'list' : 'cards'))}
            disabled={loading}
          >
            {viewMode === 'cards' ? 'List View' : 'Card View'}
          </Button>
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
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white border border-red-600 rounded px-2 py-1 text-xs"
                    title="Remove from client dashboard"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!groupedForList && (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <ColGroup />
                  <TableHeader />
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedBinders.map((b) => {
                      const title = b?.title || b?.projects?.title || 'Closing Binder';
                      const state = getBinderState(b);
                      const clientName = (b.client_name || '').toString();
                      const buyer = getBinderBuyerCompany(b);
                      const seller = getBinderSellerCompany(b);
                      const price = getBinderPrice(b);
                      const closing = getBinderClosingDate(b);
                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openBinder(b)}
                        >
                          <td className="px-4 py-2 text-sm text-gray-900">{title}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{clientName || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{state || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{buyer || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{seller || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{price != null ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{closing ? new Date(closing).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <button onClick={(e) => { e.stopPropagation(); openBinder(b); }} className="px-2.5 py-1 rounded bg-black text-white text-xs">Open</button>
                            {isFirmAdmin && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteBinder(b); }} className="ml-3 px-2.5 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700">Remove</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {groupedForList && groupedForList.map((group) => (
              <div key={group.key} className="overflow-x-auto border border-gray-200 rounded-md">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-800">
                  {sortBy === 'state' ? `State: ${group.key}` : sortBy === 'closing_date' ? `Year: ${group.key}` : `Client: ${group.key}`}
                </div>
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <ColGroup />
                  <TableHeader />
                  <tbody className="bg-white divide-y divide-gray-100">
                    {group.items.map((b) => {
                      const title = b?.title || b?.projects?.title || 'Closing Binder';
                      const state = getBinderState(b);
                      const clientName = (b.client_name || '').toString();
                      const buyer = getBinderBuyerCompany(b);
                      const seller = getBinderSellerCompany(b);
                      const price = getBinderPrice(b);
                      const closing = getBinderClosingDate(b);
                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => openBinder(b)}
                        >
                          <td className="px-4 py-2 text-sm text-gray-900">{title}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{clientName || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{state || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{buyer || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{seller || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{price != null ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{closing ? new Date(closing).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <button onClick={(e) => { e.stopPropagation(); openBinder(b); }} className="px-2.5 py-1 rounded bg-black text-white text-xs">Open</button>
                            {isFirmAdmin && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteBinder(b); }} className="ml-3 px-2.5 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700">Remove</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;


