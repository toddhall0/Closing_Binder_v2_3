// Fixed ClientCoverPage with 25% larger logos
// File: src/components/client/ClientCoverPage.js

import React, { useState } from 'react';
import ClientBinderDownloader from './ClientBinderDownloader';

const ClientCoverPage = ({ binder, logos, onNavigateToTOC, documents = [] }) => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPropertyDetails = () => {
    if (!binder?.property_address) return 'Property Address Not Provided';
    
    const details = [];
    if (binder.property_address) details.push(binder.property_address);
    if (binder.city) details.push(binder.city);
    if (binder.state) details.push(binder.state);
    if (binder.zip_code) details.push(binder.zip_code);
    
    return details.length > 0 ? details.join(', ') : 'Property Address Not Provided';
  };

  const getTransactionDetails = () => ({
    buyer: binder?.buyer || 'Not specified',
    seller: binder?.seller || 'Not specified', 
    attorney: binder?.attorney || 'Not specified',
    lender: binder?.lender || 'Not specified',
    escrowAgent: binder?.escrow_agent || 'Not specified',
    titleCompany: binder?.title_company || 'Not specified',
    realEstateAgent: binder?.real_estate_agent || 'Not specified'
  });

  const transactionDetails = getTransactionDetails();

  // Enhanced property photo URL detection with multiple fallbacks
  const getPropertyPhotoUrl = () => {
    const photoSources = [
      binder?.cover_photo_url,
      binder?.property_photo_url,
      binder?.projects?.cover_photo_url,
      binder?.projects?.property_photo_url,
      binder?.cover_page_data?.propertyPhotoUrl,
      binder?.cover_page_data?.cover_photo_url,
      binder?.property_data?.photo_url,
      binder?.property_data?.image_url
    ];

    for (const photoUrl of photoSources) {
      if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim().length > 0) {
        console.log('Found property photo URL:', photoUrl);
        return photoUrl.trim();
      }
    }

    console.log('No property photo URL found in binder data:', binder);
    return null;
  };

  const propertyPhotoUrl = getPropertyPhotoUrl();

  // Enhanced logo processing with multiple fallbacks
  const getDisplayLogos = () => {
    if (!logos || !Array.isArray(logos)) return [];
    
    return logos
      .filter(logo => {
        const logoUrl = logo?.url || logo?.logo_url || logo?.image_url;
        return logoUrl && typeof logoUrl === 'string' && logoUrl.trim().length > 0;
      })
      .slice(0, 3); // Maximum 3 logos
  };

  const displayLogos = getDisplayLogos();

  const formatPurchasePrice = (price) => {
    if (!price) return null;
    
    const numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
    
    if (isNaN(numPrice) || numPrice === 0) return null;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numPrice);
  };

  const formatClosingDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const purchasePrice = formatPurchasePrice(binder?.purchase_price);
  const closingDate = formatClosingDate(binder?.closing_date);

  return (
    <div className="max-w-4xl mx-auto bg-white cover-page-container" style={{ minHeight: '11in' }}>
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center p-6">
        <button
          onClick={() => setShowDownloadModal(true)}
          className="text-sm text-gray-600 hover:text-black transition-colors duration-200 font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>

        <button
          onClick={onNavigateToTOC}
          className="text-sm text-gray-600 hover:text-black transition-colors duration-200 font-medium flex items-center"
        >
          Table of Contents
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Main Cover Page Content */}
      <div className="p-8">
        {/* Header Section */}
        <div className="text-center mb-8 pb-6 border-b-2 border-black">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {binder?.title || 'CLOSING BINDER'}
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            {formatPropertyDetails()}
          </p>
          {binder?.property_description && (
            <div className="mt-4 max-w-2xl mx-auto">
              <p className="text-sm text-gray-700 leading-relaxed">
                {binder.property_description}
              </p>
            </div>
          )}
        </div>

        {/* Property Photo Section */}
        <div className="mb-8 text-center">
          {propertyPhotoUrl ? (
            <div className="mx-auto max-w-2xl">
              <img 
                src={propertyPhotoUrl} 
                alt="Property" 
                className="w-full h-80 object-cover rounded-lg shadow-lg border border-gray-200"
                onError={(e) => {
                  console.error('Failed to load property image:', propertyPhotoUrl);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                onLoad={() => {
                  console.log('Property image loaded successfully:', propertyPhotoUrl);
                }}
              />
              <div 
                className="hidden w-full h-80 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center"
              >
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">Property Photo</p>
                  <p className="text-xs text-gray-400 mt-1">Image could not be loaded</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl w-full h-80 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">Property Photo</p>
                <p className="text-xs text-gray-400 mt-1">No image available</p>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Highlights */}
        {(purchasePrice || closingDate) && (
          <div className="mb-8 text-center">
            <div className="flex justify-center space-x-8">
              {purchasePrice && (
                <div className="bg-gray-50 px-6 py-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Purchase Price</p>
                  <p className="text-2xl font-bold text-gray-900">{purchasePrice}</p>
                </div>
              )}
              {closingDate && (
                <div className="bg-gray-50 px-6 py-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Closing Date</p>
                  <p className="text-lg font-semibold text-gray-900">{closingDate}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Details Grid */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Transaction Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(transactionDetails).map(([key, value]) => (
                value !== 'Not specified' && (
                  <div key={key} className="flex flex-col">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-sm text-gray-900 mt-1">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Company Logos with black lines above and below */}
        {displayLogos.length > 0 && (
          <div className="mb-8">
            <div className="border-t-2 border-black mb-4"></div>
            <div className="flex justify-center items-center space-x-8">
              {displayLogos.map((logo, index) => {
                const logoUrl = logo?.url || logo?.logo_url || logo?.image_url;
                return (
                  <img
                    key={index}
                    src={logoUrl}
                    alt={`Company logo ${index + 1}`}
                    className="w-auto object-contain"
                    style={{ height: '120px' }}
                    onError={(e) => {
                      console.warn(`Failed to load logo ${index + 1}:`, logoUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                );
              })}
            </div>
            <div className="border-b-2 border-black mt-4"></div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
          <p>
            Generated on {formatDate()}
          </p>
          <p>
            This closing binder contains all relevant documents for your transaction.
            <br />
            Please retain for your records.
          </p>
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Download Complete Binder
                </h3>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <ClientBinderDownloader
                binder={binder}
                documents={documents}
                logos={logos}
                onProgress={(progress, step) => {
                  console.log(`Download progress: ${progress}% - ${step}`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.75in;
            size: letter;
          }
          
          .cover-page-container {
            max-width: none !important;
          }
          
          .cover-page-container .shadow-lg {
            box-shadow: none !important;
            border: 2px solid #e5e5e5 !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientCoverPage;