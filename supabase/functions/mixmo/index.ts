import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Token d\'authentification manquant');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseServiceRole.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { roomId } = await req.json();
    
    if (!roomId) {
      throw new Error('ID de salle manquant');
    }

    // Check if room exists and is active
    const { data: room, error: roomError } = await supabaseServiceRole
      .from('rooms')
      .select('state')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      throw new Error('Salle non trouvée');
    }

    if (room.state !== 'active') {
      throw new Error('La partie n\'est pas active');
    }

    // Check if there are exactly 2 players and the caller is in the room
    const { data: players, error: playersError } = await supabaseServiceRole
      .from('room_players')
      .select('user_id')
      .eq('room_id', roomId);

    if (playersError || !players || players.length !== 2) {
      throw new Error('Il faut exactement 2 joueurs dans la salle');
    }

    const callerInRoom = players.some(p => p.user_id === user.id);
    if (!callerInRoom) {
      throw new Error('Vous n\'êtes pas dans cette salle');
    }

    const otherPlayer = players.find(p => p.user_id !== user.id);
    if (!otherPlayer) {
      throw new Error('Aucun adversaire trouvé');
    }

    // Check if ONLY the caller has an empty rack
    const { data: callerRack, error: callerRackError } = await supabaseServiceRole
      .from('rack_tiles')
      .select('bag_seq', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (callerRackError) {
      throw new Error('Erreur lors de la vérification du chevalet');
    }

    if ((callerRack as any) > 0) {
      throw new Error('Votre chevalet doit être vide pour faire un MIXMO');
    }

    // Check if there are at least 4 tiles in the bag
    const { data: availableTiles, error: bagError } = await supabaseServiceRole
      .from('bag_tiles')
      .select('seq, letter, is_joker')
      .eq('room_id', roomId)
      .is('drawn_by', null)
      .order('seq', { ascending: true })
      .limit(4);

    if (bagError) {
      throw new Error('Erreur lors de la vérification du sac');
    }

    if (!availableTiles || availableTiles.length < 4) {
      throw new Error('Il faut au moins 4 tuiles dans le sac pour un MIXMO');
    }

    // Get current max idx for both players
    const { data: callerMaxIdx } = await supabaseServiceRole
      .from('rack_tiles')
      .select('idx')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .order('idx', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: otherMaxIdx } = await supabaseServiceRole
      .from('rack_tiles')
      .select('idx')
      .eq('room_id', roomId)
      .eq('user_id', otherPlayer.user_id)
      .order('idx', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextCallerIdx = (callerMaxIdx?.idx ?? -1) + 1;
    const nextOtherIdx = (otherMaxIdx?.idx ?? -1) + 1;

    // Distribute 2 tiles to caller and 2 tiles to other player
    const tilesForCaller = availableTiles.slice(0, 2);
    const tilesForOther = availableTiles.slice(2, 4);

    // Insert tiles into racks
    const callerRackInserts = tilesForCaller.map((tile, index) => ({
      room_id: roomId,
      user_id: user.id,
      bag_seq: tile.seq,
      idx: nextCallerIdx + index
    }));

    const otherRackInserts = tilesForOther.map((tile, index) => ({
      room_id: roomId,
      user_id: otherPlayer.user_id,
      bag_seq: tile.seq,
      idx: nextOtherIdx + index
    }));

    // Execute all database operations
    await Promise.all([
      // Insert tiles into caller's rack
      supabaseServiceRole.from('rack_tiles').insert(callerRackInserts),
      // Insert tiles into other player's rack
      supabaseServiceRole.from('rack_tiles').insert(otherRackInserts),
      // Mark tiles as drawn
      supabaseServiceRole
        .from('bag_tiles')
        .update({ 
          drawn_by: user.id, 
          drawn_at: new Date().toISOString() 
        })
        .in('seq', availableTiles.map(t => t.seq))
    ]);

    // Log the MIXMO event
    await supabaseServiceRole
      .from('events')
      .insert({
        room_id: roomId,
        user_id: user.id,
        type: 'mixmo',
        payload: {
          distributed_tiles: availableTiles.map(t => t.seq),
          caller_tiles: tilesForCaller.map(t => t.seq),
          other_player_tiles: tilesForOther.map(t => t.seq)
        }
      });

    console.log(`MIXMO executed by ${user.id} in room ${roomId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'MIXMO effectué avec succès'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mixmo function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});