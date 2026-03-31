import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
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
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      -- Create the 'ads' bucket if it doesn't exist
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('ads', 'ads', true) 
      ON CONFLICT (id) DO UPDATE SET public = true;
      
      -- Ensure policies are applied so admins can insert and public can read
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'objects' AND policyname = 'Public Access for Ads'
          ) THEN
              CREATE POLICY "Public Access for Ads" ON storage.objects 
              FOR SELECT USING (bucket_id = 'ads');
          END IF;
          
          IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'objects' AND policyname = 'Allow Uploads for Ads'
          ) THEN
              CREATE POLICY "Allow Uploads for Ads" ON storage.objects 
              FOR INSERT WITH CHECK (bucket_id = 'ads');
          END IF;
          
          IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'objects' AND policyname = 'Allow Updates for Ads'
          ) THEN
              CREATE POLICY "Allow Updates for Ads" ON storage.objects 
              FOR UPDATE USING (bucket_id = 'ads');
          END IF;
          
          IF NOT EXISTS (
              SELECT FROM pg_policies 
              WHERE tablename = 'objects' AND policyname = 'Allow Deletes for Ads'
          ) THEN
              CREATE POLICY "Allow Deletes for Ads" ON storage.objects 
              FOR DELETE USING (bucket_id = 'ads');
          END IF;
      END
      $$;
    `
  });
  console.log("Bucket Migration result:", { data, error });
}

run();
