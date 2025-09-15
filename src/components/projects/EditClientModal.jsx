import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';
import EmailService from '../../services/emailService';

const EditClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [web, setWeb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Access management state (migrated from Manage/Share modal)
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteNotice, setInviteNotice] = useState('');

  useEffect(() => {
    if (isOpen && client) {
      setName(client.name || '');
      setEmail(client.email || '');
      const d = client.details || {};
      setRepresentative(d.representative || '');
      setAddress(d.address || '');
      setRepPhone(d.repPhone || '');
      setRepEmail(d.repEmail || '');
      setWeb(d.web || '');
      setError(null);
      setLoading(false);
      // Reset access state and load members
      setInviteName('');
      setInviteEmail('');
      setInviteRole('viewer');
      setAccessError(null);
      loadMembers(client);
    }
  }, [isOpen, client]);

  const loadMembers = async (cl) => {
    const current = cl || client;
    if (!current?.id) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const { data, error } = await ClientsService.listClientUsers(current.id);
      if (error) throw error;
      setMembers(data || []);
    } catch (e) {
      setAccessError(e.message || 'Failed to load access list');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!client?.id || !inviteEmail) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const { data: inviteRow, error } = await ClientsService.inviteClientUser(client.id, inviteEmail, inviteRole);
      if (error) throw error;
      // Fire-and-forget email invite (best-effort)
      try {
        const inviterName = (client?.owner_name) || '';
        await EmailService.sendClientInvite({
          toEmail: inviteEmail,
          clientName: client?.name || '',
          clientSlug: client?.slug || null,
          inviterName,
        });
        setInviteNotice(`Invite sent to ${inviteEmail}`);
        setTimeout(() => setInviteNotice(''), 3000);
      } catch (emailErr) {
        // Show a non-blocking error if email delivery fails
        setAccessError('Invite created, but email delivery failed.');
      }
      setInviteName('');
      setInviteEmail('');
      setInviteRole('viewer');
      await loadMembers();
    } catch (e) {
      setAccessError(e.message || 'Failed to add invite');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this user from access?')) return;
    setAccessLoading(true);
    setAccessError(null);
    try {
      const res = await ClientsService.removeClientUser(id);
      if (!res.success) throw res.error || new Error('Remove failed');
      await loadMembers();
    } catch (e) {
      setAccessError(e.message || 'Failed to remove user');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    try {
      const details = { representative, address, repPhone, repEmail, web };
      const { data, error } = await ClientsService.updateClient(client.id, { name, email, details });
      if (error) throw error;
      if (onSaved) onSaved(data);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Client" size="lg">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {error && (
          <div className="sm:col-span-12 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{error}</div>
        )}

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" required />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Representative</label>
          <input type="text" value={representative} onChange={(e)=>setRepresentative(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={address} onChange={(e)=>setAddress(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Phone</label>
          <input type="text" value={repPhone} onChange={(e)=>setRepPhone(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Email</label>
          <input type="email" value={repEmail} onChange={(e)=>setRepEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
          <input type="text" value={web} onChange={(e)=>setWeb(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        {/* Client Access Management */}
        <div className="sm:col-span-12 mt-2">
          <div className="border border-gray-200 rounded">
            <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">Client Access</div>
            <div className="p-3 space-y-3">
              {accessError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{accessError}</div>
              )}
              <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Optional"
                    className="block w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div className="sm:col-span-3">
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
                <div className="sm:col-span-7">
                  <Button type="submit" loading={accessLoading} disabled={accessLoading}>Invite</Button>
                  {inviteNotice && (
                    <span className="ml-3 text-sm text-green-700">{inviteNotice}</span>
                  )}
                </div>
              </form>
              <div className="border border-gray-200 rounded">
                <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">Authorized Users</div>
                <div className="divide-y divide-gray-200">
                  {accessLoading ? (
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
                          type="button"
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
                After adding emails here, those users can sign up/login with that address and access the client dashboard.
              </div>
            </div>
          </div>
        </div>

        <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditClientModal;


