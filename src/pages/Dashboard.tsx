import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Play, LogOut, Users } from 'lucide-react';

interface Friend {
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  profiles: {
    id: string;
    pseudo: string;
    email: string;
  };
}

const Dashboard = () => {
  const [friendInput, setFriendInput] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { user, signOut } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchProfile();
    fetchFriends();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
  };

  const fetchFriends = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('friends')
      .select(`
        *,
        profiles:friend_id (
          id,
          pseudo,
          email
        )
      `)
      .eq('user_id', user.id);
    
    if (data) setFriends(data as any);
  };

  const addFriend = async () => {
    if (!friendInput.trim() || !user) return;
    
    setLoading(true);
    try {
      // Find friend by pseudo or email
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`pseudo.eq.${friendInput},email.eq.${friendInput}`)
        .single();

      if (!friendProfile) {
        toast({
          title: "Utilisateur non trouvé",
          description: "Aucun utilisateur avec ce pseudo ou email",
          variant: "destructive",
        });
        return;
      }

      if (friendProfile.id === user.id) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas vous ajouter vous-même",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendProfile.id,
          status: 'pending'
        });

      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Demande envoyée",
          description: "Demande d'ami envoyée avec succès",
        });
        setFriendInput('');
        fetchFriends();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptFriend = async (friendId: string) => {
    await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user?.id);

    // Create reciprocal friendship
    await supabase
      .from('friends')
      .insert({
        user_id: user?.id,
        friend_id: friendId,
        status: 'accepted'
      });

    fetchFriends();
    toast({
      title: "Ami accepté",
      description: "Vous êtes maintenant amis !",
    });
  };

  const createRoom = async (friendId: string) => {
    if (!user) return;

    try {
      const { data: room } = await supabase
        .from('rooms')
        .insert({
          owner_id: user.id,
          state: 'waiting'
        })
        .select()
        .single();

      if (room) {
        // Add both players to room
        await supabase
          .from('room_players')
          .insert([
            { room_id: room.id, user_id: user.id, seat: 1 },
            { room_id: room.id, user_id: friendId, seat: 2 }
          ]);

        navigate(`/room/${room.id}`);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la salle",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!profile) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">🎮 MIXMO</h1>
            <p className="text-muted-foreground">
              Bienvenue, {profile.pseudo || 'Joueur'} !
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Add Friend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Ajouter un ami
            </CardTitle>
            <CardDescription>
              Recherchez par pseudo ou email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Pseudo ou email..."
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFriend()}
              />
              <Button onClick={addFriend} disabled={loading}>
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Friends List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mes amis ({friends.filter(f => f.status === 'accepted').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun ami pour le moment
                </p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.friend_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {friend.profiles.pseudo?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{friend.profiles.pseudo}</p>
                        <p className="text-sm text-muted-foreground">
                          {friend.profiles.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={friend.status === 'accepted' ? 'default' : 'secondary'}
                      >
                        {friend.status === 'accepted' ? 'Ami' : 'En attente'}
                      </Badge>
                      {friend.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => createRoom(friend.friend_id)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Jouer
                        </Button>
                      )}
                      {friend.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => acceptFriend(friend.friend_id)}
                        >
                          Accepter
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;