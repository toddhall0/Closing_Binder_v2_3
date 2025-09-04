import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-app-white border-b border-border shadow-professional">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-professional flex items-center justify-center">
                <span className="text-app-white font-bold text-sm">PB</span>
              </div>
              <h1 className="text-xl font-semibold text-text-primary">
                PDF Closing Binder Pro v.3.1
              </h1>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className="text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Dashboard
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="btn-primary text-sm px-4 py-2"
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;