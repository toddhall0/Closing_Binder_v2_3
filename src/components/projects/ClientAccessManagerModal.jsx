import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';

const ClientAccessManagerModal = ({ isOpen, client, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const loadMembers = async () => {
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await ClientsService.listClientUsers(client.id);
      if (error) throw error;
      setMembers(data);
    } catch (e) {
      setError(e.message || 'Failed to load access list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setInviteEmail('');
      setInviteRole('viewer');
      loadMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client?.id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await ClientsService.inviteClientUser(client.id, inviteEmail, inviteRole);
      if (error) throw error;
      setInviteEmail('');
      setInviteRole('viewer');
      await loadMembers();
    } catch (e) {
      setError(e.message || 'Failed to add invite');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this user from access?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ClientsService.removeClientUser(id);
      if (!res.success) throw res.error || new Error('Remove failed');
      await loadMembers();
    } catch (e) {
      setError(e.message || 'Failed to remove user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Access — ${client?.name || ''}`} size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{error}</div>
        )}

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invite Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="person@example.com"
              className="block w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-6">
            <Button type="submit" loading={loading}>Invite</Button>
          </div>
        </form>

        <div className="border border-gray-200 rounded">
          <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">Authorized Users</div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-3 py-3 text-sm text-gray-600">Loading…</div>
            ) : members.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-600">No users invited yet.</div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">{m.email}</div>
                    <div className="text-xs text-gray-500">Role: {m.role}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500">
          After adding emails here, those users can sign up/login with that address and access the client dashboard at {client?.slug ? `${window.location.origin}/client/${client.slug}` : 'this client URL'}.
        </div>
      </div>
    </Modal>
  );
};

export default ClientAccessManagerModal;


