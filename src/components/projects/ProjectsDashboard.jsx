// src/components/projects/ProjectsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Button } from './Button';
// Removed unused Input import
import { LoadingSpinner } from './LoadingSpinner';
import { ClientsService } from '../../services/clientsService';
import CreateClientModal from './CreateClientModal';

const ClientSelect = ({ value, onChange }) => {
  const [options, setOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await ClientsService.getClients('');
        if (active) setOptions(data || []);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <div>
      <select
        className="block w-full px-3 py-2 border border-gray-300 h-10"
        value={value || ''}
        onChange={(e)=>onChange(e.target.value)}
      >
        <option value="">All clients</option>
        {options.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {loading && <div className="text-xs text-gray-500 mt-1">Loading...</div>}
    </div>
  );
};



export const ProjectsDashboard = ({ onProjectSelect }) => {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    handleSearch,
    clearError,
    refreshProjects,
    clientId
  } = useProjects();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localFrom, setLocalFrom] = useState('');
  const [localTo, setLocalTo] = useState('');
  const [localClientId, setLocalClientId] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'cards' | 'list'
  const [sortBy, setSortBy] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [localStateFilter, setLocalStateFilter] = useState('');

  // Column widths for resizable table columns (persisted)
  const defaultColumnWidths = React.useMemo(() => ({
    title: 220,
    state: 90,
    client_name: 200,
    buyer_company: 220,
    seller_company: 220,
    price: 140,
    closing_date: 140,
    actions: 140
  }), []);

  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const resizeRef = React.useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('projects_table_column_widths');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setColumnWidths((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('projects_table_column_widths', JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths]);

  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = Number(columnWidths[key]) || Number(defaultColumnWidths[key]) || 120;
    resizeRef.current = { key, startX, startWidth };

    const handleMouseMove = (ev) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const raw = resizeRef.current.startWidth + dx;
      const minWidth = key === 'state' ? 70 : 110;
      const maxWidth = 600;
      const next = Math.max(minWidth, Math.min(maxWidth, Math.round(raw)));
      setColumnWidths((prev) => ({ ...prev, [resizeRef.current.key]: next }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getProjectState = (project) => {
    // Single source of truth precedence:
    // 1) cover_page_data.propertyState
    // 2) projects.property_state
    // 3) parsed from address
    let cpd = project?.cover_page_data;
    if (typeof cpd === 'string') {
      try { cpd = JSON.parse(cpd); } catch(_) { cpd = null; }
    }
    if (cpd && typeof cpd === 'object') {
      const ps1 = (cpd.propertyState || cpd.property_state || '').toString().trim().toUpperCase();
      if (ps1 && /^[A-Z]{2}$/.test(ps1)) return ps1;
    }
    const ps2 = (project?.property_state || '').toString().trim().toUpperCase();
    if (ps2 && /^[A-Z]{2}$/.test(ps2)) return ps2;
    const addr = (project?.property_address || '').toString();
    const m = addr.match(/\b([A-Z]{2})\b/);
    return m ? m[1] : '';
  };

  // Filter projects based on selected state (client-side)
  const filteredProjects = React.useMemo(() => {
    let list = projects;
    if (localStateFilter) {
      list = list.filter((p) => getProjectState(p) === localStateFilter);
    }
    return list;
  }, [projects, localStateFilter]);

  const getClientName = (project) => project?.client_name || '';
  const getBuyerCompany = (project) => {
    try {
      let cpd = project?.cover_page_data;
      if (typeof cpd === 'string') {
        try { cpd = JSON.parse(cpd); } catch (_) { cpd = null; }
      }
      const fromContact = cpd?.contact_info?.buyer?.company;
      return (fromContact || project?.buyer || '').toString();
    } catch (_) {
      return (project?.buyer || '').toString();
    }
  };
  const getSellerCompany = (project) => {
    try {
      let cpd = project?.cover_page_data;
      if (typeof cpd === 'string') {
        try { cpd = JSON.parse(cpd); } catch (_) { cpd = null; }
      }
      const fromContact = cpd?.contact_info?.seller?.company;
      return (fromContact || project?.seller || '').toString();
    } catch (_) {
      return (project?.seller || '').toString();
    }
  };
  const getPrice = (project) => {
    const raw = project?.purchase_price;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const sortedProjects = React.useMemo(() => {
    const list = [...filteredProjects];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'title':
          av = (a.title || '').toLowerCase();
          bv = (b.title || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'address':
          av = (a.property_address || '').toLowerCase();
          bv = (b.property_address || '').toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'state':
          av = getProjectState(a);
          bv = getProjectState(b);
          return av.localeCompare(bv) * dir;
        case 'client_name':
          av = getClientName(a).toLowerCase();
          bv = getClientName(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'buyer_company':
          av = getBuyerCompany(a).toLowerCase();
          bv = getBuyerCompany(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'seller_company':
          av = getSellerCompany(a).toLowerCase();
          bv = getSellerCompany(b).toLowerCase();
          return av.localeCompare(bv) * dir;
        case 'price':
          av = getPrice(a) ?? -Infinity;
          bv = getPrice(b) ?? -Infinity;
          return (av - bv) * dir;
        case 'closing_date':
          av = a.closing_date ? new Date(a.closing_date).getTime() : 0;
          bv = b.closing_date ? new Date(b.closing_date).getTime() : 0;
          return (av - bv) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [filteredProjects, sortBy, sortDir]);

  const groupedForList = React.useMemo(() => {
    if (sortBy !== 'state' && sortBy !== 'client_name' && sortBy !== 'buyer_company' && sortBy !== 'seller_company') return null;
    const groups = [];
    const keyToIndex = new Map();
    for (const p of sortedProjects) {
      let k = '—';
      if (sortBy === 'state') k = getProjectState(p) || '—';
      else if (sortBy === 'client_name') k = getClientName(p) || '—';
      else if (sortBy === 'buyer_company') k = getBuyerCompany(p) || '—';
      else if (sortBy === 'seller_company') k = getSellerCompany(p) || '—';
      if (!keyToIndex.has(k)) {
        keyToIndex.set(k, groups.length);
        groups.push({ key: k, items: [] });
      }
      groups[keyToIndex.get(k)].items.push(p);
    }
    return groups;
  }, [sortedProjects, sortBy]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const ColGroup = () => (
    <colgroup>
      <col style={{ width: columnWidths.title }} />
      <col style={{ width: columnWidths.state }} />
      <col style={{ width: columnWidths.client_name }} />
      <col style={{ width: columnWidths.buyer_company }} />
      <col style={{ width: columnWidths.seller_company }} />
      <col style={{ width: columnWidths.price }} />
      <col style={{ width: columnWidths.closing_date }} />
      <col style={{ width: columnWidths.actions }} />
    </colgroup>
  );

  const HeaderCell = ({ label, sortKey, onSort }) => (
    <th
      onClick={onSort ? () => onSort(sortKey) : undefined}
      className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none relative"
    >
      <span className="pr-2">{label}</span>
      <span
        onMouseDown={(e) => startResize(e, sortKey)}
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-gray-300"
        role="separator"
        aria-orientation="vertical"
      />
    </th>
  );

  const TableHeader = () => (
    <thead className="bg-gray-50">
      <tr>
        <HeaderCell label="Title" sortKey="title" onSort={toggleSort} />
        <HeaderCell label="State" sortKey="state" onSort={toggleSort} />
        <HeaderCell label="Client" sortKey="client_name" onSort={toggleSort} />
        <HeaderCell label="Buyer Company" sortKey="buyer_company" onSort={toggleSort} />
        <HeaderCell label="Seller Company" sortKey="seller_company" onSort={toggleSort} />
        <HeaderCell label="Purchase Price" sortKey="price" onSort={toggleSort} />
        <HeaderCell label="Closing Date" sortKey="closing_date" onSort={toggleSort} />
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none relative">
          <span className="pr-2">Actions</span>
          <span
            onMouseDown={(e) => startResize(e, 'actions')}
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-gray-300"
            role="separator"
            aria-orientation="vertical"
          />
        </th>
      </tr>
    </thead>
  );

  useEffect(() => { setLocalClientId(clientId || ''); }, [clientId]);

  // Debounce search and date filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(localSearchTerm, localFrom, localTo, localClientId);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, localFrom, localTo, handleSearch]);

  const handleCreateProject = async (projectData) => {
    setActionLoading(true);
    try {
      const result = await createProject(projectData);
      if (result.success) {
        setIsCreateModalOpen(false);
        // Show success feedback
        setTimeout(() => {
          // Could add a toast notification here
        }, 100);
      }
      return result;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;

    setActionLoading(true);
    try {
      const result = await deleteProject(selectedProject.id);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteDialog = (project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (!actionLoading) {
      setIsDeleteDialogOpen(false);
      setSelectedProject(null);
    }
  };

  const handleRefresh = () => {
    clearError();
    refreshProjects();
  };

  const openProject = (project) => {
    try {
      if (onProjectSelect) onProjectSelect(project);
    } catch {}
    if (project?.id) {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-medium text-gray-900">
                  Closing Binder Projects
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your PDF closing binder projects
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant="secondary"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </Button>
                <Button
                  onClick={() => setIsCreateClientOpen(true)}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
          <div className="sm:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors h-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing From</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 h-10"
              value={localFrom}
              onChange={(e)=>{ const v = e.target.value; setLocalFrom(v); handleSearch(localSearchTerm, v, localTo, localClientId); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing To</label>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 h-10"
              value={localTo}
              onChange={(e)=>{ const v = e.target.value; setLocalTo(v); handleSearch(localSearchTerm, localFrom, v, localClientId); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 h-10"
              value={localStateFilter}
              onChange={(e)=> setLocalStateFilter(e.target.value)}
            >
              <option value="">All states</option>
              {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <ClientSelect value={localClientId} onChange={(v)=>{ setLocalClientId(v); handleSearch(localSearchTerm, localFrom, localTo, v); }} />
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={()=>{ setLocalSearchTerm(''); setLocalFrom(''); setLocalTo(''); setLocalClientId(''); setLocalStateFilter(''); handleSearch('', '', '', ''); }} disabled={loading} size="sm">Clear</Button>
            <Button variant="secondary" onClick={handleRefresh} disabled={loading} size="sm">Refresh</Button>
            <button
              onClick={() => setViewMode((m) => (m === 'cards' ? 'list' : 'cards'))}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 whitespace-nowrap min-w-[110px]"
              disabled={loading}
            >
              {viewMode === 'cards' ? 'List View' : 'Card View'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 text-sm">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {localSearchTerm ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {localSearchTerm 
                ? `No projects match "${localSearchTerm}". Try a different search term.`
                : 'Get started by creating your first closing binder project.'
              }
            </p>
            {!localSearchTerm && (
              <div className="mt-6">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Project
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={onProjectSelect}
                onEdit={handleEditProject}
                onDelete={openDeleteDialog}
                loading={actionLoading && selectedProject?.id === project.id}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!groupedForList && (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <ColGroup />
                  <TableHeader />
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openProject(project)}
                      >
                        <td className="px-4 py-2 text-sm text-gray-900">{project.title || 'Untitled Project'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getProjectState(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getClientName(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getBuyerCompany(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getSellerCompany(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getPrice(project) != null ? getPrice(project).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{project.closing_date ? new Date(project.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>Edit</Button>
                          <Button
                            size="xs"
                            variant="danger"
                            className="ml-2"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(project); }}
                            disabled={actionLoading && selectedProject?.id === project.id}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {groupedForList && groupedForList.map((group) => (
              <div key={group.key} className="overflow-x-auto border border-gray-200 rounded-md">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-800">
                  {sortBy === 'state' ? `State: ${group.key}` : sortBy === 'client_name' ? `Client: ${group.key}` : sortBy === 'buyer_company' ? `Buyer Company: ${group.key}` : `Seller Company: ${group.key}`}
                </div>
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <ColGroup />
                  <TableHeader />
                  <tbody className="bg-white divide-y divide-gray-100">
                    {group.items.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openProject(project)}
                      >
                        <td className="px-4 py-2 text-sm text-gray-900">{project.title || 'Untitled Project'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getProjectState(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getClientName(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getBuyerCompany(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getSellerCompany(project) || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{getPrice(project) != null ? getPrice(project).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{project.closing_date ? new Date(project.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>Edit</Button>
                          <Button
                            size="xs"
                            variant="danger"
                            className="ml-2"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(project); }}
                            disabled={actionLoading && selectedProject?.id === project.id}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Results Info */}
        {!loading && filteredProjects.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
        loading={actionLoading}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onCreated={(client) => {
          try {
            const id = client?.id || '';
            setLocalClientId(id);
            handleSearch(localSearchTerm, localFrom, localTo, id);
          } catch {}
        }}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProject}
        onUpdateProject={async (id, updates) => {
          setActionLoading(true);
          try {
            const result = await updateProject(id, updates);
            return result;
          } finally {
            setActionLoading(false);
          }
        }}
        loading={actionLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${selectedProject?.title}"? This action cannot be undone and will remove all associated documents and sections.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};