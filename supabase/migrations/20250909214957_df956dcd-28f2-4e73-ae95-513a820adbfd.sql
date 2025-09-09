-- Create a security definer function to check if user is in a room
CREATE OR REPLACE FUNCTION public.user_is_in_room(target_room_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.room_players 
    WHERE room_id = target_room_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update the room_players policy to use the function
DROP POLICY IF EXISTS "Users can view room players in their rooms" ON room_players;

CREATE POLICY "Users can view room players in their rooms" 
ON room_players 
FOR SELECT 
USING (
  -- Users can see their own entries
  user_id = auth.uid() OR 
  -- Users can see other players in rooms where they are also a player
  public.user_is_in_room(room_id)
);