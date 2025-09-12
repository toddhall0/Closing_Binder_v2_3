import React from 'react';
import { Button } from '../common/ui/Button';

export const ClientBinderCard = ({ binder, onOpen }) => {
  const title = binder?.title || binder?.projects?.title || 'Closing Binder';
  const description = binder?.property_description || binder?.projects?.property_description || '';
  const address = binder?.property_address || binder?.projects?.property_address || '';

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const s = String(dateString).trim();
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const dt = new Date(y, mo - 1, d);
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return s;
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
    if (!isFinite(numeric)) return String(value);
    return numeric.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const getPurchasePrice = () => {
    const c = binder?.cover_page_data || {};
    return c.purchasePrice ?? c.purchase_price ?? binder?.purchase_price ?? binder?.projects?.purchase_price ?? null;
  };

  const getClosingDate = () => {
    const c = binder?.cover_page_data || {};
    return c.closingDate ?? c.closing_date ?? binder?.closing_date ?? binder?.projects?.closing_date ?? null;
  };

  const getImageUrl = () => {
    const candidates = [
      binder?.cover_photo_url,
      binder?.property_photo_url,
      binder?.projects?.cover_photo_url,
      binder?.projects?.property_photo_url,
      binder?.cover_page_data?.propertyPhotoUrl,
      binder?.projects?.cover_page_data?.propertyPhotoUrl
    ];
    for (const url of candidates) {
      if (url && typeof url === 'string' && url.trim().length > 0) return url.trim();
    }
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <div className={`relative bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors`}>
      {/* Cover Photo */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-32 object-cover rounded-t-lg"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`w-full h-32 flex items-center justify-center rounded-t-lg ${imageUrl ? 'hidden' : ''}`}>
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">{title}</h3>
        </div>

        {/* Optional Description/Address */}
        {(description || address) && (
          <div className="text-sm text-gray-600">
            {description && <div className="line-clamp-2">{description}</div>}
            {!description && address && <div className="line-clamp-2">{address}</div>}
          </div>
        )}

        {/* Purchase Price and Closing Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="text-sm text-gray-700">
            <div className="font-semibold">Purchase Price:</div>
            <div>{formatPrice(getPurchasePrice())}</div>
          </div>
          <div className="text-sm text-gray-700">
            <div className="font-semibold">Closing Date:</div>
            <div>{getClosingDate() ? formatDate(getClosingDate()) : '—'}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
          <Button size="sm" variant="ghost" onClick={onOpen}>Open →</Button>
        </div>
      </div>
    </div>
  );
};

export default ClientBinderCard;


