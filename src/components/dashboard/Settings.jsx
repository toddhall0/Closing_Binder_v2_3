import React from 'react';
import FirmLogoManager from '../common/FirmLogoManager';
import { supabase } from '../../lib/supabase';

const Settings = () => {
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [inviteError, setInviteError] = React.useState('');
  const [inviteSuccess, setInviteSuccess] = React.useState('');
  const [isOwner, setIsOwner] = React.useState(false);
  const [admins, setAdmins] = React.useState([]);
  const [invites, setInvites] = React.useState([]);
  const [loadingAdmins, setLoadingAdmins] = React.useState(false);

  const sendFirmInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail) { setInviteError('Email is required'); return; }
    setSending(true);
    try {
      const appOrigin = window.location.origin;
      const { data: userData } = await supabase.auth.getUser();
      const inviterName = userData?.user?.email || '';
      const { data, error } = await supabase.functions.invoke('send-firm-invite', {
        body: { toEmail: inviteEmail, appOrigin, inviterName }
      });
      if (error || data?.error) {
        const message = (data && data.error) || (error && error.message) || 'Failed to send invite';
        throw new Error(String(message));
      }
      setInviteSuccess(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      await loadInvites();
    } catch (err) {
      setInviteError(String(err?.message || err));
    } finally {
      setSending(false);
    }
  };

  const loadOwnerAndAdmins = React.useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsOwner(false); setAdmins([]); return; }
      // Is owner if they own any client
      const { data: owned } = await supabase
        .from('clients')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();
      const owner = !!owned;
      setIsOwner(owner);
      if (!owner) {
        // If not owner, still show list where they are admin for current owner(s)
        setAdmins([]);
        return;
      }
      // List firm admins for this owner
      const { data: members } = await supabase
        .from('firm_users')
        .select('user_id, role')
        .eq('firm_owner_id', user.id);
      const list = (members || []).map(m => ({ user_id: m.user_id, role: m.role, email: '' }));
      setAdmins(list);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  const loadInvites = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInvites([]); return; }
      const { data } = await supabase
        .from('firm_invites')
        .select('id, email, inserted_at, expires_at, accepted_at')
        .eq('firm_owner_id', user.id)
        .order('inserted_at', { ascending: false });
      setInvites(data || []);
    } catch {
      setInvites([]);
    }
  }, []);

  React.useEffect(() => {
    loadOwnerAndAdmins();
    loadInvites();
  }, [loadOwnerAndAdmins, loadInvites]);

  const removeAdmin = async (userId) => {
    if (!window.confirm('Remove this admin from your firm?')) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('firm_users')
        .delete()
        .eq('firm_owner_id', user.id)
        .eq('user_id', userId);
      await loadOwnerAndAdmins();
    } catch (e) {
      alert(e.message || 'Failed to remove admin');
    }
  };

  const cancelInvite = async (inviteId) => {
    try {
      await supabase.from('firm_invites').delete().eq('id', inviteId);
      await loadInvites();
    } catch (e) {
      alert(e.message || 'Failed to cancel invite');
    }
  };
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-medium text-gray-900">Firm Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your firm preferences and branding.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Firm Branding</h2>
              <p className="mt-1 text-sm text-gray-600">Upload and manage your firm logo for cover pages and client portals.</p>
              <div className="mt-4">
                <FirmLogoManager />
              </div>
            </section>

            {/* Placeholder for future settings */}
            <section className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
              <p className="mt-1 text-sm text-gray-600">Additional firm preferences coming soon.</p>
            </section>

            <section className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Invite Firm Admin</h2>
              <p className="mt-1 text-sm text-gray-600">Send an email invite to add a colleague as a firm admin.</p>
              {!isOwner ? (
                <div className="mt-4 text-sm text-gray-700">
                  You must be a firm owner to send admin invites. Create a client (you will be set as owner), then return here to invite admins.
                </div>
              ) : (
                <>
                  <form onSubmit={sendFirmInvite} className="mt-4 flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e)=>setInviteEmail(e.target.value)}
                      placeholder="admin@firm.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                      disabled={sending}
                    >
                      {sending ? 'Sending…' : 'Send Invite'}
                    </button>
                  </form>
                  {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
                  {inviteSuccess && <p className="mt-2 text-sm text-green-700">{inviteSuccess}</p>}
                </>
              )}
            </section>

            {isOwner && (
              <section className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900">Firm Admins</h2>
                <p className="mt-1 text-sm text-gray-600">Manage who has admin access to your firm.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {loadingAdmins ? (
                        <tr><td className="px-4 py-3 text-sm text-gray-600" colSpan={3}>Loading…</td></tr>
                      ) : admins.length === 0 ? (
                        <tr><td className="px-4 py-3 text-sm text-gray-600" colSpan={3}>No admins yet. Invite someone above.</td></tr>
                      ) : admins.map(a => (
                        <tr key={a.user_id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{a.email || a.user_id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{a.role}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            <button onClick={() => removeAdmin(a.user_id)} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {isOwner && (
              <section className="border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900">Pending Invites</h2>
                <p className="mt-1 text-sm text-gray-600">Invitations not yet accepted.</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Sent</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Expires</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {invites.filter(i => !i.accepted_at).length === 0 ? (
                        <tr><td className="px-4 py-3 text-sm text-gray-600" colSpan={4}>No pending invites.</td></tr>
                      ) : invites.filter(i => !i.accepted_at).map(i => (
                        <tr key={i.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{i.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{new Date(i.inserted_at).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{i.expires_at ? new Date(i.expires_at).toLocaleString() : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            <button onClick={() => cancelInvite(i.id)} className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Tips</h3>
              <ul className="mt-3 list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Use a high-resolution PNG or SVG logo with transparent background.</li>
                <li>Your logo will appear on cover pages and client dashboards.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;


