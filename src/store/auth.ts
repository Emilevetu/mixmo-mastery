import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, pseudo: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (pseudo: string) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signUp: async (email: string, password: string, pseudo: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { pseudo }
      }
    });

    if (!error) {
      // Update profile with pseudo after signup
      setTimeout(async () => {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ pseudo })
          .eq('id', (await supabase.auth.getUser()).data.user?.id);
      }, 1000);
    }

    return { error };
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  updateProfile: async (pseudo: string) => {
    const { user } = get();
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update({ pseudo })
      .eq('id', user.id);

    return { error };
  }
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    loading: false
  });
});

// Check initial session
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    loading: false
  });
});