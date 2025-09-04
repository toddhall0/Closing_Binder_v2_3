// ===============================
// FILE: src/components/documents/organization/DroppableSection.js
// Fixed version without custom context dependency
// ===============================

import React, { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import DraggableDocument from './DraggableDocument';

const DroppableSection = ({ 
  section, 
  index, 
  onCreateSubsection,
  onRename,
  onDelete,
  onRenameDocument,
  onDeleteDocument,
  showNumbering = true,
  level = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showContextMenu, setShowContextMenu] = useState(false);

  const handleRename = async () => {
    if (editName.trim() && editName !== section.name) {
      try {
        await onRename(section.id, editName.trim());
        setIsEditing(false);
      } catch (error) {
        console.error('Error renaming section:', error);
      }
    } else {
      setIsEditing(false);
      setEditName(section.name);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(section.name);
    }
  };

  const hasContent = (section.documents && section.documents.length > 0) || 
                    (section.children && section.children.length > 0);

  return (
    <Draggable 
      draggableId={`section-${section.id}`} 
      index={index}
      isDragDisabled={level === 0} // Disable dragging for top-level sections for now
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden
            transition-all duration-200
            ${snapshot.isDragging ? 'shadow-lg border-gray-400' : ''}
            ${level > 0 ? 'ml-6' : ''}
          `}
        >
          {/* Section Header */}
          <div
            className={`
              flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200
              hover:bg-gray-100 transition-colors
              ${level === 0 ? 'bg-gray-100' : ''}
            `}
          >
            <div className="flex items-center space-x-3 flex-1">
              {/* Drag Handle (only for subsections) */}
              {level > 0 && (
                <div 
                  {...provided.dragHandleProps}
                  className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}

              {/* Collapse/Expand Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                disabled={!hasContent}
              >
                {hasContent ? (
                  <svg 
                    className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <div className="w-4 h-4" />
                )}
              </button>

              {/* Section Icon */}
              <div className={level === 0 ? 'text-black' : 'text-gray-600'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v4m8-4v4" />
                </svg>
              </div>

              {/* Section Title */}
              <div className="flex items-center space-x-2 flex-1">
                {showNumbering && section.displayNumber && (
                  <span className={`text-sm font-semibold ${level === 0 ? 'text-black' : 'text-gray-700'}`}>
                    {section.displayNumber}
                  </span>
                )}
                
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                    autoFocus
                  />
                ) : (
                  <h3 className={`font-semibold ${level === 0 ? 'text-black' : 'text-gray-800'} truncate`}>
                    {section.name}
                  </h3>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>

              {showContextMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowContextMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Rename
                  </button>
                  {level === 0 && (
                    <button
                      onClick={() => {
                        onCreateSubsection(section.id);
                        setShowContextMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Add Subsection
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this section and all its contents?')) {
                        onDelete(section.id);
                      }
                      setShowContextMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section Content */}
          {!isCollapsed && (
            <div className="p-4">
              {/* Documents Droppable Area */}
              <Droppable droppableId={`section-${section.id}`} type="DOCUMENT">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      min-h-[40px] rounded-lg transition-colors
                      ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'border-2 border-dashed border-transparent'}
                      ${section.documents && section.documents.length === 0 ? 'border-gray-200 bg-gray-50 flex items-center justify-center py-8' : ''}
                    `}
                  >
                    {section.documents && section.documents.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        Drop documents here or upload new files
                      </p>
                    ) : (
                      section.documents?.map((document, docIndex) => (
                        <DraggableDocument
                          key={document.id}
                          document={document}
                          index={docIndex}
                          onRename={onRenameDocument}
                          onDelete={onDeleteDocument}
                          showNumbering={showNumbering}
                        />
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Subsections */}
              {section.children && section.children.length > 0 && (
                <div className="mt-4 space-y-4">
                  {section.children.map((child, childIndex) => (
                    <DroppableSection
                      key={child.id}
                      section={child}
                      index={childIndex}
                      level={level + 1}
                      onCreateSubsection={onCreateSubsection}
                      onRename={onRename}
                      onDelete={onDelete}
                      onRenameDocument={onRenameDocument}
                      onDeleteDocument={onDeleteDocument}
                      showNumbering={showNumbering}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Click outside to close context menu */}
          {showContextMenu && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowContextMenu(false)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default DroppableSection;