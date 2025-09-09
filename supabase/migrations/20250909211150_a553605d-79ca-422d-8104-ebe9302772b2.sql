-- Create enum types
CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE room_state AS ENUM ('waiting', 'active', 'finished');
CREATE TYPE event_type AS ENUM ('start', 'draw', 'place', 'unplace', 'mixmo', 'finish');

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    pseudo TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friends table
CREATE TABLE public.friends (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status friend_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

-- Rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    state room_state NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room players table
CREATE TABLE public.room_players (
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat SMALLINT CHECK (seat IN (1, 2)),
    is_connected BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Bag tiles table
CREATE TABLE public.bag_tiles (
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    seq SERIAL,
    letter TEXT NOT NULL,
    is_joker BOOLEAN DEFAULT FALSE,
    drawn_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    drawn_at TIMESTAMPTZ,
    PRIMARY KEY (room_id, seq)
);

-- Rack tiles table
CREATE TABLE public.rack_tiles (
    room_id UUID,
    user_id UUID,
    bag_seq INT REFERENCES public.bag_tiles(seq) ON DELETE CASCADE,
    idx SMALLINT,
    PRIMARY KEY (room_id, user_id, bag_seq)
);

-- Board tiles table
CREATE TABLE public.board_tiles (
    room_id UUID,
    user_id UUID,
    bag_seq INT UNIQUE REFERENCES public.bag_tiles(seq) ON DELETE CASCADE,
    x INT NOT NULL,
    y INT NOT NULL,
    as_letter TEXT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (room_id, bag_seq)
);

-- Events table
CREATE TABLE public.events (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type event_type NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bag_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rack_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for friends
CREATE POLICY "Users can view their friendships" ON public.friends
    FOR SELECT USING (auth.uid() IN (user_id, friend_id));

CREATE POLICY "Users can create friendships" ON public.friends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships" ON public.friends
    FOR UPDATE USING (auth.uid() IN (user_id, friend_id));

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms they're in" ON public.rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = rooms.id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create rooms" ON public.rooms
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update rooms they own" ON public.rooms
    FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies for room_players
CREATE POLICY "Users can view room players in their rooms" ON public.room_players
    FOR SELECT USING (
        user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = room_players.room_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join rooms" ON public.room_players
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their room status" ON public.room_players
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for bag_tiles
CREATE POLICY "Users can view bag tiles in their rooms" ON public.bag_tiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = bag_tiles.room_id AND rp.user_id = auth.uid()
        )
    );

-- RLS Policies for rack_tiles
CREATE POLICY "Users can view rack tiles in their rooms" ON public.rack_tiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = rack_tiles.room_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own rack" ON public.rack_tiles
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for board_tiles
CREATE POLICY "Users can view board tiles in their rooms" ON public.board_tiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = board_tiles.room_id AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own board tiles" ON public.board_tiles
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Users can view events in their rooms" ON public.events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_players rp
            WHERE rp.room_id = events.room_id AND rp.user_id = auth.uid()
        )
    );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bag_tiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rack_tiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_tiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;