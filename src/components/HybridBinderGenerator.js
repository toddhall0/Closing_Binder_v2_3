// ===============================
// FILE: src/components/HybridBinderGenerator.js
// FINAL WORKING VERSION with Enhanced PDF and Working Web Binder
// ===============================

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, FileText, Download, CheckCircle } from 'lucide-react';
import { documentOrganizationService } from '../utils/documentOrganizationService';
import CoverPageHTML from './web/CoverPageHTML';
import TableOfContentsHTML from './web/TableOfContentsHTML';

const HybridBinderGenerator = ({ project, onProjectUpdate }) => {
  const [mode] = useState('web'); // Fixed to web mode (buttons removed)
  const [documents, setDocuments] = useState([]);
  const [structure, setStructure] = useState({ sections: [], documents: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedWeb, setGeneratedWeb] = useState(false);
  const [previewPage, setPreviewPage] = useState('cover'); // 'cover' | 'toc'

  // Load documents when component mounts or project changes
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading documents for project:', project.id);
      const structureData = await documentOrganizationService.getProjectStructure(project.id);
      setStructure(structureData);
      setDocuments(structureData.documents || []);
      console.log('Documents loaded successfully:', {
        sections: structureData.sections.length,
        documents: structureData.documents.length
      });
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(`Failed to load documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project?.id) {
      loadDocuments();
    }
  }, [project?.id, project?.cover_page_data, loadDocuments]);

  const handleGenerateWeb = () => {
    console.log('handleGenerateWeb called with:', {
      documents: documents.length,
      documentsArray: documents,
      sections: structure.sections.length
    });
    
    if (documents.length === 0) {
      setError('No documents found. Please upload documents first.');
      return;
    }
    
    setGeneratedWeb(true);
    setError(null);
  };

  // Auto-generate web binder once documents have loaded
  useEffect(() => {
    if (!generatedWeb && Array.isArray(documents) && documents.length > 0) {
      setError(null);
      setGeneratedWeb(true);
    }
  }, [documents, generatedWeb]);

  const handleGeneratePDF = async () => {
    console.log('Starting ENHANCED PDF generation...');
    setLoading(true);
    setError(null);
    
    try {
      if (documents.length === 0) {
        throw new Error('No documents found. Please upload documents first.');
      }

      // Import the ENHANCED PDF generator (THIS IS THE KEY CHANGE!)
      const { generateEnhancedPDFBinder } = await import('../utils/enhancedPdfBinderGenerator');
      
      // Load logos for PDF generation
      const { supabase } = await import('../lib/supabase');
      const { data: logosData, error: logosError } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position');

      if (logosError) {
        console.error('Error loading logos for PDF:', logosError);
      }

      console.log('Generating ENHANCED PDF with data:', {
        project: project?.title,
        documents: documents.length,
        sections: structure.sections.length,
        logos: logosData?.length || 0
      });

      // Generate the ENHANCED PDF binder with better TOC
      const result = await generateEnhancedPDFBinder({
        project,
        documents,
        structure,
        logos: logosData || []
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create download
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.title || 'Enhanced Closing Binder'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('ENHANCED PDF generated and downloaded successfully');

    } catch (err) {
      console.error('Error generating ENHANCED PDF:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mode selector removed per spec

  // Project status box removed per spec

  const WebBinderContent = () => {
    if (!generatedWeb) {
      return (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Generate Web-Based Binder
          </h3>
          <p className="text-gray-600 mb-6">
            Create an interactive HTML binder with clickable links to cloud-hosted documents
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerateWeb}
            disabled={loading || documents.length === 0}
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Globe className="h-5 w-5 mr-2" />
            Generate Web Binder
          </button>
        </div>
      );
    }

    // Show the actual web binder when generated
    return (
      <div className="space-y-8">
        {previewPage === 'cover' ? (
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cover Page</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewPage('toc')}
                  className="text-sm text-black hover:underline"
                  title="Go to Table of Contents"
                >
                  Table of Contents →
                </button>
              </div>
            </div>
            <CoverPageHTML project={project} />
          </div>
        ) : previewPage === 'toc' ? (
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Table of Contents</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewPage('cover')}
                  className="text-sm text-black hover:underline"
                  title="Go to Cover Page"
                >
                  ← Cover Page
                </button>
                <button
                  onClick={() => setPreviewPage('contact')}
                  className="text-sm text-black hover:underline"
                  title="Go to Contact Information"
                >
                  Contact Information →
                </button>
              </div>
            </div>
            <TableOfContentsHTML 
              project={project}
              documents={documents}
              structure={structure}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewPage('toc')}
                  className="text-sm text-black hover:underline"
                  title="Go to Table of Contents"
                >
                  ← Table of Contents
                </button>
              </div>
            </div>
            {/* Contact Information content */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {renderContactBox('buyer','Buyer')}
                {renderContactBox('seller','Seller')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {renderContactBox('buyer_attorney',"Buyer's Attorney")}
                {renderContactBox('seller_attorney',"Seller's Attorney")}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {renderContactBox('buyer_broker',"Buyer's Broker")}
                {renderContactBox('seller_broker',"Seller's Broker")}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {renderContactBox('lender','Lender')}
                {renderContactBox('escrow_agent','Escrow Agent')}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PdfBinderContent = () => (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Generate Enhanced PDF Binder
      </h3>
      <p className="text-gray-600 mb-6">
        Create a professional PDF with enhanced table of contents, clickable links, and improved formatting
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Enhanced PDF Features */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
          <h4 className="font-medium text-blue-900 mb-2">Enhanced PDF Features</h4>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>• Professional cover page with property photos and logos</li>
            <li>• Enhanced table of contents with better formatting</li>
            <li>• Clickable document links that open in new windows</li>
            <li>• Professional typography and legal/financial formatting</li>
            <li>• Proper hierarchical document organization</li>
            <li>• Dotted lines and page numbers like Complete Binder Generator</li>
          </ul>
        </div>
      </div>
      
      <button
        onClick={handleGeneratePDF}
        disabled={loading || documents.length === 0}
        className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Generating Enhanced PDF...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 mr-2" />
            Generate Enhanced PDF Binder
          </>
        )}
      </button>

      {loading && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Creating enhanced PDF with improved formatting...</p>
          <p>This may take a few minutes for large binders...</p>
          <p>Please keep this tab open during generation.</p>
        </div>
      )}
    </div>
  );

  // Helpers to render Contact Info boxes (mirrors client view)
  const renderContactBox = (key, label) => {
    // Prefer cover_page_data.contact_info if present
    let cpd = project?.cover_page_data;
    if (typeof cpd === 'string') {
      try { cpd = JSON.parse(cpd); } catch (_) { cpd = {}; }
    }
    let contactInfo = cpd?.contact_info || project?.contact_info || {};
    // Fallback: flat fields
    const flatFallback = {
      buyer: project?.buyer,
      seller: project?.seller,
      buyer_attorney: project?.buyer_attorney,
      seller_attorney: project?.seller_attorney,
      buyer_broker: project?.buyer_broker,
      seller_broker: project?.seller_broker,
      lender: project?.lender,
      title_company: project?.title_company,
      escrow_agent: project?.escrow_agent
    };
    const baseRaw = contactInfo[key] || (flatFallback[key] ? { company: flatFallback[key] } : {});
    const normalize = (v) => (v == null ? '' : String(v));
    const addressParts = [];
    const line1 = normalize(baseRaw.address_line1 || baseRaw.address || '');
    const line2 = normalize(baseRaw.address_line2 || '');
    const city = normalize(baseRaw.city || '');
    const state = normalize(baseRaw.state || '');
    const zip = normalize(baseRaw.zip || '');
    if (line1) addressParts.push(line1);
    if (line2) addressParts.push(line2);
    const cityStateZip = [city, state, zip].filter(Boolean).join(', ').replace(/,\s*,/g, ',');
    if (cityStateZip) addressParts.push(cityStateZip);
    const composedAddress = addressParts.join('\n');
    const base = {
      ...baseRaw,
      address: composedAddress
    };
    const representativeValue = base.representative || base.representative_name || base.contact || base.name || base.rep || null;
    const hasAny = !!(base.company || representativeValue || base.address || base.email || base.phone || base.web || (key === 'escrow_agent' && base.file_number));
    return (
      <div className="h-full min-h-[180px] border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{label}</h3>
        {!hasAny ? (
          <div className="text-sm text-gray-500">—</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 text-sm">
            {base.company && <div><span className="font-medium">Company:</span> {base.company}</div>}
            {representativeValue && <div><span className="font-medium">Representative:</span> {representativeValue}</div>}
            {base.address && <div><span className="font-medium">Address:</span> {base.address}</div>}
            {base.email && <div><span className="font-medium">Email:</span> {base.email}</div>}
            {base.phone && <div><span className="font-medium">Phone:</span> {base.phone}</div>}
            {base.web && <div><span className="font-medium">Web:</span> {base.web}</div>}
            {key === 'escrow_agent' && base.file_number && (
              <div><span className="font-medium">File Number:</span> {base.file_number}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mode selector removed per spec */}

      {/* Content based on mode */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">
              {mode === 'web' ? 'Loading web binder...' : 'Generating enhanced PDF...'}
            </p>
          </div>
        ) : (
          <>
            {mode === 'web' && <WebBinderContent />}
            {mode === 'pdf' && <PdfBinderContent />}
          </>
        )}
      </div>
    </div>
  );
};

export default HybridBinderGenerator;