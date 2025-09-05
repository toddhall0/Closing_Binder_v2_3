// ===============================
// FILE: src/utils/documentOrganizationService.js
// Enhanced service with hierarchical section management
// ===============================

import { supabase } from '../lib/supabase';

export const documentOrganizationService = {
  // Get complete project structure with sections and documents
  async getProjectStructure(projectId) {
    try {
      console.log('Getting project structure for:', projectId);

      // Get all sections for this project
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        throw new Error(sectionsError.message);
      }

      // Get all documents for this project
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        throw new Error(documentsError.message);
      }

      const result = {
        sections: sections || [],
        documents: documents || []
      };

      console.log('Loaded structure:', {
        sections: result.sections.length,
        documents: result.documents.length
      });

      return result;
    } catch (error) {
      console.error('Error in getProjectStructure:', error);
      throw error;
    }
  },

  // Move a document to a different section
  async moveDocumentToSection(documentId, sectionId) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          section_id: sectionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Error moving document:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in moveDocumentToSection:', error);
      throw error;
    }
  },

  // Update document sort order within a section
  async updateDocumentSortOrder(documentId, newSortOrder) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          sort_order: newSortOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating document sort order:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateDocumentSortOrder:', error);
      throw error;
    }
  },

  // Create a new section or subsection
  async createSection(sectionData) {
    try {
      // Get the next sort order for this level
      let sortOrder = 0;
      let query = supabase
        .from('sections')
        .select('sort_order')
        .eq('project_id', sectionData.project_id);

      if (sectionData.parent_section_id === null || sectionData.parent_section_id === undefined) {
        query = query.is('parent_section_id', null);
      } else {
        query = query.eq('parent_section_id', sectionData.parent_section_id);
      }

      const { data: existingSections, error: countError } = await query
        .order('sort_order', { ascending: false })
        .limit(1);

      if (!countError && existingSections && existingSections.length > 0) {
        sortOrder = existingSections[0].sort_order + 1;
      }

      const { data, error } = await supabase
        .from('sections')
        .insert({
          ...sectionData,
          sort_order: sortOrder,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating section:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in createSection:', error);
      throw error;
    }
  },

  // Update section details
  async updateSection(sectionId, updateData) {
    try {
      const { data, error } = await supabase
        .from('sections')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating section:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateSection:', error);
      throw error;
    }
  },

  // Update section sort order
  async updateSectionSortOrder(sectionId, newSortOrder) {
    try {
      const { data, error } = await supabase
        .from('sections')
        .update({
          sort_order: newSortOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating section sort order:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateSectionSortOrder:', error);
      throw error;
    }
  },

  // Delete a section (moves documents to unorganized)
  async deleteSection(sectionId) {
    try {
      // First, move all documents in this section to unorganized
      const { error: documentsError } = await supabase
        .from('documents')
        .update({
          section_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('section_id', sectionId);

      if (documentsError) {
        console.error('Error moving documents from deleted section:', documentsError);
        throw new Error(documentsError.message);
      }

      // Move any subsections to be root sections
      const { error: subsectionsError } = await supabase
        .from('sections')
        .update({
          parent_section_id: null,
          section_type: 'section',
          updated_at: new Date().toISOString()
        })
        .eq('parent_section_id', sectionId);

      if (subsectionsError) {
        console.error('Error moving subsections from deleted section:', subsectionsError);
        throw new Error(subsectionsError.message);
      }

      // Finally, delete the section
      const { error: deleteError } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (deleteError) {
        console.error('Error deleting section:', deleteError);
        throw new Error(deleteError.message);
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteSection:', error);
      throw error;
    }
  },

  // Get section hierarchy for a specific section
  async getSectionHierarchy(sectionId) {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .or(`id.eq.${sectionId},parent_section_id.eq.${sectionId}`)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching section hierarchy:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSectionHierarchy:', error);
      throw error;
    }
  },

  // Batch update document positions within a section (for reordering)
  async batchUpdateDocumentOrder(documentUpdates) {
    try {
      const promises = documentUpdates.map(({ documentId, newSortOrder }) =>
        supabase
          .from('documents')
          .update({
            sort_order: newSortOrder,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
      );

      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result.error) {
          console.error('Error in batch update:', result.error);
          throw new Error(result.error.message);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in batchUpdateDocumentOrder:', error);
      throw error;
    }
  },

  // Reorder documents within the same section
  async reorderDocumentsInSection(sectionId, orderedDocumentIds) {
    try {
      const updates = orderedDocumentIds.map((documentId, index) => ({
        documentId,
        newSortOrder: index
      }));

      return await this.batchUpdateDocumentOrder(updates);
    } catch (error) {
      console.error('Error in reorderDocumentsInSection:', error);
      throw error;
    }
  },

  // Get document statistics for a project
  async getProjectDocumentStats(projectId) {
    try {
      // Get document count
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('id, section_id')
        .eq('project_id', projectId);

      // Get section counts
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_type')
        .eq('project_id', projectId);

      if (docError || sectionsError) {
        console.error('Error fetching stats:', { docError, sectionsError });
        throw new Error(docError?.message || sectionsError?.message);
      }

      const stats = {
        totalDocuments: documents ? documents.length : 0,
        organizedDocuments: documents ? documents.filter(d => d.section_id).length : 0,
        unorganizedDocuments: documents ? documents.filter(d => !d.section_id).length : 0,
        totalSections: sections ? sections.filter(s => s.section_type === 'section').length : 0,
        totalSubsections: sections ? sections.filter(s => s.section_type === 'subsection').length : 0
      };

      return stats;
    } catch (error) {
      console.error('Error in getProjectDocumentStats:', error);
      throw error;
    }
  }
};

export default documentOrganizationService;