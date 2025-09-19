import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';
// Email invites moved to dedicated Users modal

const EditClientModal = ({ isOpen, client, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [web, setWeb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Client access controls removed from this modal

  useEffect(() => {
    if (isOpen && client) {
      setName(client.name || '');
      setEmail(client.email || '');
      const d = client.details || {};
      setRepresentative(d.representative || '');
      setAddress(d.address || '');
      setRepPhone(d.repPhone || '');
      setRepEmail(d.repEmail || '');
      setWeb(d.web || '');
      setError(null);
      setLoading(false);
      // Access management removed
    }
  }, [isOpen, client]);

  // Access management handlers removed

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!client?.id) return;
    setLoading(true);
    setError(null);
    try {
      const details = { representative, address, repPhone, repEmail, web };
      const { data, error } = await ClientsService.updateClient(client.id, { name, email, details });
      if (error) throw error;
      if (onSaved) onSaved(data);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Client" size="lg">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {error && (
          <div className="sm:col-span-12 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{error}</div>
        )}

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" required />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Representative</label>
          <input type="text" value={representative} onChange={(e)=>setRepresentative(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={address} onChange={(e)=>setAddress(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Phone</label>
          <input type="text" value={repPhone} onChange={(e)=>setRepPhone(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Email</label>
          <input type="email" value={repEmail} onChange={(e)=>setRepEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
          <input type="text" value={web} onChange={(e)=>setWeb(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" />
        </div>

        {/* Client Access Management removed from this modal */}

        <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditClientModal;


