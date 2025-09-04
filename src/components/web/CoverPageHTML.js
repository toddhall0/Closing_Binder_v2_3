// ===============================
// FILE: src/components/web/CoverPageHTML.js
// HTML Cover Page for Web Binder - TIGHTER SPACING + LINE BREAKS
// ===============================

import React, { useState, useEffect } from 'react';

const CoverPageHTML = ({ project }) => {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load logos when component mounts
  useEffect(() => {
    loadLogos();
  }, [project?.id]);

  const loadLogos = async () => {
    console.log('Loading logos for project ID:', project?.id);
    
    if (!project?.id) {
      console.log('No project ID, skipping logo load');
      setLoading(false);
      return;
    }
    
    try {
      const { supabase } = await import('../../lib/supabase');
      
      const { data, error } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position');

      if (error) {
        console.error('Error loading logos:', error);
        return;
      }

      console.log('Loaded logos for cover page:', data);
      setLogos(data || []);
    } catch (error) {
      console.error('Error loading logos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current date for generation timestamp
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format property details
  const formatPropertyDetails = () => {
    const details = [];
    
    if (project?.property_address) details.push(project.property_address);
    if (project?.city) details.push(project.city);
    if (project?.state) details.push(project.state);
    if (project?.zip_code) details.push(project.zip_code);
    
    return details.length > 0 ? details.join(', ') : 'Property Address Not Provided';
  };

  // Transaction participants - FIXED TO USE CORRECT FIELD NAMES
  const getTransactionDetails = () => ({
    buyer: project?.buyer || 'Not specified',
    seller: project?.seller || 'Not specified', 
    attorney: project?.attorney || 'Not specified',
    lender: project?.lender || 'Not specified',
    escrowAgent: project?.escrow_agent || 'Not specified',
    titleCompany: project?.title_company || 'Not specified',
    realEstateAgent: project?.real_estate_agent || 'Not specified'
  });

  const transactionDetails = getTransactionDetails();

  return (
    <div className="max-w-4xl mx-auto bg-white cover-page-container" style={{ minHeight: '11in' }}>
      {/* Header Section - TIGHTER SPACING */}
      <div className="text-center border-b-2 border-black pb-6 mb-10">
        {/* Main Title */}
        <h1 className="text-4xl font-bold text-black mb-3">
          {project?.title || 'CLOSING BINDER'}
        </h1>
        
        {/* Property Address */}
        <div className="text-xl text-gray-700 mb-4">
          {formatPropertyDetails()}
        </div>

        {/* Property Description - PRESERVE LINE BREAKS */}
        {project?.property_description && (
          <div className="text-base text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
            {project.property_description}
          </div>
        )}

        {/* Generation Date */}
        <div className="text-sm text-gray-600">
          Prepared on {currentDate}
        </div>
      </div>

      {/* Property Photo Section - TIGHTER SPACING */}
      {(project?.cover_photo_url || project?.property_photo_url) && (
        <div className="mb-10 text-center">
          <div className="inline-block border-2 border-gray-200 p-2 bg-white shadow-lg">
            <img
              src={project.cover_photo_url || project.property_photo_url}
              alt="Property"
              className="max-w-full h-auto object-contain"
              style={{ maxWidth: '600px', maxHeight: '400px' }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Property Photo</p>
        </div>
      )}

      {/* Transaction Details Section - REMOVED HEADING, INLINE FORMAT */}
      {(project?.purchase_price || project?.loan_amount || project?.closing_date) && (
        <div className="mb-10 text-center">
          
          {/* Purchase Price - Same line, same font */}
          {project?.purchase_price && (
            <div className="mb-4">
              <div className="text-2xl font-bold text-black">
                Purchase Price: ${project.purchase_price.toLocaleString()}
              </div>
            </div>
          )}
          
          {/* Closing Date - Same line, same font */}
          {project?.closing_date && (
            <div className="mb-4">
              <div className="text-2xl font-bold text-black">
                Closing Date: {new Date(project.closing_date).toLocaleDateString()}
              </div>
            </div>
          )}
          
          {/* Loan Amount - Keep in box format if exists */}
          {project?.loan_amount && (
            <div className="inline-block text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-black">
                ${project.loan_amount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Loan Amount</div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Parties and Service Providers Section - TIGHTER SPACING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="space-y-6">
          <div className="border-l-4 border-black pl-4">
            <h3 className="text-lg font-semibold text-black mb-4">Transaction Parties</h3>
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

      {/* Company Logos Section - MUCH BIGGER LOGOS (250x250), TIGHTER SPACING */}
      <div className="mb-10">
        <div className="flex justify-center items-center space-x-16">
          {logos.length > 0 ? (
            logos.slice(0, 3).map((logo, index) => (
              <div key={logo.id} className="text-center">
                <img
                  src={logo.logo_url}
                  alt={logo.logo_name || `Company Logo ${index + 1}`}
                  className="w-64 h-64 object-contain mx-auto"
                  style={{ maxWidth: '250px', maxHeight: '250px', minWidth: '200px', minHeight: '150px' }}
                />
              </div>
            ))
          ) : (
            !loading && (
              <div className="text-center text-gray-500 text-sm">
                <p>No company logos uploaded</p>
                <p>Add logos in the Cover Page editor</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Footer - TIGHTER SPACING */}
      <div className="border-t-2 border-black pt-6 mt-10 text-center">
        <p className="text-sm text-gray-600">
          This closing binder contains all documents and materials related to the above transaction.
          <br />
          Please retain for your records.
        </p>
      </div>

      {/* Print Styles - FIXED VERSION */}
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

export default CoverPageHTML;