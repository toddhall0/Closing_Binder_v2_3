import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PublicLanding from './PublicLanding';

const HomeRoute = () => {
  const { user, loading } = useAuth();
  const [redirect, setRedirect] = React.useState(null);

  React.useEffect(() => {
    const go = async () => {
      if (loading) return;
      if (!user) {
        setRedirect(null);
        return;
      }
      try {
        // Copy auth display name into client_users on login (non-blocking)
        try {
          const base = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (base) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const resp = await fetch(`${base}/functions/v1/accept-client-invite`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || ''
                },
                body: JSON.stringify({})
              });
              // Log non-200 to console to aid debugging
              if (!resp.ok) {
                try { console.warn('accept-client-invite failed', await resp.text()); } catch {}
              }
            }
          }
        } catch {}

        // Firm takes precedence: owner of any client, firm_users membership, or metadata flag
        const [{ data: anyOwnedClient }, { data: firmMember }] = await Promise.all([
          supabase.from('clients').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
          supabase.from('firm_users').select('user_id').eq('user_id', user.id).limit(1).maybeSingle()
        ]);
        const isFirmByMetadata = String(user?.user_metadata?.role || '').toLowerCase() === 'firm' 
          || user?.user_metadata?.is_firm_owner === true;
        if (anyOwnedClient || firmMember || isFirmByMetadata) {
          setRedirect('/dashboard');
          return;
        }

        // Otherwise client access
        const email = (user.email || '').toLowerCase();
        const [{ data: clientMatch }, { data: invited }] = await Promise.all([
          supabase.from('clients').select('id').eq('email', email).limit(1).maybeSingle(),
          supabase.from('client_users').select('id').eq('email', email).limit(1).maybeSingle()
        ]);
        setRedirect(clientMatch || invited ? '/client' : '/dashboard');
      } catch {
        setRedirect('/dashboard');
      }
    };
    go();
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 text-sm">Loading...</div>
      </div>
    );
  }

  if (user && redirect) {
    return <Navigate to={redirect} replace />;
  }

  return <PublicLanding />;
};

export default HomeRoute;


