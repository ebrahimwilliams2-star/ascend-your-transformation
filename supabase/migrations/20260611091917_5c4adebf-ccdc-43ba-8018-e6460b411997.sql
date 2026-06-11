
-- Restrict SECURITY DEFINER functions: only authenticated users may execute the
-- profile lookup helpers; internal helpers should not be callable via the API.
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_gymbros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_gymbros() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage: enforce owner-only UPDATE on progress-photos bucket
DROP POLICY IF EXISTS "Users update own progress photos" ON storage.objects;
CREATE POLICY "Users update own progress photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
