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
    propertyState: project?.property_state || '',
    propertyDescription: project?.property_description || '',
    closingDate: project?.closing_date || '',
    attorney: project?.attorney || '',
    lender: project?.lender || '',
    buyer: project?.buyer || '',
    seller: project?.seller || '',
    escrowAgent: project?.escrow_agent || '',
    purchasePrice: project?.purchase_price || '',
    contact_info: project?.contact_info || {}
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state for logos and photo
  const [logos, setLogos] = useState([]);
  const [propertyPhoto, setPropertyPhoto] = useState({
    property_photo_url: project?.property_photo_url || null,
    property_photo_name: project?.property_photo_name || null
  });
  const [previewMode, setPreviewMode] = useState('cover');
  const [tocStructure, setTocStructure] = useState({ sections: [], documents: [] });
  const [tocLoading, setTocLoading] = useState(false);

  // Formatting helpers
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '').slice(0, 10);
    const len = digits.length;
    if (len <= 3) return `(${digits}`;
    if (len <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  const formatCurrencyCents = (value) => {
    if (value == null) return '';
    const numeric = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!isFinite(numeric)) return '';
    return '$' + numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Sanitize price input for typing (allow multiple digits and one decimal, up to 2 decimals)
  const sanitizePriceInput = (value) => {
    if (value == null) return '';
    let s = String(value).replace(/[^\d.]/g, '');
    // Keep only first decimal point
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }
    // Limit to two decimal places
    if (firstDot !== -1) {
      const [intPart, decPart] = s.split('.');
      s = intPart + '.' + decPart.slice(0, 2);
    }
    // Trim leading zeros while preserving "0." pattern
    s = s.replace(/^0+(\d)/, '$1');
    return s;
  };

  // Format for preview display
  const formatCurrencyDisplay = (raw) => {
    if (!raw) return null;
    const num = Number(raw);
    if (!isFinite(num)) return null;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
        const formattedPrice = projectData.purchase_price != null ? String(projectData.purchase_price) : '';

        setCoverData({
          title: projectData.title || '',
          propertyAddress: projectData.property_address || '',
          propertyState: (projectData.property_state || (projectData.cover_page_data && (typeof projectData.cover_page_data === 'string' ? (()=>{ try { return JSON.parse(projectData.cover_page_data); } catch(_) { return {}; } })() : projectData.cover_page_data)?.propertyState) || ''),
          propertyDescription: projectData.property_description || '',
          closingDate: projectData.closing_date || '',
          attorney: projectData.attorney || '',
          lender: projectData.lender || '',
          buyer: projectData.buyer || '',
          seller: projectData.seller || '',
          escrowAgent: projectData.escrow_agent || '',
          purchasePrice: formattedPrice,
          contact_info: projectData.contact_info || (projectData.cover_page_data && projectData.cover_page_data.contact_info) || {}
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

  // Load TOC structure for preview
  useEffect(() => {
    let isMounted = true;
    const loadStructure = async () => {
      if (!project?.id) return;
      try {
        setTocLoading(true);
        const { documentOrganizationService } = await import('../../utils/documentOrganizationService');
        const data = await documentOrganizationService.getProjectStructure(project.id);
        if (isMounted) setTocStructure({ sections: data.sections || [], documents: data.documents || [] });
      } catch (e) {
        console.warn('Failed to load TOC structure for preview:', e);
      } finally {
        if (isMounted) setTocLoading(false);
      }
    };
    loadStructure();
    return () => { isMounted = false; };
  }, [project?.id]);

  const handlePurchasePriceChange = (e) => {
    const inputValue = e.target.value;
    const clean = sanitizePriceInput(inputValue);
    setCoverData(prev => ({ ...prev, purchasePrice: clean }));
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
      
      // Try save with property_state; if it fails due to missing column, retry without
      const attemptUpdate = async (includeState) => {
        const payload = {
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
          contact_info: coverData.contact_info,
          // Keep cover_page_data in sync with state selection so list view sees it
          cover_page_data: {
            ...(project?.cover_page_data && typeof project.cover_page_data === 'string' ? (()=>{ try { return JSON.parse(project.cover_page_data); } catch(_) { return {}; } })() : (project?.cover_page_data || {})),
            propertyState: coverData.propertyState || null
          },
          updated_at: new Date().toISOString()
        };
        if (includeState) payload.property_state = coverData.propertyState || null;
        return await supabase
          .from('projects')
          .update(payload)
          .eq('id', project.id)
          .select('*')
          .single();
      };

      let { data: updatedProject, error } = await attemptUpdate(true);
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (error.code === '42703' || msg.includes('property_state') || msg.includes('schema cache')) {
          ({ data: updatedProject, error } = await attemptUpdate(false));
        }
      }

      if (error) throw error;

      alert('Cover page data saved successfully!');
      
      // Call onProjectUpdate with fresh project data so parent doesn't lose project state
      if (onProjectUpdate) onProjectUpdate(updatedProject || project);
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
            document={<CoverPagePDF project={{ cover_page_data: coverData }} logos={logos} propertyPhoto={propertyPhoto} customData={{}} />}
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

      {/* Centered preview rail with tabs and slide */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center gap-6 mb-4">
          <button onClick={() => setPreviewMode('cover')} className={`text-sm ${previewMode === 'cover' ? 'font-semibold text-black' : 'text-gray-600 hover:text-black'} underline-offset-4 hover:underline`}>Cover Page</button>
          <button onClick={() => setPreviewMode('toc')} className={`text-sm ${previewMode === 'toc' ? 'font-semibold text-black' : 'text-gray-600 hover:text-black'} underline-offset-4 hover:underline`}>Table of Contents</button>
          <button onClick={() => setPreviewMode('contact')} className={`text-sm ${previewMode === 'contact' ? 'font-semibold text-black' : 'text-gray-600 hover:text-black'} underline-offset-4 hover:underline`}>Contact Information</button>
              </div>
        <div className="mx-auto bg-transparent rounded-lg overflow-hidden" style={{ width: '50%', aspectRatio: '1 / 1.75' }}>
          <div className="w-[300%] h-full flex transition-transform duration-500" style={{ transform: previewMode === 'cover' ? 'translateX(0%)' : previewMode === 'toc' ? 'translateX(-33.3333%)' : 'translateX(-66.6666%)' }}>
            {/* Slide 1: Cover */}
            <div className="w-1/3 h-full px-2">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full h-full">
            <div className="p-6 h-full flex flex-col">
                  {/* Header (match client: title, location, description) */}
              <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">{coverData.title || 'Closing Binder'}</h1>
                {coverData.propertyAddress && (
                      <p className="text-sm text-gray-700 mb-2">{coverData.propertyAddress}</p>
                    )}
                    {coverData.propertyDescription && (
                      <div className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
                        {coverData.propertyDescription}
                      </div>
                )}
              </div>
              {/* Photo Area */}
              <div className="mb-2">
                <div className="w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center" style={{minHeight: '200px', maxHeight: '200px'}}>
                  {propertyPhoto.property_photo_url ? (
                        <img src={propertyPhoto.property_photo_url} alt="Property" className="max-w-full max-h-full object-cover rounded" style={{maxHeight: '180px', width: 'auto'}} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Property Photo</p>
                    </div>
                  )}
                </div>
              </div>
                  {/* Highlights row: Purchase Price and Closing Date under photo */}
                  {(coverData.purchasePrice || coverData.closingDate) && (
                    <div className="mb-4 text-center">
                      <div className="flex justify-center space-x-6">
                        {coverData.purchasePrice && (
                          <div className="bg-gray-50 px-4 py-3 rounded-lg">
                            <div className="text-xs text-gray-600 font-medium">Purchase Price</div>
                            <div className="text-sm font-bold text-gray-900">{formatCurrencyDisplay(coverData.purchasePrice) || coverData.purchasePrice}</div>
                  </div>
                        )}
                        {coverData.closingDate && (
                          <div className="bg-gray-50 px-4 py-3 rounded-lg">
                            <div className="text-xs text-gray-600 font-medium">Closing Date</div>
                            <div className="text-sm font-semibold text-gray-900">{new Date(coverData.closingDate).toLocaleDateString()}</div>
                </div>
              )}
                  </div>
                </div>
              )}
              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {(coverData.contact_info?.buyer?.company) && (<div><span className="font-medium">Buyer:</span> {coverData.contact_info.buyer.company}</div>)}
                    {(coverData.contact_info?.seller?.company) && (<div><span className="font-medium">Seller:</span> {coverData.contact_info.seller.company}</div>)}
                    {coverData.closingDate && (<div><span className="font-medium">Closing:</span> {new Date(coverData.closingDate).toLocaleDateString()}</div>)}
                    {(coverData.contact_info?.escrow_agent?.company) && (<div><span className="font-medium">Escrow:</span> {coverData.contact_info.escrow_agent.company}</div>)}
                    {coverData.attorney && (<div><span className="font-medium">Attorney:</span> {coverData.attorney}</div>)}
                    {(coverData.contact_info?.lender?.company) && (<div><span className="font-medium">Lender:</span> {coverData.contact_info.lender.company}</div>)}
              </div>
              {/* Spacer to push logos/footer to bottom */}
              <div className="flex-1" />
              {/* Logo Preview Area */}
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="flex justify-center space-x-2">
                  {logos.slice(0, 3).map((logo, index) => (
                    <div key={logo.id} className="w-20 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                          <img src={logo.logo_url} alt={`Logo ${index + 1}`} className="max-w-full max-h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                  ))}
                  {Array.from({ length: 3 - logos.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="w-20 h-10 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-xs text-gray-400">L{logos.length + index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
                  {/* Footer */}
                  <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2 text-center">Generated: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            {/* Slide 2: TOC */}
            <div className="w-1/3 h-full px-2">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full h-full p-4 flex flex-col">
                <div className="text-center mb-3">
                  <h2 className="text-lg font-bold text-gray-900">TABLE OF CONTENTS</h2>
                  {coverData.title && (<div className="text-xs text-gray-800 mt-1">{coverData.title}</div>)}
                  {coverData.propertyAddress && (<div className="text-[11px] text-gray-600">{coverData.propertyAddress}</div>)}
                  <div className="text-[11px] text-gray-500 mt-1">
                    {coverData.purchasePrice && (<span>Purchase Price: {coverData.purchasePrice}</span>)}
                    {coverData.purchasePrice && coverData.closingDate && (<span> • </span>)}
                    {coverData.closingDate && (<span>Closing Date: {new Date(coverData.closingDate).toLocaleDateString()}</span>)}
                  </div>
                </div>
                <div className="flex-1 border border-gray-200 rounded p-2 text-[11px] text-gray-700 overflow-auto">
                  {tocLoading ? (
                    <div className="text-center text-gray-400">Loading…</div>
                  ) : (
                    (() => {
                      // Build numbered structure like client TOC
                      const sections = (tocStructure.sections || []).slice().sort((a,b)=> (a.sort_order||0)-(b.sort_order||0));
                      const main = sections.filter(s=>s.section_type==='section');
                      const subs = sections.filter(s=>s.section_type==='subsection');
                      const docs = (tocStructure.documents || []).slice().sort((a,b)=> (a.sort_order||0)-(b.sort_order||0));
                      const numberedSections = main.map((section, sIdx) => ({
                        ...section,
                        number: sIdx+1,
                        documents: docs.filter(d=>d.section_id===section.id).map((d, i)=> ({...d, number: `${sIdx+1}.${i+1}`})),
                        subsections: subs.filter(sub=>sub.parent_section_id===section.id).map((sub, subIdx)=> ({
                          ...sub,
                          number: `${sIdx+1}.${subIdx+1}`,
                          documents: docs.filter(d=>d.section_id===sub.id).map((d,i)=> ({...d, number: `${sIdx+1}.${subIdx+1}.${i+1}`}))
                        }))
                      }));
                      const unorganized = docs.filter(d=>!d.section_id).map((d,i)=> ({...d, number: `${main.length + i + 1}`}));

                      return (
                        <div className="space-y-2">
                          {numberedSections.map(sec => (
                            <div key={sec.id} className="border-b border-gray-100 pb-1">
                              <div className="py-1 px-2 bg-gray-100 border-l-4 border-black">
                                <div className="font-semibold text-gray-900 text-[12px]">{sec.number}. {sec.section_name || sec.name || 'Unnamed Section'}</div>
                              </div>
                              {sec.documents.map(d => (
                                <div key={d.id} className="flex items-center justify-between py-1 px-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[11px] text-gray-500 min-w-[34px]">{d.number}</span>
                                    <span className="text-[11px] text-gray-800">{d.original_name || d.name || d.display_name || 'Unnamed Document'}</span>
                                  </div>
                                </div>
                              ))}
                              {sec.subsections.map(sub => (
                                <div key={sub.id} className="ml-4">
                                  <div className="py-1 px-2 bg-gray-50 border-l-4 border-black/60">
                                    <div className="font-semibold text-gray-900 text-[11px]">{sub.number}. {sub.section_name || sub.name || 'Unnamed Subsection'}</div>
                                  </div>
                                  {sub.documents.map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-1 px-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-[11px] text-gray-500 min-w-[34px]">{d.number}</span>
                                        <span className="text-[11px] text-gray-800">{d.original_name || d.name || d.display_name || 'Unnamed Document'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                          {unorganized.length > 0 && (
                            <div>
                              <div className="py-1 px-2 bg-yellow-50 border-l-4 border-yellow-400">
                                <div className="text-[12px] font-semibold text-gray-900">Additional Documents</div>
                              </div>
                              {unorganized.map(d => (
                                <div key={d.id} className="flex items-center justify-between py-1 px-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[11px] text-gray-500 min-w-[34px]">{d.number}</span>
                                    <span className="text-[11px] text-gray-800">{d.original_name || d.name || d.display_name || 'Unnamed Document'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="mt-2 text-center text-[10px] text-gray-500 border-t border-gray-200 pt-2">This table of contents provides quick access to all documents.</div>
              </div>
            </div>
            {/* Slide 3: Contact Info */}
            <div className="w-1/3 h-full px-2">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full h-full p-4 flex flex-col">
                <div className="text-center mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Contact Information</h2>
                </div>
                <div className="flex-1 overflow-auto text-[11px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left column: Buyer-side */}
                    <div className="space-y-2">
                      {[
                        { key: 'buyer', label: 'Buyer' },
                        { key: 'buyer_attorney', label: "Buyer's Attorney" },
                        { key: 'buyer_broker', label: "Buyer's Broker" },
                        { key: 'lender', label: 'Lender' },
                        { key: 'escrow_agent', label: 'Escrow Agent' },
                      ].map((role) => {
                        const info = coverData.contact_info[role.key] || {};
                        const isNA = !!info.not_applicable;
                        const hasAny = ['company','representative','address','email','phone','web'].some(f => !!info[f]);
                        if (!isNA && !hasAny) return null;
                        return (
                          <div key={role.key} className="border-l-4 border-black pl-2">
                            <div className="font-semibold text-gray-900">{role.label}</div>
                            {isNA ? (
                              <div className="text-gray-700">None</div>
                            ) : (
                              <div className="text-gray-700 space-y-0.5">
                                {info.company && (<div><span className="font-medium">Company:</span> {info.company}</div>)}
                                {info.representative && (<div><span className="font-medium">Representative:</span> {info.representative}</div>)}
                                {info.address && (<div><span className="font-medium">Address:</span> {info.address}</div>)}
                                {info.email && (<div><span className="font-medium">Email:</span> {info.email}</div>)}
                                {info.phone && (<div><span className="font-medium">Phone:</span> {info.phone}</div>)}
                                {info.web && (<div><span className="font-medium">Web:</span> {info.web}</div>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Right column: Seller-side */}
                    <div className="space-y-2">
                      {[
                        { key: 'seller', label: 'Seller' },
                        { key: 'seller_attorney', label: "Seller's Attorney" },
                        { key: 'seller_broker', label: "Seller's Broker" },
                      ].map((role) => {
                        const info = coverData.contact_info[role.key] || {};
                        const isNA = !!info.not_applicable;
                        const hasAny = ['company','representative','address','email','phone','web'].some(f => !!info[f]);
                        if (!isNA && !hasAny) return null;
                        return (
                          <div key={role.key} className="border-l-4 border-black pl-2">
                            <div className="font-semibold text-gray-900">{role.label}</div>
                            {isNA ? (
                              <div className="text-gray-700">None</div>
                            ) : (
                              <div className="text-gray-700 space-y-0.5">
                                {info.company && (<div><span className="font-medium">Company:</span> {info.company}</div>)}
                                {info.representative && (<div><span className="font-medium">Representative:</span> {info.representative}</div>)}
                                {info.address && (<div><span className="font-medium">Address:</span> {info.address}</div>)}
                                {info.email && (<div><span className="font-medium">Email:</span> {info.email}</div>)}
                                {info.phone && (<div><span className="font-medium">Phone:</span> {info.phone}</div>)}
                                {info.web && (<div><span className="font-medium">Web:</span> {info.web}</div>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Full-width Basic Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Binder Title</label>
            <input type="text" value={coverData.title} onChange={(e) => setCoverData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Enter closing binder title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Address</label>
            <input type="text" value={coverData.propertyAddress} onChange={(e) => setCoverData(prev => ({ ...prev, propertyAddress: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Enter property address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property State</label>
            <select
              value={coverData.propertyState}
              onChange={(e) => setCoverData(prev => ({ ...prev, propertyState: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black"
            >
              <option value="">Select state…</option>
              {[
                'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
              ].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Description</label>
            <textarea value={coverData.propertyDescription} onChange={(e) => setCoverData(prev => ({ ...prev, propertyDescription: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Enter property description (use Enter key for line breaks)" />
            <p className="text-xs text-gray-500 mt-1">Tip: Press Enter to create line breaks that will appear on the cover page</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
              <input type="text" inputMode="decimal" value={coverData.purchasePrice} onChange={handlePurchasePriceChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Closing Date</label>
              <input type="date" value={coverData.closingDate} onChange={(e) => setCoverData(prev => ({ ...prev, closingDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Property Photo and Logos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Property Photo</h3>
          <PropertyPhotoManager projectId={project.id} photo={propertyPhoto} onPhotoChange={handlePhotoChange} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Logos</h3>
          <LogoManager projectId={project.id} logos={logos} onLogosChange={handleLogosChange} />
        </div>
      </div>

      {/* Helper to render contact fields for a role */}
      {(() => {
        const renderContactFields = (roleKey) => {
          const info = coverData.contact_info[roleKey] || {};
          const update = (field, value) => {
            setCoverData(prev => ({
              ...prev,
              contact_info: {
                ...prev.contact_info,
                [roleKey]: {
                  ...(prev.contact_info[roleKey] || {}),
                  [field]: value
                }
              }
            }));
          };
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="inline-flex items-center text-sm font-medium text-gray-700 mb-1">
                  <input type="checkbox" className="mr-2" checked={!!info.not_applicable} onChange={(e) => update('not_applicable', e.target.checked)} />
                  Not Applicable
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.company || ''} onChange={(e) => update('company', e.target.value)} placeholder="Company name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representative</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.representative || ''} onChange={(e) => update('representative', e.target.value)} placeholder="Representative name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.address_line1 || ''} onChange={(e) => update('address_line1', e.target.value)} placeholder="123 Main St" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.city || ''} onChange={(e) => update('city', e.target.value)} placeholder="City" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.state || ''} onChange={(e) => update('state', e.target.value.toUpperCase())} placeholder="ST" maxLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.zip || ''} onChange={(e) => update('zip', e.target.value)} placeholder="Zip" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.phone || ''} onChange={(e) => update('phone', formatPhoneNumber(e.target.value))} placeholder="(555) 555-5555" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.web || ''} onChange={(e) => update('web', e.target.value)} placeholder="https://example.com" />
              </div>
              {roleKey === 'lender' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={info.loan_amount || ''} onChange={(e) => update('loan_amount', formatCurrencyCents(e.target.value))} placeholder="$0.00" />
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Buyer-side and Seller-side columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Buyer & Related Parties</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Name</label>
                    <input type="text" value={coverData.buyer} onChange={(e) => {
                      const newBuyer = e.target.value;
                      setCoverData(prev => {
                        const prevBuyer = prev.buyer || '';
                        const existingCompany = prev.contact_info?.buyer?.company || '';
                        const shouldSyncCompany = !existingCompany || existingCompany === prevBuyer;
                        return {
                          ...prev,
                          buyer: newBuyer,
                          contact_info: {
                            ...prev.contact_info,
                            buyer: {
                              ...(prev.contact_info?.buyer || {}),
                              company: shouldSyncCompany ? newBuyer : existingCompany
                            }
                          }
                        };
                      });
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Buyer name" />
                  </div>
                  {renderContactFields('buyer')}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Buyer's Attorney</h4>
                    {renderContactFields('buyer_attorney')}
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Buyer's Broker</h4>
                    {renderContactFields('buyer_broker')}
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Lender</h4>
                    {renderContactFields('lender')}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seller & Related Parties</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seller Name</label>
                    <input type="text" value={coverData.seller} onChange={(e) => {
                      const newSeller = e.target.value;
                      setCoverData(prev => {
                        const prevSeller = prev.seller || '';
                        const existingCompany = prev.contact_info?.seller?.company || '';
                        const shouldSyncCompany = !existingCompany || existingCompany === prevSeller;
                        return {
                          ...prev,
                          seller: newSeller,
                          contact_info: {
                            ...prev.contact_info,
                            seller: {
                              ...(prev.contact_info?.seller || {}),
                              company: shouldSyncCompany ? newSeller : existingCompany
                            }
                          }
                        };
                      });
                    }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Seller name" />
                  </div>
                  {renderContactFields('seller')}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Seller's Attorney</h4>
                    {renderContactFields('seller_attorney')}
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Seller's Broker</h4>
                    {renderContactFields('seller_broker')}
                  </div>
                  {/* Escrow Agent paired across from Lender */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Escrow Agent</h4>
                    {renderContactFields('escrow_agent')}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">File Number</label>
                      <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" value={(coverData.contact_info.escrow_agent && coverData.contact_info.escrow_agent.file_number) || ''} onChange={(e) => {
                        const val = e.target.value;
                        setCoverData(prev => ({
                          ...prev,
                          contact_info: {
                            ...prev.contact_info,
                            escrow_agent: {
                              ...(prev.contact_info.escrow_agent || {}),
                              file_number: val
                            }
                          }
                        }));
                      }} placeholder="e.g., 987654" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom row removed (Title Company removed); Lender and Escrow Agent are now paired above */}
            <div />
          </>
        );
      })()}

      {/* Contact Information table removed as requested; fields above feed PDF contact page */}
    </div>
  );
};

export default CoverPageEditor;