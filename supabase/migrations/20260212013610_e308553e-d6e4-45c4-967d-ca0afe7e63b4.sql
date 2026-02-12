
-- Add banner and screenshots columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS screenshot_urls text[] DEFAULT '{}';

-- Create storage bucket for profile images (banners + screenshots)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('profile-images', 'profile-images', true, 2097152)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can view
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Users can upload to their own folder
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own images
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
