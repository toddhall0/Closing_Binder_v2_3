// src/components/projects/ProjectCard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import AssignClientModal from './AssignClientModal';
import { ClientDashboardService } from '../../services/clientDashboardService';

export const ProjectCard = ({ 
  project, 
  onSelect, 
  onEdit, 
  onDelete, 
  loading = false 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [clientName, setClientName] = useState(project?.client?.name || project?.client_name || project?.clientName || project?.client?.company || null);
  const [clientSlug, setClientSlug] = useState(project?.client?.slug || project?.client_slug || null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        // If explicitly assigned, resolve client display info from clients table
        if (project?.client_id && (!clientName || !clientSlug)) {
          const { default: ClientsService } = await import('../../services/clientsService');
          const { data } = await ClientsService.getById(project.client_id);
          if (active && data) {
            if (data.name) setClientName(data.name);
            if (data.slug) setClientSlug(data.slug);
          }
        }
        // Do NOT infer client from binders when project has no client_id; keep as Unassigned
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.client_id, clientName, clientSlug]);

  // Clear cached client display when project becomes unassigned
  useEffect(() => {
    if (!project?.client_id) {
      setClientName(null);
      setClientSlug(null);
    }
  }, [project?.client_id]);
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const s = String(dateString).trim();
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      // Construct local date to avoid UTC timezone shift rendering as previous day
      const dt = new Date(y, mo - 1, d);
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return s;
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!isFinite(numeric)) return String(value);
    return numeric.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const getPurchasePrice = () => {
    const c = project?.cover_page_data || {};
    return c.purchasePrice ?? c.purchase_price ?? project?.purchase_price ?? null;
  };

  const getClosingDate = () => {
    const c = project?.cover_page_data || {};
    return c.closingDate ?? c.closing_date ?? project?.closing_date ?? null;
  };

// ===============================
// FILE: src/App.js (UPDATED ROUTING SECTION)
// Add these imports and routes to your existing App.js
// ===============================

/*
Add this import at the top of your App.js:
*/
// import ProjectDetail from './components/projects/ProjectDetail';

/*
In your Routes section, add this route (make sure you have React Router Dom installed):
*/
// <Route 
//   path="/projects/:id" 
//   element={
//     <ProtectedRoute>
//       <ProjectDetail />
//     </ProtectedRoute>
//   } 
// />

