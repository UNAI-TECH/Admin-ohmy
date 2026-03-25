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
  console.log("Starting migration...");
  
  // 1. Create exec_sql if not exists (Security Definer)
  const createRpc = await supabaseAdmin.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE query;
        RETURN json_build_object('status', 'success');
      EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('status', 'error', 'message', SQLERRM);
      END;
      $$;
    `
  }).catch(e => ({ error: e }));

  if (createRpc.error) {
    console.log("Note: exec_sql RPC creation failed (might already exist or permission issue). Proceeding anyway.");
  }

  // 2. Apply Schema Changes
  const res = await supabaseAdmin.rpc('exec_sql', {
    query: `
      -- Fix Post table
      ALTER TABLE public."Post" 
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PUBLISHED',
      ADD COLUMN IF NOT EXISTS "scheduledFor" timestamp with time zone;

      -- Create Feedback table
      CREATE TABLE IF NOT EXISTS public."Feedback" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        "userId" UUID REFERENCES public."User"(id),
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        status TEXT DEFAULT 'pending'
      );

      -- Optional: Ensure RLS is enabled and public can insert (for feedback)
      ALTER TABLE public."Feedback" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Enable insert for all" ON public."Feedback" FOR INSERT WITH CHECK (true);
      CREATE POLICY "Enable select for authenticated" ON public."Feedback" FOR SELECT USING (auth.role() = 'authenticated');

      NOTIFY pgrst, 'reload schema';
    `
  });
  
  console.log("Migration result:", JSON.stringify(res, null, 2));
}

run();
