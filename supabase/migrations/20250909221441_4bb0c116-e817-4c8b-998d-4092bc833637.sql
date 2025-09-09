-- Create game invitations table
CREATE TABLE public.game_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '10 minutes'),
  
  UNIQUE(from_user_id, to_user_id, room_id)
);

-- Enable RLS
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations they sent or received"
ON public.game_invitations
FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create invitations they send"
ON public.game_invitations
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update invitations they received"
ON public.game_invitations
FOR UPDATE
USING (auth.uid() = to_user_id);

-- Enable realtime
ALTER TABLE public.game_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invitations;