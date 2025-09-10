import React from 'react';
import { Button } from '../common/ui/Button';

export const ClientBinderCard = ({ binder, onOpen }) => {
  const title = binder.title || binder.projects?.title || 'Closing Binder';
  const address = binder.property_address || binder.projects?.property_address || '';
  const coverPhoto = binder.cover_photo_url || binder.property_photo_url || binder.projects?.cover_photo_url || binder.projects?.property_photo_url || '';
  const publishedAt = binder.published_at ? new Date(binder.published_at) : null;

  return (
    <div className="border border-gray-200 bg-white rounded-lg overflow-hidden hover:shadow transition-shadow">
      {coverPhoto ? (
        <img src={coverPhoto} alt={title} className="w-full h-36 object-cover" onError={(e)=>{ e.target.style.display='none'; }} />
      ) : (
        <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">No image</div>
      )}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{title}</h3>
        {address && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{address}</p>}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-gray-500">
            {publishedAt ? `Published ${publishedAt.toLocaleDateString()}` : ''}
          </div>
          <Button size="sm" onClick={onOpen}>Open</Button>
        </div>
      </div>
    </div>
  );
};

export default ClientBinderCard;


