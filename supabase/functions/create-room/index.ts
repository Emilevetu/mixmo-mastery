import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { friend } = await req.json();

    // Find friend by pseudo or email
    const { data: friendProfile, error: friendError } = await supabase
      .from('profiles')
      .select('id')
      .or(`pseudo.eq.${friend},email.eq.${friend}`)
      .single();

    if (friendError || !friendProfile) {
      throw new Error('Friend not found');
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        owner_id: user.id,
        state: 'waiting'
      })
      .select()
      .single();

    if (roomError) {
      throw new Error('Failed to create room');
    }

    // Add players to room
    const { error: playersError } = await supabase
      .from('room_players')
      .insert([
        { room_id: room.id, user_id: user.id, seat: 1 },
        { room_id: room.id, user_id: friendProfile.id, seat: 2 }
      ]);

    if (playersError) {
      throw new Error('Failed to add players');
    }

    return new Response(
      JSON.stringify({ roomId: room.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-room:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});