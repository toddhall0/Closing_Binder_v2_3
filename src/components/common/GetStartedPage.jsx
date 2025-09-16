import React from 'react';

const GetStartedPage = () => {
  return (
    <div className="bg-white text-black">
      {/* Header (simple, relies on app Header outside) */}

      {/* Hero Section */}
      <section className="py-24 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Professional Closing Binders Made Simple</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organize, compile, and generate professional closing documents for legal and financial
            transactions with our intuitive web-based platform.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/signup" className="bg-black text-white px-6 py-3 rounded font-semibold hover:bg-gray-800">Start 7-Day Free Trial</a>
            <a href="#demo" className="bg-gray-100 text-black px-6 py-3 rounded font-semibold border border-gray-500 hover:bg-gray-200">Watch Demo</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need for Professional Closing Binders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {icon:'📄', title:'Drag & Drop Organization', desc:'Effortlessly organize documents with intuitive drag-and-drop. Create sections and subsections with automatic numbering.'},
              {icon:'🎨', title:'Professional Cover Pages', desc:'Generate branded cover pages with property information, photos, and up to 3 company logos.'},
              {icon:'📋', title:'Dynamic Table of Contents', desc:'Automatically generate clickable table of contents with proper page numbering and formatting.'},
              {icon:'📱', title:'Cloud-Based Access', desc:'Access your closing binders from anywhere with secure cloud storage and real-time sync.'},
              {icon:'🔒', title:'Bank-Level Security', desc:'Enterprise-grade security with industry-standard encryption to protect sensitive documents.'},
              {icon:'⚡', title:'Fast PDF Generation', desc:'Generate complete closing binders in seconds with optimized PDF processing.'}
            ].map((f) => (
              <div key={f.title} className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  <span>{f.icon}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Standard */}
            <div className="border-2 border-gray-200 rounded-lg p-6 text-center flex flex-col">
              <h3 className="text-xl font-bold mb-2">Standard</h3>
              <div className="text-4xl font-extrabold mb-1">$29</div>
              <div className="text-gray-600 mb-6">per month</div>
              <ul className="text-gray-700 mb-6">
                <li className="py-1 border-b border-gray-100">Up to 20 active binders</li>
                <li className="py-1 border-b border-gray-100">Up to 100 documents per binder</li>
                <li className="py-1 border-b border-gray-100">Professional templates</li>
                <li className="py-1">Email support</li>
              </ul>
              <div className="mt-auto">
                <a href="/signup" className="bg-black text-white px-5 py-2 rounded font-semibold inline-block">Choose Standard</a>
              </div>
            </div>

            {/* Professional */}
            <div className="relative border-2 border-black rounded-lg p-6 text-center bg-gray-100 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</div>
              <h3 className="text-xl font-bold mb-2">Professional</h3>
              <div className="text-4xl font-extrabold mb-1">$49</div>
              <div className="text-gray-600 mb-6">per month</div>
              <ul className="text-gray-700 mb-6">
                <li className="py-1 border-b border-gray-100">Unlimited active binders</li>
                <li className="py-1 border-b border-gray-100">Custom logos and branding</li>
                <li className="py-1 border-b border-gray-100">Advanced cover customization</li>
                <li className="py-1">Priority email support</li>
              </ul>
              <div className="mt-auto">
                <a href="/signup" className="bg-black text-white px-5 py-2 rounded font-semibold inline-block">Choose Professional</a>
              </div>
            </div>

            {/* Enterprise */}
            <div className="border-2 border-gray-200 rounded-lg p-6 text-center flex flex-col">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="text-2xl font-extrabold mb-1">Get Quote</div>
              <div className="text-gray-600 mb-6">custom pricing</div>
              <ul className="text-gray-700 mb-6">
                <li className="py-1 border-b border-gray-100">Everything in Professional</li>
                <li className="py-1 border-b border-gray-100">Unlimited documents per binder</li>
                <li className="py-1 border-b border-gray-100">White-label options</li>
                <li className="py-1 border-b border-gray-100">Phone support</li>
                <li className="py-1">Custom integrations & SSO</li>
              </ul>
              <div className="mt-auto">
                <a href="/enterprise-quote" className="bg-black text-white px-5 py-2 rounded font-semibold inline-block">Get a Quote</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black text-white py-16 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-3">Ready to Streamline Your Closing Process?</h2>
          <p className="text-lg text-gray-200 mb-8">Join professionals who trust Closing Binder Pro</p>
          <a href="/signup" className="bg-white text-black px-6 py-3 rounded font-semibold text-lg inline-block hover:bg-gray-100">Start Your 7‑Day Free Trial</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 text-center text-gray-600">
        <div className="max-w-6xl mx-auto px-4">
          <p>© 2025 Closing Binder Pro. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </footer>
    </div>
  );
};

export default GetStartedPage;


