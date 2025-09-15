import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AuthModal from './AuthModal';
import { supabase } from '../../lib/supabase';

// Usage: <ProtectedRoute allowedRoles={["firm"]}> ... </ProtectedRoute>
// Roles are derived as:
// - client: if a row exists in `clients` for user.email
// - firm: otherwise
const ProtectedRoute = ({ children, fallback, allowedRoles }) => {
  const { user, loading } = useAuth();
  const [role, setRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const determineRole = async () => {
      if (!user) {
        setRole(null);
        setCheckingRole(false);
        return;
      }
      try {
        const email = (user.email || '').toLowerCase();
        // Check direct client record
        const { data: clientMatch } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email)
          .limit(1)
          .maybeSingle();

        if (clientMatch) {
          setRole('client');
        } else {
          // Also treat entries in client_users as client role
          const { data: invited } = await supabase
            .from('client_users')
            .select('id')
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          setRole(invited ? 'client' : 'firm');
        }
      } catch (e) {
        // Default to firm if lookup fails
        setRole('firm');
      } finally {
        setCheckingRole(false);
      }
    };
    determineRole();
  }, [user]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return fallback;
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <AuthModal isOpen={true} />
      </div>
    );
  }

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900">Access denied</h2>
            <p className="mt-2 text-gray-600 text-sm">You don’t have permission to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;