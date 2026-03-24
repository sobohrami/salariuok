require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testInsert() {
  console.log('Testing insert into salary_entries (no suspicious column)...');
  const { data, error } = await supabase
    .from('salary_entries')
    .insert([{
      job_title: 'Test Job 2',
      normalized_job_title: 'test-job-2',
      location: 'Test City',
      years_experience: 1,
      salary: 1000,
      median_salary: 1000,
      score: 50
    }]).select();

  if (error) {
    console.error('❌ Insert error:', error.message);
    console.log('Error details:', error);
  } else {
    console.log('✅ Insert successful! Columns present in the record:', Object.keys(data[0]));
  }
}

testInsert();
