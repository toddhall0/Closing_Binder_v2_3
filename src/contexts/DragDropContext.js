import React, { createContext, useContext, useState, useCallback } from 'react';
import { documentOrganizationService } from '../utils/documentOrganizationService';

const DragDropContext = createContext();

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

export const DragDropProvider = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = useCallback((item) => {
    setIsDragging(true);
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(async (result) => {
    setIsDragging(false);
    setDraggedItem(null);

    if (!result.destination) {
      return; // Item was dropped outside a droppable area
    }

    const { draggableId, source, destination } = result;

    // If item was dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    try {
      // Parse the dragged item ID and type
      const [itemType, itemId] = draggableId.split('-');
      
      // Parse destination information
      const [destType, destId] = destination.droppableId.split('-');

      if (itemType === 'document') {
        // Moving a document
        const newSectionId = destType === 'section' ? destId : null;
        await documentOrganizationService.updateDocumentOrder(
          itemId,
          newSectionId,
          destination.index
        );
      } else if (itemType === 'section') {
        // Moving a section
        const newParentId = destType === 'section' ? destId : null;
        await documentOrganizationService.updateSectionOrder(
          itemId,
          destination.index,
          newParentId
        );
      }

      // Return success for the parent component to refresh data
      return { success: true, itemType, itemId, destination };
    } catch (error) {
      console.error('Error handling drag end:', error);
      throw error;
    }
  }, []);

  const value = {
    isDragging,
    draggedItem,
    handleDragStart,
    handleDragEnd
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};