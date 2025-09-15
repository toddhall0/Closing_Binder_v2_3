import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AuthModal from '../auth/AuthModal';
import LoadingSpinner from './LoadingSpinner';

const Header = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [role, setRole] = useState(null);
  const [clientSlug, setClientSlug] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.email) {
        setRole(null);
        setClientSlug(null);
        return;
      }
      try {
        const email = user.email.toLowerCase();
        // Check direct client with slug
        const { data: client } = await supabase
          .from('clients')
          .select('slug')
          .eq('email', email)
          .limit(1)
          .maybeSingle();
        if (client?.slug) {
          setRole('client');
          setClientSlug(client.slug);
        } else {
          // If invited via client_users, attempt to fetch any client slug they belong to (first match)
          const { data: invited } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          if (invited?.client_id) {
            const { data: c } = await supabase
              .from('clients')
              .select('slug')
              .eq('id', invited.client_id)
              .limit(1)
              .maybeSingle();
            if (c?.slug) {
              setRole('client');
              setClientSlug(c.slug);
            } else {
              setRole('client');
              setClientSlug(null);
            }
          } else {
            setRole('firm');
            setClientSlug(null);
          }
        }
      } catch {
        setRole('firm');
        setClientSlug(null);
      }
    };
    fetchRole();
  }, [user?.email]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowUserMenu(false);
    navigate('/');
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    const names = displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-2xl sm:text-3xl font-semibold text-black hover:text-gray-800">
                Closing Binder Pro
              </Link>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-4">
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : user ? (
                <>
                  {/* Role-based nav */}
                  {role === 'firm' ? (
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-black font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg px-3 py-2"
                    >
                      Firm Dashboard
                    </Link>
                  ) : (
                    <Link
                      to={clientSlug ? `/client/${clientSlug}` : '/client'}
                      className="text-gray-700 hover:text-black font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg px-3 py-2"
                    >
                      Client Dashboard
                    </Link>
                  )}

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg p-2"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">
                        {getUserInitials()}
                      </div>
                      <span className="hidden sm:block text-sm font-medium">
                        {getUserDisplayName()}
                      </span>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        
                        <button
                          onClick={() => setShowUserMenu(false)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        >
                          Profile Settings
                        </button>
                        
                        <button
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 flex items-center"
                        >
                          {isSigningOut ? (
                            <>
                              <LoadingSpinner size="xs" className="mr-2" />
                              Signing Out...
                            </>
                          ) : (
                            'Sign Out'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-black font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Backdrop click handler for user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default Header;