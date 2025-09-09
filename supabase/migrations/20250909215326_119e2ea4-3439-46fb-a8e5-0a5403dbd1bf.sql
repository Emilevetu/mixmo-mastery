-- Drop the restrictive SELECT policy and create a better one
DROP POLICY "Users can view rooms they're in" ON rooms;

-- Allow users to view rooms they own OR are players in
CREATE POLICY "Users can view their rooms" 
ON rooms 
FOR SELECT 
USING (
  -- User is the owner
  auth.uid() = owner_id OR
  -- User is a player in the room
  EXISTS (
    SELECT 1 FROM room_players rp 
    WHERE rp.room_id = rooms.id AND rp.user_id = auth.uid()
  )
);