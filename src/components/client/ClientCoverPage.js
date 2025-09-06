// src/components/client/ClientCoverPage.js
import React, { useState, useEffect } from 'react';

const ClientCoverPage = ({ binder, logos, onNavigateToTOC }) => {
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

  return (
    <div className="max-w-4xl mx-auto bg-white" style={{ minHeight: '11in' }}>
      {/* Header Section */}
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
      {(binder?.cover_photo_url || binder?.property_photo_url) && (
        <div className="mb-10 text-center">
          <div className="inline-block border-2 border-gray-200 p-2 bg-white shadow-lg">
            <img
              src={binder.cover_photo_url || binder.property_photo_url}
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

      {/* Company Logos Section - Large logos with proper spacing */}
      <div className="mb-10">
        <div className="flex justify-center items-center space-x-16">
          {logos && logos.length > 0 ? (
            logos.slice(0, 3).map((logo, index) => (
              <div key={logo.id} className="text-center">
                <img
                  src={logo.logo_url}
                  alt={logo.logo_name || `Company Logo ${index + 1}`}
                  className="w-64 h-64 object-contain mx-auto"
                  style={{ maxWidth: '250px', maxHeight: '250px', minWidth: '200px', minHeight: '150px' }}
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

      {/* Navigation Button */}
      <div className="text-center mb-10">
        <button
          onClick={onNavigateToTOC}
          className="bg-black text-white px-8 py-4 rounded hover:bg-gray-800 transition-colors text-lg font-medium"
        >
          View Table of Contents
        </button>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-6 mt-10 text-center">
        <p className="text-sm text-gray-600">
          This closing binder contains all documents and materials related to the above transaction.
          <br />
          Please retain for your records.
        </p>
      </div>
    </div>
  );
};

export default ClientCoverPage;