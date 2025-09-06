// src/components/client/ClientCoverPage.js - Updated with PDF download functionality
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

  // Check all possible photo field combinations
  const photoUrl = binder?.cover_photo_url || 
                   binder?.property_photo_url || 
                   binder?.projects?.cover_photo_url || 
                   binder?.projects?.property_photo_url;

  return (
    <div className="max-w-4xl mx-auto bg-white cover-page-container" style={{ minHeight: '11in' }}>
      {/* Top Navigation Bar with TOC Link and Download Button */}
      <div className="flex justify-between items-center p-6">
        {/* Download PDF Button */}
        <button
          onClick={() => setShowDownloadModal(true)}
          className="text-sm text-gray-600 hover:text-black transition-colors duration-200 font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>

        {/* Table of Contents Link */}
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

      {/* Header Section - NO LOGOS HERE NOW */}
      <div className="text-center border-b-2 border-black pb-6 mb-10">
        {/* Main Title */}
        <h1 className="text-4xl font-bold text-black mb-3">
          {binder?.title || 'CLOSING BINDER'}
        </h1>
        
        {/* Property Address */}
        <div className="text-xl text-gray-700 mb-4">
          {formatPropertyDetails()}
        </div>

        {/* Property Description - Preserve line breaks */}
        {binder?.property_description && (
          <div className="text-base text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
            {binder.property_description}
          </div>
        )}

        {/* Generation Date */}
        <div className="text-sm text-gray-600">
          Prepared on {formatDate()}
        </div>
      </div>

      {/* Property Photo Section */}
      {photoUrl && (
        <div className="mb-10 text-center">
          <div className="inline-block border-2 border-gray-200 p-2 bg-white shadow-lg">
            <img
              src={photoUrl}
              alt="Property"
              className="max-w-full h-auto object-contain"
              style={{ maxWidth: '600px', maxHeight: '400px' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none' }} className="text-gray-500 p-8">
              Property photo not available
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Property Photo</p>
        </div>
      )}

      {/* Transaction Details Section */}
      {(binder?.purchase_price || binder?.loan_amount || binder?.closing_date) && (
        <div className="mb-10 text-center">
          
          {/* Purchase Price */}
          {binder?.purchase_price && (
            <div className="mb-4">
              <div className="text-2xl font-bold text-black">
                Purchase Price: ${Number(binder.purchase_price).toLocaleString()}
              </div>
            </div>
          )}
          
          {/* Closing Date */}
          {binder?.closing_date && (
            <div className="mb-4">
              <div className="text-2xl font-bold text-black">
                Closing Date: {new Date(binder.closing_date).toLocaleDateString()}
              </div>
            </div>
          )}
          
          {/* Loan Amount */}
          {binder?.loan_amount && (
            <div className="inline-block text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-black">
                Loan Amount: ${Number(binder.loan_amount).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Participants Section */}
      {(Object.values(transactionDetails).some(detail => detail !== 'Not specified')) && (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="border-l-4 border-black pl-4">
              <h3 className="text-lg font-semibold text-black mb-4">Transaction Participants</h3>
              <div className="space-y-3">
                {transactionDetails.buyer !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Buyer:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.buyer}</span>
                  </div>
                )}
                {transactionDetails.seller !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Seller:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.seller}</span>
                  </div>
                )}
                {transactionDetails.attorney !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Attorney:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.attorney}</span>
                  </div>
                )}
                {transactionDetails.realEstateAgent !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Real Estate Agent:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.realEstateAgent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-l-4 border-black pl-4">
              <h3 className="text-lg font-semibold text-black mb-4">Service Providers</h3>
              <div className="space-y-3">
                {transactionDetails.lender !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Lender:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.lender}</span>
                  </div>
                )}
                {transactionDetails.titleCompany !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Title Company:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.titleCompany}</span>
                  </div>
                )}
                {transactionDetails.escrowAgent !== 'Not specified' && (
                  <div>
                    <span className="font-medium text-gray-900">Escrow Agent:</span>
                    <span className="ml-2 text-gray-700">{transactionDetails.escrowAgent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Logos Section - NOW AT BOTTOM, MUCH BIGGER */}
      <div className="mb-10">
        <div className="flex justify-center items-center space-x-12">
          {logos && logos.length > 0 ? (
            logos.slice(0, 3).map((logo, index) => (
              <div key={logo.id || index} className="text-center">
                <img
                  src={logo.logo_url}
                  alt={logo.logo_name || `Company Logo ${index + 1}`}
                  className="max-w-full object-contain mx-auto"
                  style={{ 
                    maxWidth: '260px', 
                    maxHeight: '260px', 
                    minWidth: '190px', 
                    minHeight: '150px',
                    width: 'auto',
                    height: 'auto'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm">
              <p>No company logos available</p>
            </div>
          )}
        </div>
      </div>

      {/* Law Firm Credit Section */}
      <div className="text-center mb-8 py-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium text-gray-800">
          This Closing Binder prepared by Camelback Law Group, LLC
        </p>
        <p className="text-sm text-gray-600 mt-1">
          For more information, contact us at{' '}
          <a 
            href="mailto:info@clglawaz.com" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            info@clglawaz.com
          </a>
        </p>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-6 text-center">
        <p className="text-sm text-gray-600">
          This closing binder contains all documents and materials related to the above transaction.
          <br />
          Please retain for your records.
        </p>
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