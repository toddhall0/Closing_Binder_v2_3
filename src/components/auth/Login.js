import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const { user, loading } = useAuth();
  const [redirectTo, setRedirectTo] = React.useState(null);

  React.useEffect(() => {
    const determinePostLoginRoute = async () => {
      if (!loading && user) {
        try {
          const email = (user.email || '').toLowerCase();
          const { data } = await supabase
            .from('clients')
            .select('id')
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          setRedirectTo(data ? '/client' : '/dashboard');
        } catch {
          setRedirectTo('/dashboard');
        }
      }
    };
    determinePostLoginRoute();
  }, [user, loading]);

  // Redirect if already authenticated
  if (!loading && user && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleLoginSuccess = () => {
    // Navigation will happen automatically via the auth context
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-black">PDF Closing Binder</h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="font-medium text-black hover:underline focus:outline-none"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm onClose={handleLoginSuccess} />
        
        <div className="mt-6 text-center">
          <Link 
            to="/public" 
            className="text-sm text-gray-600 hover:text-black focus:outline-none"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;