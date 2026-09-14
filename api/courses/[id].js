import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client used for course edits from the admin tool.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase server environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async function handler(req, res) {
  // Support browser preflight checks before updates are sent.
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration missing' });
    return;
  }

  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Update the selected course by id.
  try {
    const { id } = req.query;
    const { data, error } = await supabase
      .from('courses_new')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Course update failed:', error);
    res.status(500).json({ error: error.message || 'Unable to update course' });
  }
}
