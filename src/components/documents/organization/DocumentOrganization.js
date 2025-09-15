// ===============================
// FILE: src/components/documents/organization/DocumentOrganization.js
// Using @dnd-kit instead of react-beautiful-dnd for React 18+ compatibility
// ===============================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { documentOrganizationService } from '../../../utils/documentOrganizationService';

// Sortable Document Item Component
const SortableDocumentItem = ({ document, sectionIndex, docIndex, isDragging, sectionNumber, onRename, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center p-3 mb-2 border rounded-lg transition-colors cursor-default ${
        isDragging 
          ? 'bg-white shadow-lg border-blue-300' 
          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
      }`}
    >
      <div className="flex items-center space-x-2 flex-1">
        <span
          ref={setActivatorNodeRef}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Drag to move"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </span>
        <span className="text-sm font-medium text-gray-500 min-w-[40px]">
          {sectionNumber ? `${sectionNumber}.${docIndex + 1}` : `${docIndex + 1}`}
        </span>
        <span className="text-sm font-medium text-gray-900 truncate">
          {document.display_name || document.name}
        </span>
        <span className="text-xs text-gray-400 ml-2">
          (ID: {document.id})
        </span>
      </div>
      <div className="flex items-center space-x-2" onPointerDown={(e) => { e.stopPropagation(); }} onMouseDown={(e) => { e.stopPropagation(); }}>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = window.prompt('Rename document', document.display_name || document.name || '');
            if (!next) return;
            try {
              await documentOrganizationService.renameDocument(document.id, next);
              if (onRename) onRename();
            } catch (e) {
              alert(e.message || 'Rename failed');
            }
          }}
          className="px-2 py-1 text-xs bg-black text-white rounded border border-black hover:bg-gray-800"
        >
          Edit
        </button>
        <button
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!window.confirm('Delete this document?')) return;
            try {
              await documentOrganizationService.deleteDocument(document.id);
              if (onDelete) onDelete();
            } catch (e) {
              alert('Delete not implemented in service');
            }
          }}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded border border-red-600 hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Droppable Section Component
const DroppableSection = ({ section, sectionIndex, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: section.id ? `section-${section.id}` : 'unorganized',
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 min-h-[80px] transition-colors ${
        isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-white border-2 border-transparent'
      }`}
    >
      {children}
    </div>
  );
};

