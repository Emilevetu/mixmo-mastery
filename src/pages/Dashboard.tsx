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

interface NormalizedFriend {
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  direction: 'incoming' | 'outgoing';
  other: {
    id: string;
    pseudo: string;
    email: string | null;
  };
}

const Dashboard = () => {
  const [friendInput, setFriendInput] = useState('');
  const [normalizedFriends, setNormalizedFriends] = useState<NormalizedFriend[]>([]);
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

    // Fetch friendships where I'm the requester
    const { data: outgoingFriends } = await supabase
      .from('friends')
      .select(`
        user_id,
        friend_id,
        status,
        profiles:friend_id (
          id,
          pseudo,
          email
        )
      `)
      .eq('user_id', user.id);

    // Fetch friendships where I'm the receiver  
    const { data: incomingFriends } = await supabase
      .from('friends')
      .select(`
        user_id,
        friend_id,
        status,
        profiles:user_id (
          id,
          pseudo,
          email
        )
      `)
      .eq('friend_id', user.id);

    // Normalize both into a single structure
    const normalized: NormalizedFriend[] = [];

    // Add outgoing friendships
    if (outgoingFriends) {
      outgoingFriends.forEach((friendship: any) => {
        normalized.push({
          requester_id: friendship.user_id,
          receiver_id: friendship.friend_id,
          status: friendship.status,
          direction: 'outgoing',
          other: {
            id: friendship.profiles.id,
            pseudo: friendship.profiles.pseudo,
            email: friendship.profiles.email
          }
        });
      });
    }

    // Add incoming friendships (avoid duplicates for accepted friends)
    if (incomingFriends) {
      incomingFriends.forEach((friendship: any) => {
        const isDuplicate = normalized.some(f => 
          f.other.id === friendship.profiles.id && 
          f.status === 'accepted' && 
          friendship.status === 'accepted'
        );

        if (!isDuplicate) {
          normalized.push({
            requester_id: friendship.user_id,
            receiver_id: friendship.friend_id,
            status: friendship.status,
            direction: 'incoming',
            other: {
              id: friendship.profiles.id,
              pseudo: friendship.profiles.pseudo,
              email: friendship.profiles.email
            }
          });
        }
      });
    }

    setNormalizedFriends(normalized);
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

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`)
        .single();

      if (existingFriendship) {
        toast({
          title: "Demande déjà existante",
          description: "Une demande d'ami existe déjà avec cet utilisateur",
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
    if (!user) return;

    // Update the existing friendship to accepted
    await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', user.id);

    // Pas besoin de créer une seconde ligne; une seule relation suffit


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
          // Ajoute uniquement l'hôte; l'ami rejoindra via le lien et s'ajoutera lui-même (RLS oblige)
          await supabase
            .from('room_players')
            .insert([
              { room_id: room.id, user_id: user.id, seat: 1 }
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

  // Group friends by status for display
  const acceptedFriends = normalizedFriends.filter(f => f.status === 'accepted');
  const pendingIncoming = normalizedFriends.filter(f => f.status === 'pending' && f.direction === 'incoming');
  const pendingOutgoing = normalizedFriends.filter(f => f.status === 'pending' && f.direction === 'outgoing');

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

        {/* Pending Incoming Friend Requests */}
        {pendingIncoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Demandes d'amis reçues ({pendingIncoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingIncoming.map((friend) => (
                  <div
                    key={friend.other.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {friend.other.pseudo?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{friend.other.pseudo}</p>
                        <p className="text-sm text-muted-foreground">
                          {friend.other.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptFriend(friend.other.id)}
                      >
                        Accepter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mes amis ({acceptedFriends.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acceptedFriends.length === 0 && pendingOutgoing.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun ami pour le moment
                </p>
              ) : (
                <>
                  {acceptedFriends.map((friend) => (
                    <div
                      key={friend.other.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          {friend.other.pseudo?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{friend.other.pseudo}</p>
                          <p className="text-sm text-muted-foreground">
                            {friend.other.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Ami</Badge>
                        <Button
                          size="sm"
                          onClick={() => createRoom(friend.other.id)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Jouer
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pendingOutgoing.map((friend) => (
                    <div
                      key={friend.other.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                          {friend.other.pseudo?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{friend.other.pseudo}</p>
                          <p className="text-sm text-muted-foreground">
                            {friend.other.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Demande envoyée</Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;