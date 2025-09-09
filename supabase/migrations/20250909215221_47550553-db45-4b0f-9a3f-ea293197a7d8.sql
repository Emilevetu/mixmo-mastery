-- Allow owners to view their rooms (fix 403 on POST /rooms?select=*)
CREATE POLICY IF NOT EXISTS "Owners can view rooms they own"
ON rooms
FOR SELECT
USING (auth.uid() = owner_id);