const DocumentOrganization = ({ projectId, onStructureChange }) => {
  const [structure, setStructure] = useState({ sections: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingSection, setCreatingSection] = useState({ show: false, parentId: null, type: 'section' });
  const [editingSection, setEditingSection] = useState({ id: null, name: '' });
  const [newSectionName, setNewSectionName] = useState('');
  const [activeId, setActiveId] = useState(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Organize data for rendering with proper hierarchy
  const organizedData = useMemo(() => {
    if (!structure.sections || !structure.documents) {
      return { rootSections: [], unorganizedDocs: [] };
    }

    // Create document map
    const documentMap = new Map();
    structure.documents.forEach(doc => {
      const sectionId = doc.section_id || 'unorganized';
      if (!documentMap.has(sectionId)) {
        documentMap.set(sectionId, []);
      }
      documentMap.get(sectionId).push(doc);
    });

    // Build hierarchical structure
    const sectionsById = new Map();
    structure.sections.forEach(section => {
      sectionsById.set(section.id, {
        ...section,
        children: [],
        documents: (documentMap.get(section.id) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      });
    });

    // Organize parent-child relationships
    const rootSections = [];
    structure.sections.forEach(section => {
      const sectionData = sectionsById.get(section.id);
      if (section.parent_section_id && sectionsById.has(section.parent_section_id)) {
        sectionsById.get(section.parent_section_id).children.push(sectionData);
      } else {
        rootSections.push(sectionData);
      }
    });

    // Sort sections
    rootSections.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    rootSections.forEach(section => {
      section.children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    const unorganizedDocs = (documentMap.get('unorganized') || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return { rootSections, unorganizedDocs };
  }, [structure]);

  const loadStructure = useCallback(async () => {
    if (!projectId) return;
    
    try {
      console.log('Loading structure for project:', projectId);
      setLoading(true);
      setError(null);
      
      const data = await documentOrganizationService.getProjectStructure(projectId);
      console.log('Structure loaded:', data);
      
      setStructure(data);
      
      if (onStructureChange && data) {
        onStructureChange(data);
      }
      
    } catch (err) {
      console.error('Error loading structure:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, onStructureChange]);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log('No drop target');
      return;
    }

    console.log('Drag ended - Active:', active.id, 'Over:', over.id);

    try {
      setError(null);
      
      // Handle drop on section droppable area
      if (over.id.startsWith('section-')) {
        const sectionId = over.id.replace('section-', '');
        console.log('Moving document', active.id, 'to section', sectionId);
        await documentOrganizationService.moveDocumentToSection(active.id, sectionId);
        await loadStructure();
      }
      // Handle drop on unorganized area
      else if (over.id === 'unorganized') {
        console.log('Moving document', active.id, 'to unorganized');
        await documentOrganizationService.moveDocumentToSection(active.id, null);
        await loadStructure();
      }
      // Handle reordering within same container (document dropped on another document)
      else if (active.id !== over.id) {
        console.log('Potential reorder - Active:', active.id, 'Over:', over.id);
        
        // Find the sections that contain these documents
        const findDocumentSection = (docId) => {
          // Check unorganized first
          if (organizedData.unorganizedDocs.find(doc => doc.id === docId)) {
            return null;
          }
          
          // Check all sections and subsections
          for (const section of organizedData.rootSections) {
            if (section.documents.find(doc => doc.id === docId)) {
              return section.id;
            }
            if (section.children) {
              for (const subsection of section.children) {
                if (subsection.documents.find(doc => doc.id === subsection)) {
                  return subsection.id;
                }
              }
            }
          }
          return null;
        };

        const activeDocSection = findDocumentSection(active.id);
        const overDocSection = findDocumentSection(over.id);
        
        console.log('Active doc section:', activeDocSection, 'Over doc section:', overDocSection);
        
        if (activeDocSection === overDocSection) {
          console.log('Reordering within same section');
          
          // Get the documents in this section/container
          let documents;
          if (activeDocSection === null) {
            documents = [...organizedData.unorganizedDocs];
          } else {
            const section = organizedData.rootSections.find(s => s.id === activeDocSection) ||
                          organizedData.rootSections.flatMap(s => s.children || []).find(s => s.id === activeDocSection);
            documents = [...(section?.documents || [])];
          }
          
          // Find current positions
          const activeIndex = documents.findIndex(doc => doc.id === active.id);
          const overIndex = documents.findIndex(doc => doc.id === over.id);
          
          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            // Reorder the documents array
            const reorderedDocs = arrayMove(documents, activeIndex, overIndex);
            
            // Update sort order in database
            const updates = reorderedDocs.map((doc, index) => ({
              documentId: doc.id,
              newSortOrder: index
            }));
            
            await documentOrganizationService.batchUpdateDocumentOrder(updates);
            await loadStructure();
          }
        } else {
          console.log('Documents in different sections, no reorder needed');
        }
      }
      else {
        console.log('Same document, no action needed');
      }
    } catch (err) {
      console.error('Error during drag operation:', err);
      setError(`Failed to move document: ${err.message}`);
    }
  };

  // Get currently dragging document for overlay
  const activeDocument = useMemo(() => {
    if (!activeId) return null;
    
    const allDocuments = [
      ...organizedData.unorganizedDocs,
      ...organizedData.rootSections.flatMap(section => {
        const docs = [...section.documents];
        if (section.children) {
          section.children.forEach(child => {
            docs.push(...child.documents);
          });
        }
        return docs;
      })
    ];
    
    return allDocuments.find(doc => doc.id === activeId);
  }, [activeId, organizedData]);

  const handleCreateSection = useCallback(async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    try {
      setError(null);
      const sectionData = {
        project_id: projectId,
        name: newSectionName.trim(),
        parent_section_id: creatingSection.parentId,
        section_type: creatingSection.type,
        sort_order: 0
      };

      await documentOrganizationService.createSection(sectionData);
      setNewSectionName('');
      setCreatingSection({ show: false, parentId: null, type: 'section' });
      await loadStructure();
    } catch (err) {
      console.error('Error creating section:', err);
      setError(`Failed to create section: ${err.message}`);
    }
  }, [newSectionName, creatingSection, projectId, loadStructure]);

  const handleEditSection = useCallback(async (e) => {
    e.preventDefault();
    if (!editingSection.name.trim()) return;

    try {
      setError(null);
      await documentOrganizationService.updateSection(editingSection.id, {
        name: editingSection.name.trim()
      });
      setEditingSection({ id: null, name: '' });
      await loadStructure();
    } catch (err) {
      console.error('Error updating section:', err);
      setError(`Failed to update section: ${err.message}`);
    }
  }, [editingSection, loadStructure]);

  const handleDeleteSection = useCallback(async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section? Documents in this section will be moved to unorganized.')) {
      return;
    }

    try {
      setError(null);
      await documentOrganizationService.deleteSection(sectionId);
      await loadStructure();
    } catch (err) {
      console.error('Error deleting section:', err);
      setError(`Failed to delete section: ${err.message}`);
    }
  }, [loadStructure]);

  // Render section with hierarchy support
  const renderSection = (section, index, level = 0, parentNumber = '') => {
    const sectionNumber = level === 0 ? index + 1 : `${parentNumber}.${index + 1}`;
    
    return (
      <div key={section.id} className={`border border-gray-200 rounded-lg mb-4 ${level > 0 ? 'ml-6' : ''}`}>
        {/* Section Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {editingSection.id === section.id ? (
              <form onSubmit={handleEditSection} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  autoFocus
                />
                <button type="submit" className="p-1 text-green-600 hover:text-green-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingSection({ id: null, name: '' })}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <h3 className="font-medium text-gray-900">
                {sectionNumber}. {section.name} 
                <span className="text-sm text-gray-500 ml-2">
                  ({section.documents.length} docs{section.children && section.children.length > 0 ? `, ${section.children.length} subsections` : ''})
                </span>
              </h3>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {level === 0 && (
              <button
                onClick={() => setCreatingSection({ show: true, parentId: section.id, type: 'subsection' })}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Add subsection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setEditingSection({ id: section.id, name: section.name })}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteSection(section.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete section"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Documents Drop Zone */}
        <DroppableSection
          section={section}
          sectionIndex={index}
        >
          {section.documents.length === 0 ? (
            <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded">
              Drop documents here
            </div>
          ) : (
            <SortableContext items={section.documents.map(doc => doc.id)} strategy={verticalListSortingStrategy}>
              {section.documents.map((document, docIndex) => (
                <SortableDocumentItem
                  key={document.id}
                  document={document}
                  sectionIndex={index}
                  docIndex={docIndex}
                  isDragging={activeId === document.id}
                  sectionNumber={sectionNumber}
                  onRename={loadStructure}
                  onDelete={loadStructure}
                />
              ))}
            </SortableContext>
          )}
        </DroppableSection>

        {/* Render Subsections */}
        {section.children && section.children.length > 0 && (
          <div className="border-t border-gray-200 pt-2">
            {section.children.map((childSection, childIndex) => 
              renderSection(childSection, childIndex, level + 1, sectionNumber)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-gray-600">Loading organization...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-600 mb-2">{error}</p>
        <button 
          onClick={loadStructure} 
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { rootSections, unorganizedDocs } = organizedData;

  // Get all document IDs for DnD context
  const allDocumentIds = [
    ...unorganizedDocs.map(doc => doc.id),
    ...rootSections.flatMap(section => section.documents.map(doc => doc.id))
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Document Organization</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {structure.sections.length} sections, {structure.documents.length} documents
            </div>
            <button
              onClick={() => setCreatingSection({ show: true, parentId: null, type: 'section' })}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Section</span>
            </button>
          </div>
        </div>

        {/* Create Section Form */}
        {creatingSection.show && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Create New {creatingSection.type === 'subsection' ? 'Subsection' : 'Section'}
            </h3>
            <form onSubmit={handleCreateSection} className="flex items-center space-x-3">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder={`Enter ${creatingSection.type} name`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newSectionName.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingSection({ show: false, parentId: null, type: 'section' });
                  setNewSectionName('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {structure.documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-600">Upload documents first to organize them into sections</p>
          </div>
        ) : (
          <SortableContext items={allDocumentIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {/* Render Sections using hierarchical structure */}
              {rootSections.map((section, index) => renderSection(section, index))}

              {/* Unorganized Documents - Always show, even when empty */}
              <div className="bg-white border border-gray-200 rounded-lg sticky bottom-0">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-medium text-gray-900">Unorganized Documents ({unorganizedDocs.length})</h3>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <DroppableSection section={{ id: null }}>
                    {unorganizedDocs.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded">
                        Drop documents here to remove them from sections
                      </div>
                    ) : (
                      unorganizedDocs.slice(0, 3).map((document, index) => (
                        <SortableDocumentItem
                          key={document.id}
                          document={document}
                          sectionIndex={null}
                          docIndex={index}
                          isDragging={activeId === document.id}
                          sectionNumber={null}
                          onRename={loadStructure}
                          onDelete={loadStructure}
                        />
                      ))
                    )}
                  </DroppableSection>
                  {unorganizedDocs.length > 3 && (
                    <div className="px-4 py-2 text-xs text-gray-500">Scroll to view more…</div>
                  )}
                </div>
              </div>
            </div>
          </SortableContext>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeDocument ? (
            <div className="flex items-center p-3 bg-white border border-blue-300 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
                <span className="text-sm font-medium text-gray-900">
                  {activeDocument.name}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default DocumentOrganization;