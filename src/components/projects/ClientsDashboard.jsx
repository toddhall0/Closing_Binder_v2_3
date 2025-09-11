import React, { useEffect, useState } from 'react';
import ClientsService from '../../services/clientsService';
import ClientAccessManagerModal from './ClientAccessManagerModal';
import { Button } from './Button';
import CreateClientModal from './CreateClientModal';
import EditClientModal from './EditClientModal';

const ClientsDashboard = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [newClient, setNewClient] = useState({ name: '', email: '', representative: '', company: '', address: '', repPhone: '', repEmail: '', web: '' });
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Row 1: Search (full width) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search Clients</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
        />
      </div>

      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>Add Client</Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const url = `${window.location.origin}/client/${c.slug}`;
            return (
              <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                <div className="text-base sm:text-lg font-semibold text-gray-900">{c.name}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="xs" variant="primary" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>Open</Button>
                  <Button size="xs" variant="secondary" onClick={() => { setActiveClient(c); setEditOpen(true); }}>Edit</Button>
                  <Button size="xs" variant="info" onClick={() => { setActiveClient(c); setAccessModalOpen(true); }}>Manage</Button>
                  <Button
                    size="xs"
                    variant="danger"
                    onClick={async () => {
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


