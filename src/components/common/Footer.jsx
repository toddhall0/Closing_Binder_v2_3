import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-app-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="text-text-muted text-sm">
            © {currentYear} Closing Binder Pro. Professional document management.
          </div>
          <div className="text-text-muted text-sm">
            Version 1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;