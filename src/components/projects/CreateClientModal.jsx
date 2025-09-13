import React, { useEffect, useState } from 'react';
import { Modal } from '../common/ui/Modal';
import { Button } from './Button';
import ClientsService from '../../services/clientsService';

const CreateClientModal = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [representative, setRepresentative] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [web, setWeb] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setRepresentative('');
      setAddressLine1('');
      setCity('');
      setStateCode('');
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
      const combinedAddress = [addressLine1, [city, stateCode].filter(Boolean).join(', ')].filter(Boolean).join(', ');
      const details = {
        company: null,
        representative: representative || null,
        address_line1: addressLine1 || null,
        city: city || null,
        state: stateCode || null,
        address: combinedAddress || null,
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input type="text" value={addressLine1} onChange={(e)=>setAddressLine1(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="123 Main St" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input type="text" value={city} onChange={(e)=>setCity(e.target.value)} className="block w-full px-3 py-2 border border-gray-300" placeholder="City" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select value={stateCode} onChange={(e)=>setStateCode(e.target.value)} className="block w-full px-3 py-2 border border-gray-300">
            <option value="">Select state…</option>
            {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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


