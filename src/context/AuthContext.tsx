import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, verifySupabaseConfig } from '../lib/supabase';

export interface PlanDetail { name: string; expiresAt: number; }

export interface Profile {
  all_plans?: PlanDetail[];
  raw_plan?: string;
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: string;
  plan_expires_at?: number | null;
  credits: number;
  priority_level: number;
  templates_limit: number;
  team_enabled: boolean;
  ai_enabled: boolean;
  beta_enabled: boolean;
  role: string;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
    signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  deductCredits: (amount: number) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
    signInWithGoogle: async () => {},
  signInWithMagicLink: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  signOut: async () => {},
  deductCredits: async () => false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = localStorage.getItem('auralis_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.session || null;
      }
    } catch (e) {}
    return null;
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('auralis_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.user || null;
      }
    } catch (e) {}
    return null;
  });
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('auralis_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.profile || null;
      }
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    verifySupabaseConfig();
    // Check if we are in a popup
    const isPopup = window.opener || window.name === 'oauth_popup' || window.location.search.includes('popup=true');

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user);
        // Close popup if this is the OAuth callback window
        if (isPopup) {
          if (window.opener) window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          window.close();
        }
      } else {
        // If there is already a cached valid local session, keep it
        const saved = localStorage.getItem('auralis_auth_session');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.session && parsed.user) {
              setSession(parsed.session);
              setUser(parsed.user);
              if (parsed.profile) setProfile(parsed.profile);
            }
          } catch (e) {}
        }
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user);
        // Close popup if this is the OAuth callback window
        if (isPopup) {
          if (window.opener) window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          window.close();
        }
      } else {
        const saved = localStorage.getItem('auralis_auth_session');
        if (!saved) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    // Fallback listener for partitioned storage environments
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setSession(session);
            setUser(session.user);
            fetchProfile(session.user);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
        
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.warn('Profile sync notice:', error.message);
      } else if (data) {
        let actualPlan = data.plan || 'Free';
        let expiresAt: number | null = null;
        let ai_enabled = data.ai_enabled;
        let team_enabled = data.team_enabled;
        let beta_enabled = data.beta_enabled;
        let templates_limit = data.templates_limit;
        let priority_level = data.priority_level;
        let role = currentUser.user_metadata?.role || currentUser.app_metadata?.role || data?.role || 'user';
        if (
          currentUser.email === 'cruder@auralis.app' ||
          currentUser.user_metadata?.full_name?.toLowerCase() === 'cruder' ||
          currentUser.user_metadata?.role === 'admin'
        ) {
          role = 'admin';
        }
        
        let all_plans: PlanDetail[] = [];
        let active_plan = 'Free';
        const planHierarchy: Record<string, number> = { "Free": 0, "Starter": 1, "Creator": 2, "Pro": 3, "Studio": 4 };
        
        if (actualPlan.includes('|')) {
          const planParts = actualPlan.split(',');
          for (const part of planParts) {
             const [name, exp] = part.split('|');
             if (name && exp) {
               const expNum = parseInt(exp, 10);
               if (!isNaN(expNum) && expNum > Date.now()) {
                  all_plans.push({ name, expiresAt: expNum });
               }
             }
          }
          
          let maxRank = 0;
          for (const p of all_plans) {
             const rank = planHierarchy[p.name] || 0;
             if (rank > maxRank) {
                maxRank = rank;
                active_plan = p.name;
                expiresAt = p.expiresAt;
             }
          }
          
          if (active_plan === 'Free') {
             ai_enabled = false;
             team_enabled = false;
             beta_enabled = false;
             templates_limit = 0;
             priority_level = 1;
          } else {
             // If plan is active, map capabilities
             priority_level = active_plan === 'Studio' ? 3 : (active_plan === 'Pro' || active_plan === 'Creator' ? 2 : 1);
             templates_limit = (active_plan === 'Studio' || active_plan === 'Pro') ? -1 : (active_plan === 'Creator' ? 3 : 0);
             ai_enabled = (active_plan === 'Studio' || active_plan === 'Pro');
             team_enabled = (active_plan === 'Studio' || active_plan === 'Pro');
             beta_enabled = (active_plan === 'Studio');
          }
        } else {
           active_plan = actualPlan;
        }
        
        setProfile({ ...data, plan: active_plan, raw_plan: data.plan, all_plans, plan_expires_at: expiresAt, ai_enabled, team_enabled, beta_enabled, templates_limit, priority_level, role } as Profile);
      } else {
        // Create new profile with default or admin attributes
        const isAdmin = 
          currentUser.email === 'cruder@auralis.app' || 
          currentUser.user_metadata?.full_name?.toLowerCase() === 'cruder' || 
          currentUser.user_metadata?.role === 'admin';

        const newProfile: Profile = {
          id: currentUser.id,
          email: currentUser.email ?? null,
          full_name: currentUser.user_metadata?.full_name ?? (isAdmin ? 'Cruder' : null),
          avatar_url: currentUser.user_metadata?.avatar_url ?? null,
          plan: isAdmin ? 'Studio' : 'Free',
          plan_expires_at: null,
          credits: isAdmin ? 99999 : 200,
          priority_level: isAdmin ? 3 : 1,
          templates_limit: isAdmin ? -1 : 0,
          team_enabled: isAdmin ? true : false,
          ai_enabled: isAdmin ? true : false,
          beta_enabled: isAdmin ? true : false,
          role: isAdmin ? 'admin' : 'user',
          created_at: new Date().toISOString(),
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (insertError) {
          if (insertError.code !== 'PGRST205') {
            console.warn('Notice syncing profile table row:', insertError.message || insertError);
          }
          setProfile(newProfile);
        } else if (insertedData) {
          setProfile({ ...insertedData, role: newProfile.role, plan_expires_at: null } as Profile);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };


    const signInWithGoogle = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const isIframe = window !== window.top;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isIframe ? `${import.meta.env.VITE_APP_URL || window.location.origin}?popup=true` : (import.meta.env.VITE_APP_URL || window.location.origin),
          skipBrowserRedirect: isIframe,
        }
      });
      if (error) throw error;
      
      if (isIframe && data?.url) {
        window.open(data.url, 'oauth_popup', 'width=600,height=700');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithMagicLink = async (email: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: window.location.origin } 
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error sending magic link:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithPassword = async (username: string, password: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      // 1. Try server-assisted login first (handles admin credentials instantly, resolves usernames)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && data.session) {
            setSession(data.session);
            setUser(data.user);
            setProfile(data.profile || null);
            localStorage.setItem('auralis_auth_session', JSON.stringify({
              session: data.session,
              user: data.user,
              profile: data.profile || null
            }));

            // Sync with Supabase client if available
            try {
              if (data.user.email) {
                await supabase.auth.signInWithPassword({ email: data.user.email, password });
              }
            } catch (e) {
              // Ignore if Supabase is in fallback/dummy mode
            }
            return;
          }
        } else if (res.status === 401) {
          throw new Error('Invalid login credentials');
        }
      } catch (serverErr: any) {
        if (serverErr.message === 'Invalid login credentials') {
          throw serverErr;
        }
        console.warn('Server login fallback notice:', serverErr);
      }

      // 2. Client-side Supabase direct attempt
      let resolvedEmail = username;
      if (!username.includes('@')) {
        const res = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        if (res.ok) {
          const data = await res.json();
          resolvedEmail = data.email;
        }
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (error) throw error;

      if (authData.session && authData.user) {
        setSession(authData.session);
        setUser(authData.user);
        await fetchProfile(authData.user);
        localStorage.setItem('auralis_auth_session', JSON.stringify({
          session: authData.session,
          user: authData.user,
          profile: profile
        }));
      }
    } catch (error) {
      console.error('Error signing in with password:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signUpWithPassword = async (email: string, password: string, username: string) => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      if (!email.toLowerCase().endsWith('@gmail.com')) {
        throw new Error('Only @gmail.com accounts are allowed');
      }

      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.exists) {
        throw new Error('Account already there');
      }

      const { error } = await supabase.auth.signUp({ 
         email, 
         password,
        options: {
          data: {
            full_name: username
          },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('auralis_auth_session');
      setSession(null);
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut().catch(() => {});
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const deductCredits = async (_amount: number): Promise<boolean> => {
    return true;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithGoogle, signInWithMagicLink, signInWithPassword, signUpWithPassword, signOut, deductCredits, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
