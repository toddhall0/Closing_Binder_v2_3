import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';

const AssignClientModal = ({ isOpen, onClose, onAssigned }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await ClientsService.getClients(search);
      if (error) throw error;
      setClients(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(null);
      setSearch('');
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAssign = (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId) || null;
    if (onAssigned) onAssigned(client);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign to Client" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Clients</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
          />
        </div>
        <div className="border border-gray-200 rounded max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-3 text-sm text-gray-600">Loading…</div>
          ) : clients.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-600">No clients found.</div>
          ) : (
            clients.map((c) => (
              <label key={c.id} className="px-3 py-2 flex items-center justify-between border-b last:border-b-0 border-gray-100 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="assignClient"
                    checked={selectedClientId === c.id}
                    onChange={() => setSelectedClientId(c.id)}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    {c.email && <div className="text-xs text-gray-600">{c.email}</div>}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{c.slug}</div>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedClientId}>Assign</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignClientModal;


