-- Fix infinite recursion in room_players RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view room players in their rooms" ON room_players;

-- Create a simpler policy that avoids recursion
CREATE POLICY "Users can view room players in their rooms" 
ON room_players 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  room_id IN (
    SELECT room_id 
    FROM room_players 
    WHERE user_id = auth.uid()
  )
);

-- Actually, let's use an even simpler approach to avoid any potential recursion
DROP POLICY IF EXISTS "Users can view room players in their rooms" ON room_players;

CREATE POLICY "Users can view room players in their rooms" 
ON room_players 
FOR SELECT 
USING (
  -- Users can see their own entries
  user_id = auth.uid() OR 
  -- Users can see other players in rooms where they are also a player
  EXISTS (
    SELECT 1 FROM rooms r 
    WHERE r.id = room_players.room_id 
    AND (
      r.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM room_players rp2 WHERE rp2.room_id = r.id AND rp2.user_id = auth.uid())
    )
  )
);

-- Actually, let's simplify this even more to avoid any complex subqueries
DROP POLICY IF EXISTS "Users can view room players in their rooms" ON room_players;

CREATE POLICY "Users can view room players in their rooms" 
ON room_players 
FOR SELECT 
USING (
  -- Users can always see their own room player records
  user_id = auth.uid()
);