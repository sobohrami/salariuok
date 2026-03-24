require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    const { data, error } = await supabase.from('salary_entries').select('*').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connected! (Table is empty or RLS on)');
      } else {
        console.error('❌ Supabase error:', error.message);
        console.log('Error details:', error);
      }
    } else {
      console.log('✅ Connection successful! Data:', data);
    }
  } catch (err) {
    console.error('❌ Connection exception:', err.message);
  }
}

testConnection();
