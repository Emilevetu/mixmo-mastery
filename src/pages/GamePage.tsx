import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import { Board } from '@/components/Board';
import { Rack } from '@/components/Rack';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, RotateCcw, Zap } from 'lucide-react';

const GamePage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    myRack, 
    myBoard, 
    opponentBoard, 
    bagCount, 
    mixmoEnabled,
    gameState,
    setRoomId,
    updateRack,
    updateBoard,
    setBagCount,
    setMixmoEnabled,
    setGameState
  } = useGameStore();
  const { toast } = useToast();
  
  const [opponent, setOpponent] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [playersCount, setPlayersCount] = useState(0);

  // Ensure current user is registered in the room (RLS-friendly)
  const ensureJoined = async () => {
    if (!user || !roomId) return;

    // Check if already in room
    const { data: existing } = await supabase
      .from('room_players')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      // Determine seat (1 if empty, else 2)
      const { data: current } = await supabase
        .from('room_players')
        .select('seat')
        .eq('room_id', roomId);
      const seat = current && current.length >= 1 ? 2 : 1;
      await supabase.from('room_players').insert({ room_id: roomId, user_id: user.id, seat });
    }

    // Mark as connected
    await supabase
      .from('room_players')
      .update({ is_connected: true, last_seen: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);
  };

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/dashboard');
      return;
    }

    setRoomId(roomId);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      await ensureJoined();

      // Setup real-time subscriptions
      channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rack_tiles',
            filter: `room_id=eq.${roomId}`
          },
          () => fetchGameState()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'board_tiles',
            filter: `room_id=eq.${roomId}`
          },
          () => fetchGameState()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_players',
            filter: `room_id=eq.${roomId}`
          },
          () => {
            fetchPlayers();
            fetchOpponent();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
          },
          () => fetchRoomInfo()
        )
        .subscribe();

      fetchGameState();
      fetchOpponent();
      fetchPlayers();
      fetchRoomInfo();
    };

    setup();

    return () => {
      if (user && roomId) {
        supabase
          .from('room_players')
          .update({ is_connected: false, last_seen: new Date().toISOString() })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      }
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const fetchGameState = async () => {
    if (!user || !roomId) return;

    // Fetch my rack
    const { data: rackData } = await supabase
      .from('rack_tiles')
      .select(`
        bag_seq,
        idx,
        bag_tiles (
          letter,
          is_joker
        )
      `)
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .order('idx');

    if (rackData) {
      const rack = rackData.map((item: any) => ({
        bagSeq: item.bag_seq,
        letter: item.bag_tiles.letter,
        isJoker: item.bag_tiles.is_joker
      }));
      updateRack(rack);
    }

    // Fetch my board
    const { data: boardData } = await supabase
      .from('board_tiles')
      .select(`
        bag_seq,
        x,
        y,
        as_letter,
        locked,
        bag_tiles (
          letter,
          is_joker
        )
      `)
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (boardData) {
      const board = boardData.map((item: any) => ({
        bagSeq: item.bag_seq,
        letter: item.bag_tiles.letter,
        isJoker: item.bag_tiles.is_joker,
        asLetter: item.as_letter,
        x: item.x,
        y: item.y,
        locked: item.locked
      }));
      updateBoard(board);
    }

    // Fetch bag count
    const { count } = await supabase
      .from('bag_tiles')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .is('drawn_by', null);

    if (count !== null) setBagCount(count);
  };

  const fetchOpponent = async () => {
    if (!user || !roomId) return;

    const { data } = await supabase
      .from('room_players')
      .select(`
        user_id,
        profiles (
          pseudo
        )
      `)
      .eq('room_id', roomId)
      .neq('user_id', user.id)
      .maybeSingle();

    setOpponent(data);
  };

  const fetchPlayers = async () => {
    if (!user || !roomId) return;

    const { data } = await supabase
      .from('room_players')
      .select(`
        user_id,
        seat,
        is_connected,
        profiles (
          pseudo
        )
      `)
      .eq('room_id', roomId)
      .order('seat');

    if (data) {
      setPlayers(data);
      setPlayersCount(data.length);
    }
  };

  const fetchRoomInfo = async () => {
    if (!roomId) return;

    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (data) {
      setRoomInfo(data);
      setGameState(data.state);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !user || !roomId) return;

    const tileId = active.id.toString();
    const bagSeq = parseInt(tileId.replace(/^(rack-|board-)/, ''));

    if (over.id === 'game-board') {
      // Handle dropping on board
      try {
        // For now, place tile at a default position until we implement precise positioning
        // We'll use the center of the visible area
        const gridX = Math.floor(Math.random() * 10) - 5; // Random position for testing
        const gridY = Math.floor(Math.random() * 10) - 5;

        // Check if position is already occupied
        const existingTile = myBoard.find(t => t.x === gridX && t.y === gridY);
        if (existingTile) {
          // Try adjacent positions
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const newX = gridX + dx;
              const newY = gridY + dy;
              if (!myBoard.find(t => t.x === newX && t.y === newY)) {
                await placeTileOnBoard(bagSeq, newX, newY, tileId);
                return;
              }
            }
          }
          toast({
            title: "Zone occupée",
            description: "Impossible de placer la tuile, zone occupée",
            variant: "destructive",
          });
          return;
        }

        await placeTileOnBoard(bagSeq, gridX, gridY, tileId);
        
      } catch (error) {
        console.error('Error dropping tile:', error);
        toast({
          title: "Erreur",
          description: "Impossible de placer la tuile",
          variant: "destructive",
        });
      }
    } else if (over.id === 'player-rack') {
      // Handle returning to rack
      try {
        await returnTileToRack(bagSeq);
      } catch (error) {
        console.error('Error returning tile to rack:', error);
      }
    }
  };

  const placeTileOnBoard = async (bagSeq: number, gridX: number, gridY: number, tileId: string) => {
    // Get tile info from rack
    const rackTile = myRack.find(t => t.bagSeq === bagSeq);
    if (!rackTile) return;

    // Insert tile on board
    await supabase
      .from('board_tiles')
      .insert({
        room_id: roomId,
        user_id: user.id,
        bag_seq: bagSeq,
        x: gridX,
        y: gridY,
        as_letter: rackTile.letter,
        locked: false
      });

    // Remove tile from rack if it came from rack
    if (tileId.startsWith('rack-')) {
      await supabase
        .from('rack_tiles')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .eq('bag_seq', bagSeq);
    }

    fetchGameState();
  };

  const returnTileToRack = async (bagSeq: number) => {
    // Remove from board
    await supabase
      .from('board_tiles')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .eq('bag_seq', bagSeq);

    // Add back to rack if not already there
    const isInRack = myRack.some(t => t.bagSeq === bagSeq);
    if (!isInRack) {
      await supabase
        .from('rack_tiles')
        .insert({
          room_id: roomId,
          user_id: user.id,
          bag_seq: bagSeq,
          idx: myRack.length
        });
    }
    
    fetchGameState();
  };

  const handleRecall = async () => {
    if (!user || !roomId) return;

    await supabase
      .from('board_tiles')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .eq('locked', false);

    fetchGameState();
  };

  const handleMixmo = async () => {
    if (!mixmoEnabled || !roomId) return;

    try {
      // This would call the Edge Function
      const { data, error } = await supabase.functions.invoke('mixmo', {
        body: { roomId }
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "MIXMO !",
          description: "Nouvelles lettres distribuées !",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer le MIXMO",
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    if (!user || !roomId || !roomInfo || roomInfo.owner_id !== user.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('start-game', {
        body: { roomId }
      });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Partie commencée !",
          description: "Les tuiles ont été distribuées.",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de commencer la partie",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              Joueurs: {playersCount}/2
            </Badge>
            <Badge variant="outline">
              Sac: {bagCount} lettres
            </Badge>
            {opponent && (
              <Badge>
                vs {opponent.profiles?.pseudo}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {gameState === 'waiting' && roomInfo?.owner_id === user?.id && playersCount === 2 && (
              <Button
                onClick={handleStartGame}
                className="bg-primary hover:bg-primary/90"
              >
                Commencer la partie
              </Button>
            )}
            {gameState === 'waiting' && roomInfo?.owner_id !== user?.id && (
              <Badge variant="secondary">
                En attente de l'hôte...
              </Badge>
            )}
            {gameState === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRecall}
                  disabled={myBoard.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rappel
                </Button>
                <Button
                  onClick={handleMixmo}
                  disabled={!mixmoEnabled}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  MIXMO
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-140px)]">
          {/* Main Board */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle>Plateau de jeu</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="w-full h-full min-h-[400px] max-h-[calc(100vh-200px)]">
                  <DndContext onDragEnd={handleDragEnd}>
                    <Board
                      tiles={myBoard}
                      onTileDrop={(x, y, tileId) => {
                        console.log('Tile dropped:', { x, y, tileId });
                      }}
                    />
                  </DndContext>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Players in Room */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Joueurs dans la salle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {players.map((player, index) => (
                  <div key={player.user_id} className="flex items-center justify-between text-sm">
                    <span>{player.profiles?.pseudo || `Joueur ${index + 1}`}</span>
                    <div className="flex items-center gap-1">
                      {player.user_id === user?.id && (
                        <Badge variant="secondary" className="text-xs">Vous</Badge>
                      )}
                      {roomInfo?.owner_id === player.user_id && (
                        <Badge variant="outline" className="text-xs">Hôte</Badge>
                      )}
                      <div className={`w-2 h-2 rounded-full ${player.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                ))}
                {playersCount < 2 && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    En attente d'un second joueur...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Rack */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mon chevalet</CardTitle>
              </CardHeader>
              <CardContent>
                <Rack tiles={myRack} />
              </CardContent>
            </Card>

            {/* Opponent Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {opponent?.profiles?.pseudo || 'Adversaire'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 text-center text-muted-foreground text-sm">
                  Aperçu du plateau adverse
                  <br />
                  {opponentBoard.length} tuiles posées
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;