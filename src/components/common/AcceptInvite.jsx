import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AcceptInvite = () => {
  const location = useLocation();
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [redirect, setRedirect] = React.useState(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const type = params.get('type');
        const token = params.get('token');
        if (!type || !token) { setError('Missing invite parameters'); return; }

        const paramsEmail = params.get('email') || '';
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Redirect new users to signup prefilled with invite email
          const base = '/signup';
          const redirectBack = encodeURIComponent(location.pathname + location.search);
          const query = `?email=${encodeURIComponent(paramsEmail)}&redirect=${redirectBack}`;
          setRedirect(base + query);
          return;
        }

        if (type === 'firm') {
          const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/accept-firm-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify({ token })
          });
          const json = await resp.json();
          if (!resp.ok) throw new Error(json?.error || 'Failed to accept invite');
          setDone(true);
          setRedirect('/dashboard');
        } else {
          setError('Unsupported invite type');
        }
      } catch (e) {
        setError(String(e?.message || e));
      }
    };
    run();
  }, [location.search, location.pathname]);

  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-700">Invite Error</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </>
        ) : done ? (
          <>
            <h1 className="text-xl font-semibold text-black">Invitation Accepted</h1>
            <p className="mt-2 text-sm text-gray-700">You're now a firm admin. Redirecting…</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-black">Accepting Invitation…</h1>
            <p className="mt-2 text-sm text-gray-600">Please wait.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;


