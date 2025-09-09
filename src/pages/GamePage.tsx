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

  useEffect(() => {
    if (!user || !roomId) {
      navigate('/dashboard');
      return;
    }

    setRoomId(roomId);
    
    // Setup real-time subscriptions
    const channel = supabase
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
      .subscribe();

    fetchGameState();
    fetchOpponent();

    return () => {
      supabase.removeChannel(channel);
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
      .single();

    setOpponent(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !user || !roomId) return;

    const tileId = active.id.toString();
    const bagSeq = parseInt(tileId.replace('rack-', ''));

    if (over.id === 'game-board') {
      // Handle dropping on board
      // This would need more sophisticated coordinate calculation
      console.log('Drop on board:', tileId);
    } else if (over.id === 'player-rack') {
      // Handle returning to rack
      await supabase
        .from('board_tiles')
        .delete()
        .eq('room_id', roomId)
        .eq('bag_seq', bagSeq);
      
      fetchGameState();
    }
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
              Sac: {bagCount} lettres
            </Badge>
            {opponent && (
              <Badge>
                vs {opponent.profiles?.pseudo}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
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