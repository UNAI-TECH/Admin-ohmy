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
      -- 1. ads table
      CREATE TABLE IF NOT EXISTS public.ads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        description TEXT,
        image_url TEXT,
        redirect_url TEXT,
        advertiser_name TEXT,
        status TEXT DEFAULT 'active', -- active / paused / ended
        cpc_amount NUMERIC DEFAULT 0, -- cost per click
        budget NUMERIC DEFAULT 0,
        total_spent NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );

      -- 2. ad_impressions table
      CREATE TABLE IF NOT EXISTS public.ad_impressions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        ad_id TEXT,
        user_id TEXT,
        viewed_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_ad FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
      );

      -- 3. ad_clicks table
      CREATE TABLE IF NOT EXISTS public.ad_clicks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        ad_id TEXT,
        user_id TEXT,
        cost NUMERIC,
        clicked_at TIMESTAMP DEFAULT now(),
        CONSTRAINT fk_ad_click FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
      );

      -- 4. Indexes
      CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
      CREATE INDEX IF NOT EXISTS idx_ad_clicks_ad_id ON public.ad_clicks(ad_id);
      CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id ON public.ad_impressions(ad_id);

      -- 5. RPC to handle ad click (budget control & total spent)
      CREATE OR REPLACE FUNCTION handle_ad_click(p_ad_id TEXT, p_user_id TEXT)
      RETURNS void AS $$
      DECLARE
          v_cpc NUMERIC;
          v_budget NUMERIC;
          v_total_spent NUMERIC;
      BEGIN
          -- Get current ad info
          SELECT cpc_amount, budget, total_spent 
          INTO v_cpc, v_budget, v_total_spent
          FROM ads 
          WHERE id = p_ad_id AND status = 'active';

          IF NOT FOUND THEN
              RETURN; -- Ad not active or doesn't exist
          END IF;

          -- Insert click record
          INSERT INTO ad_clicks (ad_id, user_id, cost)
          VALUES (p_ad_id, p_user_id, v_cpc);

          -- Update ad spent and status
          UPDATE ads
          SET 
              total_spent = total_spent + v_cpc,
              status = CASE WHEN (total_spent + v_cpc) >= budget THEN 'ended' ELSE status END
          WHERE id = p_ad_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Set realtime replication
      alter publication supabase_realtime add table ads;
      alter publication supabase_realtime add table ad_clicks;
      alter publication supabase_realtime add table ad_impressions;

      NOTIFY pgrst, 'reload schema';
    `
  });
  console.log("Migration result:", { data, error });
}

run();
