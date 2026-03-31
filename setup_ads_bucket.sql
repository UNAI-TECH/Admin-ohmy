-- Create the 'ads' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('ads', 'ads', true, now(), now())
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public read access policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for Ads'
    ) THEN
        CREATE POLICY "Public Access for Ads" ON storage.objects 
        FOR SELECT USING (bucket_id = 'ads');
    END IF;
END
$$;

-- Ensure authenticated user upload access policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Allow Auth Uploads for Ads'
    ) THEN
        CREATE POLICY "Allow Auth Uploads for Ads" ON storage.objects 
        FOR INSERT WITH CHECK (bucket_id = 'ads' AND auth.role() = 'authenticated');
    END IF;
END
$$;

-- Ensure authenticated user delete/update access policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Allow Auth Modify for Ads'
    ) THEN
        CREATE POLICY "Allow Auth Modify for Ads" ON storage.objects 
        FOR UPDATE USING (bucket_id = 'ads' AND auth.role() = 'authenticated');
        
        CREATE POLICY "Allow Auth Delete for Ads" ON storage.objects 
        FOR DELETE USING (bucket_id = 'ads' AND auth.role() = 'authenticated');
    END IF;
END
$$;
