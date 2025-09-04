import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AuthModal from './AuthModal';

const ProtectedRoute = ({ children, fallback }) => {
  const { user, loading } = useAuth();

  if (loading) {
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

  return children;
};

export default ProtectedRoute;