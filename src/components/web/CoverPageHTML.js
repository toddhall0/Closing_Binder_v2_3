// ===============================
// FILE: src/components/web/CoverPageHTML.js
// HTML Cover Page for Web Binder - TIGHTER SPACING + LINE BREAKS
// ===============================

import React, { useState, useEffect, useCallback } from 'react';

const CoverPageHTML = ({ project }) => {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load logos when component mounts (effect placed after definition for lint)

  const loadLogos = useCallback(async () => {
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
  }, [project?.id]);

  useEffect(() => {
    loadLogos();
  }, [loadLogos]);

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

  // Transaction participants - Prefer data from Property Information (cover_page_data.contact_info)
  const getTransactionDetails = () => {
    let cover = project?.cover_page_data;
    if (typeof cover === 'string') {
      try { cover = JSON.parse(cover); } catch (_) { cover = null; }
    }
    const ci = cover?.contact_info || project?.contact_info || {};

    const readEntry = (entry) => {
      if (!entry || typeof entry !== 'object') return '';
      return (
        entry.company ||
        entry.name ||
        entry.representative ||
        entry.representative_name ||
        entry.contact ||
        entry.rep ||
        ''
      );
    };

    // Build values, falling back to legacy flat fields if nothing present
    const buyer = readEntry(ci.buyer) || (project?.buyer || '');
    const seller = readEntry(ci.seller) || (project?.seller || '');
    const lender = readEntry(ci.lender) || (project?.lender || '');
    const escrowAgent = readEntry(ci.escrow_agent) || (project?.escrow_agent || '');
    const titleCompany = readEntry(ci.title_company) || (project?.title_company || '');
    // Attorney: prefer buyer/seller attorney entries, join when both present
    const buyerAttorney = readEntry(ci.buyer_attorney);
    const sellerAttorney = readEntry(ci.seller_attorney);
    const attorney = [buyerAttorney, sellerAttorney].filter(Boolean).join(' | ') || (project?.attorney || '');
    // Real Estate Agent: prefer buyer/seller broker entries, join when both present
    const buyerBroker = readEntry(ci.buyer_broker);
    const sellerBroker = readEntry(ci.seller_broker);
    const realEstateAgent = [buyerBroker, sellerBroker].filter(Boolean).join(' | ') || (project?.real_estate_agent || '');

    return {
      buyer: buyer || 'Not specified',
      seller: seller || 'Not specified',
      attorney: attorney || 'Not specified',
      lender: lender || 'Not specified',
      escrowAgent: escrowAgent || 'Not specified',
      titleCompany: titleCompany || 'Not specified',
      realEstateAgent: realEstateAgent || 'Not specified'
    };
  };

  const transactionDetails = getTransactionDetails();

  // Helper: read full contact info object for a given role from Property Information
  const getContactInfo = (role) => {
    let cover = project?.cover_page_data;
    if (typeof cover === 'string') {
      try { cover = JSON.parse(cover); } catch (_) { cover = null; }
    }
    const ci = cover?.contact_info || project?.contact_info || {};
    const obj = (ci && typeof ci === 'object' ? ci[role] : null) || {};
    const normalize = (v) => (v == null ? '' : String(v));
    const addressParts = [];
    const line1 = normalize(obj.address_line1 || obj.address || '');
    const line2 = normalize(obj.address_line2 || '');
    const city = normalize(obj.city || '');
    const state = normalize(obj.state || '');
    const zip = normalize(obj.zip || '');
    if (line1) addressParts.push(line1);
    if (line2) addressParts.push(line2);
    const cityStateZip = [city, state, zip].filter(Boolean).join(', ').replace(/,\s*,/g, ',');
    if (cityStateZip) addressParts.push(cityStateZip);
    const composedAddress = addressParts.join('\n');
    return {
      company: normalize(obj.company || ''),
      representative: normalize(obj.representative || obj.representative_name || obj.contact || obj.name || obj.rep || ''),
      address: composedAddress,
      email: normalize(obj.email || ''),
      phone: normalize(obj.phone || ''),
      web: normalize(obj.web || ''),
      file_number: normalize(obj.file_number || '')
    };
  };

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

      {/* Transaction Details Row: Purchase Price (left), Closing Date (right) */}
      {(project?.purchase_price || project?.closing_date || project?.loan_amount) && (() => {
        const raw = project?.purchase_price;
        const priceNum = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
        const formattedPrice = Number.isFinite(priceNum) ? `$${priceNum.toLocaleString()}` : '';
        const formattedDate = project?.closing_date ? new Date(project.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        return (
          <div className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
              {formattedPrice && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Purchase Price</div>
                  <div className="text-2xl font-bold text-black">{formattedPrice}</div>
                </div>
              )}
              {formattedDate && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Closing Date</div>
                  <div className="text-2xl font-bold text-black">{formattedDate}</div>
                </div>
              )}
            </div>
            {(transactionDetails.buyer !== 'Not specified' || transactionDetails.seller !== 'Not specified') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center mt-4">
                {transactionDetails.buyer !== 'Not specified' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Buyer</div>
                    <div className="text-2xl font-bold text-black break-words">{transactionDetails.buyer}</div>
                  </div>
                )}
                {transactionDetails.seller !== 'Not specified' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Seller</div>
                    <div className="text-2xl font-bold text-black break-words">{transactionDetails.seller}</div>
                  </div>
                )}
              </div>
            )}
            {project?.loan_amount && (
              <div className="mt-6 text-center">
                <div className="inline-block text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-black">${typeof project.loan_amount === 'number' ? project.loan_amount.toLocaleString() : String(project.loan_amount)}</div>
                  <div className="text-sm text-gray-600">Loan Amount</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Transaction Parties and Service Providers removed per spec */}

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