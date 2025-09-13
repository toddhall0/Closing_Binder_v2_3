// src/components/projects/EditProjectModal.jsx
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import ClientsService from '../../services/clientsService';

export const EditProjectModal = ({ isOpen, onClose, project, onUpdateProject, loading = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    property_address: '',
    property_description: '',
    property_state: ''
  });
  const [errors, setErrors] = useState({});
  const [clientTerm, setClientTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        property_address: project.property_address || '',
        property_description: project.property_description || '',
        property_state: project.property_state || ''
      });
      setErrors({});
      setClientId(project.client_id || '');
      setClientTerm(project.client_name || '');
    }
  }, [project]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await ClientsService.getClients(clientTerm || '');
        if (active) setClients(data || []);
      } catch (_) {
        if (active) setClients([]);
      }
    };
    load();
    return () => { active = false; };
  }, [clientTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Project title must be at least 2 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Project title must be less than 100 characters';
    }
    if (formData.property_address && formData.property_address.length > 200) {
      newErrors.property_address = 'Property address must be less than 200 characters';
    }
    if (formData.property_description && formData.property_description.length > 500) {
      newErrors.property_description = 'Property description must be less than 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project) return;
    if (!validateForm()) return;
    const updates = { ...formData };
    // Mirror state into cover_page_data.propertyState so other views read it consistently
    try {
      let existingCover = project?.cover_page_data || {};
      if (typeof existingCover === 'string') {
        try { existingCover = JSON.parse(existingCover); } catch (_) { existingCover = {}; }
      }
      updates.cover_page_data = {
        ...existingCover,
        propertyState: formData.property_state || null
      };
    } catch (_) {
      // Fall back to minimal object
      updates.cover_page_data = { propertyState: formData.property_state || null };
    }
    if (clientId) {
      const selected = clients.find(c => c.id === clientId);
      updates.client_id = clientId;
      updates.client_name = selected?.name || project?.client_name || null;
    } else {
      updates.client_id = null;
      updates.client_name = null;
    }
    const result = await onUpdateProject(project.id, updates);
    if (result.success) handleClose();
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Project Details"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          name="title"
          label="Project Title"
          placeholder="Enter project title..."
          value={formData.title}
          onChange={handleChange}
          error={errors.title}
          required
          disabled={loading}
        />
        <Input
          name="property_address"
          label="Property Address"
          placeholder="Enter property address..."
          value={formData.property_address}
          onChange={handleChange}
          error={errors.property_address}
          disabled={loading}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-900">Property State</label>
          <select
            name="property_state"
            value={formData.property_state}
            onChange={handleChange}
            disabled={loading}
            className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
          >
            <option value="">Select state…</option>
            {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-900">Property Description</label>
          <textarea
            name="property_description"
            rows={4}
            className={`block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-colors resize-none ${errors.property_description ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter property description..."
            value={formData.property_description}
            onChange={handleChange}
            disabled={loading}
          />
          {errors.property_description && (
            <p className="text-sm text-red-600">{errors.property_description}</p>
          )}
        </div>
        {/* Client Assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Assign to Client</label>
          <input
            type="text"
            value={clientTerm}
            onChange={(e)=>setClientTerm(e.target.value)}
            placeholder="Search clients by name..."
            className="block w-full px-3 py-2 border border-gray-300 mb-2"
          />
          <select
            className="block w-full px-3 py-2 border border-gray-300"
            value={clientId || ''}
            onChange={(e)=>setClientId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" className="flex-1" loading={loading} disabled={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProjectModal;


