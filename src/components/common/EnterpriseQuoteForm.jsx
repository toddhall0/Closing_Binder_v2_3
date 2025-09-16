import React, { useState } from 'react';

const EnterpriseQuoteForm = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    expectedUsers: '',
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In a real app, submit to backend/email here
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-4">Thanks! We received your request.</h1>
        <p className="text-gray-600">Our team will reach out within one business day to discuss your needs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Enterprise Quote Request</h1>
      <p className="text-gray-600 mb-8">Tell us a bit about your team and requirements. We'll follow up with pricing options.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input name="company" value={form.company} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Number of Users</label>
          <input name="expectedUsers" value={form.expectedUsers} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={4} value={form.notes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black" placeholder="Tell us about integrations, SSO, white-label, or other needs" />
        </div>
        <div className="pt-2">
          <button type="submit" className="bg-black text-white px-5 py-2 rounded font-semibold">Request Quote</button>
        </div>
      </form>
    </div>
  );
};

export default EnterpriseQuoteForm;



