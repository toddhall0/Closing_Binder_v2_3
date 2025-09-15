import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const SupabaseDebug = () => {
  const [config, setConfig] = useState({});
  const [connectionTest, setConnectionTest] = useState('Testing...');

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setConfig({
      url: supabaseUrl,
      keyExists: !!supabaseKey,
      keyPreview: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Missing'
    });

    // Test connection
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setConnectionTest(`Error: ${error.message}`);
      } else {
        setConnectionTest('Connection OK');
      }
    } catch (error) {
      setConnectionTest(`Connection Failed: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">Supabase Config Debug:</h3>
      <div className="text-xs space-y-1">
        <div>
          <strong>URL:</strong> {config.url || 'Missing'}
        </div>
        <div>
          <strong>API Key:</strong> {config.keyExists ? '✅ Present' : '❌ Missing'}
        </div>
        <div>
          <strong>Key Preview:</strong> {config.keyPreview}
        </div>
        <div className="mt-2 p-2 bg-gray-50 rounded">
          <strong>Connection Test:</strong> {connectionTest}
        </div>
      </div>
      
      <button 
        onClick={testConnection}
        className="mt-2 text-xs bg-black text-white px-2 py-1 rounded"
      >
        Test Again
      </button>
    </div>
  );
};

export default SupabaseDebug;