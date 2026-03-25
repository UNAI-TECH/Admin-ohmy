import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve('.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const res = await supabaseAdmin.rpc('exec_sql', {
    query: `
      ALTER TABLE public."Post" 
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PUBLISHED',
      ADD COLUMN IF NOT EXISTS "scheduledFor" timestamp with time zone;
      
      NOTIFY pgrst, 'reload schema';
    `
  });
  console.log("Migration result:", res);
}

run();
