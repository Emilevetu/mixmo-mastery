-- Add policy to allow users to search for other users' profiles (read-only access to public info)
CREATE POLICY "Users can search other users by pseudo or email" ON public.profiles
    FOR SELECT USING (true);