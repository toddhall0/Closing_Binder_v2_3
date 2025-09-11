import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';

const CreateClientModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [web, setWeb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setRepresentative('');
      setAddress('');
      setRepPhone('');
      setRepEmail('');
      setWeb('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const details = {
        company: null,
        representative: representative || null,
        address: address || null,
        repPhone: repPhone || null,
        repEmail: repEmail || null,
        web: web || null
      };
      const { data, error } = await ClientsService.createClient({ name, email: null, details });
      if (error) throw error;
      if (onCreated) onCreated(data);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Client" size="lg">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {error && (
          <div className="sm:col-span-12 bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm rounded">{error}</div>
        )}

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="Client name" required />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Representative</label>
          <input type="text" value={representative} onChange={(e)=>setRepresentative(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="Representative" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={address} onChange={(e)=>setAddress(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="Street, City, State ZIP" />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Phone</label>
          <input type="text" value={repPhone} onChange={(e)=>setRepPhone(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="(xxx) xxx-xxxx" />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
          <input type="text" value={web} onChange={(e)=>setWeb(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="https://" />
        </div>
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Rep Email</label>
          <input type="email" value={repEmail} onChange={(e)=>setRepEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="rep@example.com" />
        </div>

        <div className="sm:col-span-12 flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={loading}>Add Client</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateClientModal;


