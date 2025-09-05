// ===============================
// FILE: src/components/pdf/CoverPageEditor.js
// Updated Cover Page Editor with REAL logo and photo upload integration
// ===============================

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Download, Save } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CoverPagePDF from './CoverPagePDF';
import LogoManager from './LogoManager';
import PropertyPhotoManager from './PropertyPhotoManager';

const CoverPageEditor = ({ project, onProjectUpdate }) => {
  const [coverData, setCoverData] = useState({
    title: project?.title || '',
    propertyAddress: project?.property_address || '',
    propertyDescription: project?.property_description || '',
    closingDate: project?.closing_date || '',
    attorney: project?.attorney || '',
    lender: project?.lender || '',
    buyer: project?.buyer || '',
    seller: project?.seller || '',
    escrowAgent: project?.escrow_agent || '',
    purchasePrice: project?.purchase_price || '',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state for logos and photo
  const [logos, setLogos] = useState([]);
  const [propertyPhoto, setPropertyPhoto] = useState({
    property_photo_url: project?.property_photo_url || null,
    property_photo_name: project?.property_photo_name || null
  });

  // Format purchase price with proper currency formatting
  const formatPurchasePrice = (value) => {
    if (!value) return '';
    
    // Convert to string and remove all non-digit chars except decimal
    const numStr = value.toString().replace(/[^\d.]/g, '');
    
    if (!numStr || numStr === '0') return '$0.00';
    
    // Convert to number to handle decimals properly
    const num = parseFloat(numStr);
    if (isNaN(num)) return '';
    
    // Format with commas and 2 decimal places
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const loadCoverData = useCallback(async () => {
    if (!project?.id) return;
    
    try {
      setLoading(true);
      const { supabase } = await import('../../lib/supabase');
      
      const { data: projectData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (error) {
        console.error('Error loading project data:', error);
        return;
      }

      if (projectData) {
        const formattedPrice = formatPurchasePrice(projectData.purchase_price);
        
        setCoverData({
          title: projectData.title || '',
          propertyAddress: projectData.property_address || '',
          propertyDescription: projectData.property_description || '',
          closingDate: projectData.closing_date || '',
          attorney: projectData.attorney || '',
          lender: projectData.lender || '',
          buyer: projectData.buyer || '',
          seller: projectData.seller || '',
          escrowAgent: projectData.escrow_agent || '',
          purchasePrice: formattedPrice,
        });

        setPropertyPhoto({
          property_photo_url: projectData.property_photo_url || null,
          property_photo_name: projectData.property_photo_name || null
        });
      }
    } catch (error) {
      console.error('Error loading cover data:', error);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  const loadLogos = useCallback(async () => {
    if (!project?.id) return;
    
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

      const logosWithUrls = data.map(logo => ({
        ...logo,
        url: logo.logo_url
      }));

      setLogos(logosWithUrls);
    } catch (error) {
      console.error('Error loading logos:', error);
    }
  }, [project?.id]);

  // Load existing data on component mount
  useEffect(() => {
    loadCoverData();
    loadLogos();
  }, [loadCoverData, loadLogos]);

  const handlePurchasePriceChange = (e) => {
    const inputValue = e.target.value;
    const formattedValue = formatPurchasePrice(inputValue);
    setCoverData(prev => ({ ...prev, purchasePrice: formattedValue }));
  };

  // Format description with line breaks for display
  const formatDescriptionForDisplay = (text) => {
    if (!text) return 'Property Description';
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      
      // Remove formatting from purchase price before saving
      const rawPrice = coverData.purchasePrice.replace(/[$,]/g, '');
      const priceValue = rawPrice ? parseFloat(rawPrice) : null;
      
      const { error } = await supabase
        .from('projects')
        .update({
          title: coverData.title,
          property_address: coverData.propertyAddress,
          property_description: coverData.propertyDescription,
          closing_date: coverData.closingDate || null,
          attorney: coverData.attorney || null,
          lender: coverData.lender || null,
          buyer: coverData.buyer || null,
          seller: coverData.seller || null,
          escrow_agent: coverData.escrowAgent || null,
          purchase_price: priceValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (error) throw error;

      alert('Cover page data saved successfully!');
      
      // Call onProjectUpdate if provided to refresh parent component
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error) {
      console.error('Error saving cover data:', error);
      alert('Failed to save cover page data: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Generate filename for PDF download
  const getPDFFileName = () => {
    const projectName = coverData.title || 'Closing Binder';
    const address = coverData.propertyAddress || 'Cover Page';
    const cleanName = `${projectName} - ${address}`.replace(/[^a-zA-Z0-9 ]/g, '');
    return `${cleanName}.pdf`;
  };

  // Handle logo changes from LogoManager
  const handleLogosChange = (newLogos) => {
    setLogos(newLogos);
  };

  // Handle property photo changes from PropertyPhotoManager
  const handlePhotoChange = (newPhoto) => {
    setPropertyPhoto(newPhoto);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading cover page data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cover Page Editor</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          
          {/* Real PDF Download Button */}
          <PDFDownloadLink
            document={<CoverPagePDF coverData={coverData} logos={logos} propertyPhoto={propertyPhoto} />}
            fileName={getPDFFileName()}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            {({ loading }) => (
              <>
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Generating PDF...' : 'Download PDF'}
              </>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Binder Title
                </label>
                <input
                  type="text"
                  value={coverData.title}
                  onChange={(e) => setCoverData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter closing binder title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address
                </label>
                <input
                  type="text"
                  value={coverData.propertyAddress}
                  onChange={(e) => setCoverData(prev => ({ ...prev, propertyAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter property address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Description
                </label>
                <textarea
                  value={coverData.propertyDescription}
                  onChange={(e) => setCoverData(prev => ({ ...prev, propertyDescription: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter property description (use Enter key for line breaks)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Press Enter to create line breaks that will appear on the cover page
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Price
                </label>
                <input
                  type="text"
                  value={coverData.purchasePrice}
                  onChange={handlePurchasePriceChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="$0.00"
                />
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Details</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer
                  </label>
                  <input
                    type="text"
                    value={coverData.buyer}
                    onChange={(e) => setCoverData(prev => ({ ...prev, buyer: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Buyer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller
                  </label>
                  <input
                    type="text"
                    value={coverData.seller}
                    onChange={(e) => setCoverData(prev => ({ ...prev, seller: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Seller name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={coverData.closingDate}
                    onChange={(e) => setCoverData(prev => ({ ...prev, closingDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escrow Agent
                  </label>
                  <input
                    type="text"
                    value={coverData.escrowAgent}
                    onChange={(e) => setCoverData(prev => ({ ...prev, escrowAgent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Escrow agent name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attorney
                  </label>
                  <input
                    type="text"
                    value={coverData.attorney}
                    onChange={(e) => setCoverData(prev => ({ ...prev, attorney: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Attorney name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lender
                  </label>
                  <input
                    type="text"
                    value={coverData.lender}
                    onChange={(e) => setCoverData(prev => ({ ...prev, lender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
                    placeholder="Lender name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Real Property Photo Upload */}
          <PropertyPhotoManager
            projectId={project.id}
            photo={propertyPhoto}
            onPhotoChange={handlePhotoChange}
          />

          {/* Real Logo Manager */}
          <LogoManager
            projectId={project.id}
            logos={logos}
            onLogosChange={handleLogosChange}
          />
        </div>

        {/* Right Column: Live Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cover Page Preview</h3>
          
          {/* Professional Preview */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{aspectRatio: '8.5/11'}}>
            <div className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {coverData.title || 'Closing Binder'}
                </h1>
                {coverData.propertyAddress && (
                  <p className="text-sm text-gray-600">{coverData.propertyAddress}</p>
                )}
              </div>

              {/* Photo Area */}
              <div className="flex-1 mb-4">
                <div className="w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center" style={{minHeight: '200px', maxHeight: '200px'}}>
                  {propertyPhoto.property_photo_url ? (
                    <img 
                      src={propertyPhoto.property_photo_url} 
                      alt="Property" 
                      className="max-w-full max-h-full object-cover rounded"
                      style={{maxHeight: '180px', width: 'auto'}}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Property Photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {coverData.propertyDescription && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-900 mb-1">Property Description</div>
                  <div className="text-xs text-gray-600 leading-relaxed text-center">
                    {formatDescriptionForDisplay(coverData.propertyDescription)}
                  </div>
                </div>
              )}

              {/* Purchase Price */}
              {coverData.purchasePrice && (
                <div className="text-center mb-3">
                  <div className="font-bold text-sm text-gray-800">
                    Purchase Price: {coverData.purchasePrice}
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                {coverData.buyer && (
                  <div><span className="font-medium">Buyer:</span> {coverData.buyer}</div>
                )}
                {coverData.seller && (
                  <div><span className="font-medium">Seller:</span> {coverData.seller}</div>
                )}
                {coverData.closingDate && (
                  <div><span className="font-medium">Closing:</span> {new Date(coverData.closingDate).toLocaleDateString()}</div>
                )}
                {coverData.escrowAgent && (
                  <div><span className="font-medium">Escrow:</span> {coverData.escrowAgent}</div>
                )}
                {coverData.attorney && (
                  <div><span className="font-medium">Attorney:</span> {coverData.attorney}</div>
                )}
                {coverData.lender && (
                  <div><span className="font-medium">Lender:</span> {coverData.lender}</div>
                )}
              </div>

              {/* Logo Preview Area */}
              <div className="mt-4 border-t border-gray-200 pt-2">
                <div className="flex justify-center space-x-2">
                  {logos.slice(0, 3).map((logo, index) => (
                    <div key={logo.id} className="w-20 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                      <img 
                        src={logo.logo_url} 
                        alt={`Logo ${index + 1}`} 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  ))}
                  {/* Show empty slots */}
                  {Array.from({ length: 3 - logos.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="w-20 h-10 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-xs text-gray-400">L{logos.length + index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2 text-center">
                Generated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverPageEditor;