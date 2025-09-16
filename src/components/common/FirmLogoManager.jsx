import React from 'react';
import { supabase } from '../../lib/supabase';

const FirmLogoManager = () => {
  const [uploading, setUploading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState(null);
  const [ownerId, setOwnerId] = React.useState(null);
  const [bucketUsed, setBucketUsed] = React.useState('documents');

  React.useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setOwnerId(user.id);
      const base = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const url = `${base}/storage/v1/object/public/${bucketUsed}/firm-logos/${user.id}/logo.png`;
      setLogoUrl(url);
    };
    init();
  }, [bucketUsed]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;
    setUploading(true);
    try {
      const bucketsToTry = ['documents', 'images', 'public', 'public-assets'];
      const path = `firm-logos/${ownerId}/logo.png`;
      let lastError = null;
      for (const b of bucketsToTry) {
        // attempt with provided mime
        let { error } = await supabase.storage.from(b).upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/png'
        });
        // retry as octet-stream on mime restriction
        if (error && /mime type/i.test(String(error.message || ''))) {
          const retry = await supabase.storage.from(b).upload(path, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/octet-stream'
          });
          error = retry.error;
        }
        if (!error) {
          setBucketUsed(b);
          const base = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const url = `${base}/storage/v1/object/public/${b}/firm-logos/${ownerId}/logo.png`;
          setLogoUrl(`${url}?t=${Date.now()}`);
          lastError = null;
          break;
        } else {
          lastError = error;
        }
      }
      if (lastError) throw lastError;
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeLogo = async () => {
    if (!ownerId) return;
    if (!window.confirm('Remove firm logo?')) return;
    try {
      const path = `firm-logos/${ownerId}/logo.png`;
      await supabase.storage.from(bucketUsed).remove([path]);
      setLogoUrl(null);
    } catch (err) {
      alert(err.message || 'Remove failed');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt="Firm Logo" className="max-h-12 object-contain" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
        ) : (
          <span className="text-xs text-gray-400">No Logo</span>
        )}
      </div>
      <label className={`px-2 py-1 text-xs rounded border border-black bg-black text-white hover:bg-gray-800 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
        {uploading ? 'Uploading…' : (logoUrl ? 'Replace Logo' : 'Upload Logo')}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </label>
      {logoUrl && (
        <button className="px-2 py-1 text-xs rounded border border-red-600 bg-red-600 text-white hover:bg-red-700" onClick={removeLogo}>Remove</button>
      )}
    </div>
  );
};

export default FirmLogoManager;


