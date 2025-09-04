import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SignupForm from './SignupForm';

const Signup = () => {
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignupSuccess = () => {
    // Navigation will happen automatically via the auth context
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-black">PDF Closing Binder</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-black hover:underline focus:outline-none"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <SignupForm onClose={handleSignupSuccess} />
        
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

export default Signup;