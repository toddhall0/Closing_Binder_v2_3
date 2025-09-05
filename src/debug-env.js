console.log('Environment Variables Debug:');
console.log('SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('SUPABASE_KEY exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);
console.log('SUPABASE_KEY preview:', process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
console.log('All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