/*
Your complete Routes section should look something like this:
*/
// <Routes>
//   <Route path="/" element={<PublicLanding />} />
//   <Route path="/login" element={<Login />} />
//   <Route path="/signup" element={<Signup />} />
//   <Route 
//     path="/dashboard" 
//     element={
//       <ProtectedRoute>
//         <Dashboard />
//       </ProtectedRoute>
//     } 
//   />
//   <Route 
//     path="/projects/:id" 
//     element={
//       <ProtectedRoute>
//         <ProjectDetail />
//       </ProtectedRoute>
//     } 
//   />
// </Routes>

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuAction = (action, e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    action();
  };

  // Main card click handler - navigates to project detail
  const handleCardClick = () => {
    if (!loading) {
      navigate(`/projects/${project.id}`);
    }
  };

  // Handle project selection (for backward compatibility)
  const handleProjectSelect = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(project);
    }
    // Also navigate to project detail
    navigate(`/projects/${project.id}`);
  };

  const getProjectImageUrl = () => {
    const candidates = [
      project?.cover_photo_url,
      project?.property_photo_url,
      project?.property_data?.photo_url,
      project?.cover_page_data?.propertyPhotoUrl
    ];
    for (const url of candidates) {
      if (url && typeof url === 'string' && url.trim().length > 0) {
        return url.trim();
      }
    }

    // Fallback: construct from storage naming convention if we only have the filename
    // Expected storage path: images/<user_id>/projects/<project_id>/photos/<fileName>
    if (project?.property_photo_name && project?.user_id && project?.id) {
      const baseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const path = `images/${project.user_id}/projects/${project.id}/photos/${project.property_photo_name}`;
      return `${baseUrl}/storage/v1/object/public/${path}`;
    }

    return null;
  };

  const imageUrl = getProjectImageUrl();

  return (
    <div 
      className={`relative bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer group ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Cover Photo */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={project.title}
            className="w-full h-32 object-cover rounded-t-lg"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`w-full h-32 flex items-center justify-center rounded-t-lg ${imageUrl ? 'hidden' : ''}`}>
          <svg 
            className="w-12 h-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
            />
          </svg>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Header with Menu */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {project.title}
            </h3>
          </div>
          
          {/* Menu Button */}
          <div className="relative ml-2">
            <button
              onClick={handleMenuToggle}
              className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={(e) => handleMenuAction(() => navigate(`/projects/${project.id}`), e)}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Open Project
                  </button>
                  {onEdit && (
                    <button
                      onClick={(e) => handleMenuAction(() => onEdit(project), e)}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Edit Details
                    </button>
                  )}
                  <hr className="my-1" />
                  {onDelete && (
                    <button
                      onClick={(e) => handleMenuAction(() => onDelete(project), e)}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Name */}
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Client: </span>
          {clientName ? (
            clientSlug ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`${window.location.origin}/client/${clientSlug}`, '_blank', 'noopener,noreferrer'); }}
                className="text-blue-600 underline"
              >
                {clientName}
              </button>
            ) : (
              <span className="truncate align-middle">{clientName}</span>
            )
          ) : (
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAssignOpen(true); }} className="text-blue-600 underline">(Assign)</button>
          )}
        </div>

        {/* Project Description */}
        {project?.description || project?.property_description ? (
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Project Description: </span>
            <span className="line-clamp-2 align-middle">{project?.description || project?.property_description}</span>
          </div>
        ) : null}

        {/* Purchase Price and Closing Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="text-sm text-gray-700">
            <div className="font-semibold">Purchase Price:</div>
            <div>{formatPrice(getPurchasePrice())}</div>
          </div>
          <div className="text-sm text-gray-700">
            <div className="font-semibold">Closing Date:</div>
            <div>{getClosingDate() ? formatDate(getClosingDate()) : '—'}</div>
          </div>
        </div>

        <AssignClientModal
          isOpen={assignOpen}
          onClose={() => setAssignOpen(false)}
          onAssigned={async (client) => {
            try {
              const { default: ProjectsService } = await import('../../utils/supabaseProjects');
              // Optimistically update UI
              setClientName(client.name);
              if (client.slug) setClientSlug(client.slug);
              // Persist to DB if supported; ignore errors to avoid breaking UX
              await ProjectsService.updateProject(project.id, { client_id: client.id, client_name: client.name });
              // Ensure an active binder exists for this client+project so it appears in client dashboard
              try {
                const result = await ClientDashboardService.publishBinder({
                  projectId: project.id,
                  clientId: client.id,
                  clientName: client.name,
                  clientEmail: client.email || null,
                  title: project.title,
                  propertyAddress: project.property_address,
                  propertyDescription: project.property_description,
                  coverPageData: {
                    title: project?.title || '',
                    propertyAddress: project?.property_address || '',
                    propertyDescription: project?.property_description || '',
                    purchasePrice: project?.purchase_price || '',
                    closingDate: project?.closing_date || '',
                    propertyPhotoUrl: project?.property_photo_url || project?.cover_photo_url || ''
                  },
                  tableOfContentsData: { sections: [], totalDocuments: 0, generatedAt: new Date().toISOString() },
                  documents: [],
                  passwordProtected: false
                });
                if (result?.data?.client_slug && !clientSlug) setClientSlug(result.data.client_slug);
              } catch (e) {
                // Non-blocking; user can publish later if needed
              }
            } catch (err) {
              console.error('Assign client failed', err);
              // Keep optimistic UI; publishing binder will fully link client dashboards
            }
          }}
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Updated {formatDate(project.updated_at)}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleProjectSelect}
            disabled={loading}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Open →
          </Button>
        </div>
      </div>

      {/* Click away to close menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};