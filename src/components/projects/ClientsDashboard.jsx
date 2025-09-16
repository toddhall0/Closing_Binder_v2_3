import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientsService from '../../services/clientsService';
import { Button } from './Button';
import CreateClientModal from './CreateClientModal';
import EditClientModal from './EditClientModal';

const ClientsDashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [newClient, setNewClient] = useState({ name: '', email: '', representative: '', company: '', address: '', repPhone: '', repEmail: '', web: '' });
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeClient, setActiveClient] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Removed Open action per request; client dashboard can be opened elsewhere

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await ClientsService.getClients(search);
      if (error) throw error;
      setClients(data);
    } catch (e) {
      setError(e.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadClients, 250);
    return () => clearTimeout(t);
  }, [search]);

  const getRepName = (c) => (c?.details?.representative || '').toString();
  const getRepPhone = (c) => (c?.details?.repPhone || '').toString();
  const getEmail = (c) => (c?.email || c?.details?.repEmail || '').toString();

  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) return value; // display raw if not 10 digits
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortedClients = React.useMemo(() => {
    const list = [...clients];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let av = '', bv = '';
      switch (sortBy) {
        case 'name':
          av = (a.name || '').toLowerCase();
          bv = (b.name || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'representative':
          av = getRepName(a).toLowerCase();
          bv = getRepName(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'phone':
          av = getRepPhone(a).replace(/\D/g, '');
          bv = getRepPhone(b).replace(/\D/g, '');
          return av.localeCompare(bv) * dir;
        case 'email':
          av = getEmail(a).toLowerCase();
          bv = getEmail(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [clients, sortBy, sortDir]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClient.name) return;
    setCreating(true);
    try {
      const details = {
        company: newClient.company || null,
        representative: newClient.representative || null,
        address: newClient.address || null,
        repPhone: newClient.repPhone || null,
        repEmail: newClient.repEmail || null,
        web: newClient.web || null
      };
      const { data, error } = await ClientsService.createClient({ name: newClient.name, email: newClient.email || null, details });
      if (error) throw error;
      setNewClient({ name: '', email: '', representative: '', company: '', address: '', repPhone: '', repEmail: '', web: '' });
      setSearch('');
      await loadClients();
    } catch (e) {
      alert(e.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-medium text-gray-900">Clients</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your firm’s clients and their access</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setCreateOpen(true)} disabled={loading}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Clients</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors h-10"
          />
        </div>
        <div className="mb-6 flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => { setSearch(''); loadClients(); }} disabled={loading}>Clear</Button>
          <Button variant="secondary" size="sm" onClick={loadClients} disabled={loading}>Refresh</Button>
        </div>

        <CreateClientModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => loadClients()}
        />

        <EditClientModal
          isOpen={editOpen}
          client={activeClient}
          onClose={() => setEditOpen(false)}
          onSaved={() => loadClients()}
        />

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-gray-600">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="text-sm text-gray-600">No clients found.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full table-auto divide-y divide-gray-200">
              <colgroup>
                <col style={{ width: 240 }} />
                <col style={{ width: 240 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 1 }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => toggleSort('name')} className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none">Name</th>
                  <th onClick={() => toggleSort('representative')} className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none">Representative</th>
                  <th onClick={() => toggleSort('email')} className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none">Email</th>
                  <th onClick={() => toggleSort('phone')} className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none">Phone</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedClients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { if (c.slug) navigate(`/client/${c.slug}`); }}>
                    <td className="px-4 py-2 text-sm text-gray-900 underline decoration-transparent hover:decoration-inherit">{c.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{getRepName(c) || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{getEmail(c) || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{formatPhoneNumber(getRepPhone(c)) || '—'}</td>
                    <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap">
                      <Button size="xs" variant="primary" className="rounded" onClick={(e) => { e.stopPropagation(); setActiveClient(c); setEditOpen(true); }}>Edit</Button>
                      <Button
                        size="xs"
                        variant="danger"
                        className="ml-2 rounded"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Delete this client and all associated data?')) return;
                          const res = await ClientsService.deleteClient(c.id);
                          if (!res.success) {
                            alert(res.error?.message || 'Delete failed');
                            return;
                          }
                          loadClients();
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Access manager merged into Edit modal; removed standalone manage modal */}
      </div>
    </>
  );
}

export default ClientsDashboard;


