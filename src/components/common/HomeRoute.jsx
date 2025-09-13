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
        const email = (user.email || '').toLowerCase();
        const { data } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email)
          .limit(1)
          .maybeSingle();
        setRedirect(data ? '/client' : '/dashboard');
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


