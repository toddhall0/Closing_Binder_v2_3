import React from 'react';
import FirmLogoManager from '../common/FirmLogoManager';
import { supabase } from '../../lib/supabase';

const Settings = () => {
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [inviteError, setInviteError] = React.useState('');
  const [inviteSuccess, setInviteSuccess] = React.useState('');

  const sendFirmInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail) { setInviteError('Email is required'); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { setInviteError('You must be signed in'); return; }
      const appOrigin = window.location.origin;
      const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-firm-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ toEmail: inviteEmail, appOrigin })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to send invite');
      setInviteSuccess('Invitation sent.');
      setInviteEmail('');
    } catch (err) {
      setInviteError(String(err?.message || err));
    } finally {
      setSending(false);
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
            </section>
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


