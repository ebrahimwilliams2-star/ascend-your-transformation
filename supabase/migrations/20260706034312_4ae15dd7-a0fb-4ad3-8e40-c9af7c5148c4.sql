
-- Avatars bucket
CREATE POLICY "avatars_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Message images bucket. Path format: {user_id}/{conversation_id}/{filename}
CREATE POLICY "message_images_read_members" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-images'
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.conversation_id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "message_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "message_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
