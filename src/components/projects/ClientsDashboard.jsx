import React, { useEffect, useState } from 'react';
import ClientsService from '../../services/clientsService';
import ClientAccessManagerModal from './ClientAccessManagerModal';
import { Button } from './Button';

const ClientsDashboard = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [newClient, setNewClient] = useState({ name: '', email: '' });
  const [creating, setCreating] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [activeClient, setActiveClient] = useState(null);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) return;
    setCreating(true);
    try {
      const { data, error } = await ClientsService.createClient(newClient);
      if (error) throw error;
      setNewClient({ name: '', email: '' });
      setSearch('');
      await loadClients();
    } catch (e) {
      alert(e.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Clients</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
          />
        </div>
        <form onSubmit={handleCreate} className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300"
              placeholder="Client name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300"
              placeholder="Client email"
              required
            />
          </div>
          <div className="self-end">
            <Button type="submit" loading={creating}>Add Client</Button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Loading clients…</div>
      ) : clients.length === 0 ? (
        <div className="text-sm text-gray-600">No clients found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const url = `${window.location.origin}/client/${c.slug}`;
            return (
              <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-600">{c.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>Open</Button>
                    <button
                      onClick={() => { setActiveClient(c); setAccessModalOpen(true); }}
                      className="px-2 py-1 text-xs text-blue-700 border border-blue-200 rounded hover:bg-blue-50"
                    >
                      Manage Access
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this client and all associated data?')) return;
                        const res = await ClientsService.deleteClient(c.id);
                        if (!res.success) {
                          alert(res.error?.message || 'Delete failed');
                          return;
                        }
                        loadClients();
                      }}
                      className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Client Dashboard URL</label>
                  <div className="flex items-center space-x-2">
                    <input value={url} readOnly className="flex-1 px-2 py-1 border border-gray-300 text-xs" />
                    <button
                      onClick={() => navigator.clipboard.writeText(url)}
                      className="px-2 py-1 border border-gray-300 text-xs rounded"
                    >Copy</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClientAccessManagerModal
        isOpen={accessModalOpen}
        client={activeClient}
        onClose={() => setAccessModalOpen(false)}
      />
    </div>
  );
};

export default ClientsDashboard;


