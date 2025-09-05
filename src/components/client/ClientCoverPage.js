// src/components/client/ClientCoverPage.js
import React from 'react';

const ClientCoverPage = ({ binder, logos, onNavigateToTOC }) => {
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPropertyAddress = () => {
    if (!binder) return '';
    
    let address = binder.property_address || '';
    if (binder.city) address += `, ${binder.city}`;
    if (binder.state) address += `, ${binder.state}`;
    if (binder.zip_code) address += ` ${binder.zip_code}`;
    
    return address;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        
        {/* Company Logos */}
        {logos && logos.length > 0 && (
          <div className="flex justify-center items-center space-x-12 mb-12">
            {logos.slice(0, 3).map((logo, index) => (
              <div key={logo.id || index} className="flex-shrink-0">
                <img
                  src={logo.logo_url}
                  alt={logo.logo_name || `Company Logo ${index + 1}`}
                  className="max-h-16 max-w-32 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Main Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-black mb-6 tracking-wide">
            CLOSING BINDER
          </h1>
          
          {/* Property Title */}
          {binder?.title && (
            <h2 className="text-2xl font-medium text-gray-700 mb-4">
              {binder.title}
            </h2>
          )}
          
          {/* Property Address */}
          {binder?.property_address && (
            <p className="text-lg text-gray-600 mb-6">
              {formatPropertyAddress()}
            </p>
          )}
          
          {/* Property Description */}
          {binder?.property_description && (
            <div className="max-w-2xl mx-auto">
              <p className="text-base text-gray-500 leading-relaxed whitespace-pre-line">
                {binder.property_description}
              </p>
            </div>
          )}
        </div>

        {/* Cover Photo */}
        {binder?.cover_photo_url && (
          <div className="mb-8">
            <img
              src={binder.cover_photo_url}
              alt="Property"
              className="max-w-lg max-h-64 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Navigation Button */}
        <button
          onClick={onNavigateToTOC}
          className="bg-black text-white px-8 py-3 rounded hover:bg-gray-800 transition-colors text-lg font-medium"
        >
          View Documents
        </button>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black bg-gray-50 py-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Prepared on {formatDate()}
          </p>
          {binder?.access_code && (
            <p className="text-xs text-gray-500 mt-2">
              Access Code: <span className="font-mono font-semibold">{binder.access_code}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientCoverPage;