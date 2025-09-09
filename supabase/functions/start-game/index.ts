import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const LETTER_FREQ: Record<string, number> = {
  a: 9, b: 2, c: 2, d: 3, e: 15, f: 2, g: 2, h: 2, i: 8, j: 1, k: 1, l: 5,
  m: 3, n: 6, o: 6, p: 2, q: 1, r: 6, s: 6, t: 6, u: 6, v: 2, w: 1, x: 1, y: 1, z: 1,
  '*': 2
};

function shuffle(array: any[], seed: string) {
  // Simple seeded random using room ID
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum += seed.charCodeAt(i);
  }
  
  const random = () => {
    const x = Math.sin(seedNum++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

    const { roomId } = await req.json();

    // Verify user is owner
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('owner_id', user.id)
      .single();

    if (roomError || !room) {
      throw new Error('Room not found or not owner');
    }

    // Get players
    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select('user_id')
      .eq('room_id', roomId);

    if (playersError || !players || players.length !== 2) {
      throw new Error('Need exactly 2 players');
    }

    // Create bag
    const bag: { letter: string; is_joker: boolean }[] = [];
    for (const [letter, count] of Object.entries(LETTER_FREQ)) {
      for (let i = 0; i < count; i++) {
        bag.push({
          letter,
          is_joker: letter === '*'
        });
      }
    }

    // Shuffle bag using room ID as seed
    shuffle(bag, roomId);

    // Insert bag into database
    const bagInserts = bag.map((tile, index) => ({
      room_id: roomId,
      seq: index + 1,
      letter: tile.letter,
      is_joker: tile.is_joker
    }));

    const { error: bagError } = await supabase
      .from('bag_tiles')
      .insert(bagInserts);

    if (bagError) {
      throw new Error('Failed to create bag');
    }

    // Deal 6 tiles to each player
    let tileIndex = 1;
    for (const player of players) {
      const rackInserts = [];
      for (let i = 0; i < 6; i++) {
        rackInserts.push({
          room_id: roomId,
          user_id: player.user_id,
          bag_seq: tileIndex,
          idx: i
        });
        
        // Mark tile as drawn
        await supabase
          .from('bag_tiles')
          .update({ 
            drawn_by: player.user_id,
            drawn_at: new Date().toISOString()
          })
          .eq('room_id', roomId)
          .eq('seq', tileIndex);
        
        tileIndex++;
      }

      const { error: rackError } = await supabase
        .from('rack_tiles')
        .insert(rackInserts);

      if (rackError) {
        throw new Error('Failed to deal tiles');
      }
    }

    // Update room state
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ state: 'active' })
      .eq('id', roomId);

    if (updateError) {
      throw new Error('Failed to update room state');
    }

    // Log start event
    await supabase
      .from('events')
      .insert({
        room_id: roomId,
        user_id: user.id,
        type: 'start',
        payload: { players: players.map(p => p.user_id) }
      });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in start-game:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});