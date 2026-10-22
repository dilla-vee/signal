import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    id: 'demo-user-1',
    email: 'trader@institutional.macro',
    full_name: 'Lead Macro Trader',
    timezone: 'Africa/Nairobi',
    account_size: 10000.00,
    risk_per_trade_pct: 1.00,
    theme: 'dark'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // In demo/standalone mode
      setUser({ id: 'demo-user-1', email: 'trader@institutional.macro' });
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userObjOrId) {
    if (!supabase || !userObjOrId) return;
    const userId = typeof userObjOrId === 'string' ? userObjOrId : userObjOrId.id;
    const userObj = typeof userObjOrId === 'object' ? userObjOrId : null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
      } else if (userObj) {
        // Upsert default profile for user
        const newProfile = {
          id: userId,
          email: userObj.email,
          full_name: userObj.user_metadata?.full_name || userObj.email?.split('@')[0] || 'Lead Macro Trader',
          timezone: userObj.user_metadata?.timezone || 'Africa/Nairobi',
          account_size: 10000.00,
          risk_per_trade_pct: 1.00,
          theme: 'dark'
        };
        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch (_) {}
        setProfile(newProfile);
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
    }
  }

  async function updateProfile(updates) {
    setProfile(prev => ({ ...prev, ...updates }));
    if (!supabase || !user) return;
    try {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  }

  async function login(email, password) {
    if (!supabase) {
      setUser({ id: 'demo-user-1', email, user_metadata: { full_name: 'Lead Macro Trader' } });
      return { success: true };
    }

    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If error indicates unconfirmed email or rate-limit lock, auto-verify via backend admin API
      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('confirm') || errMsg.includes('invalid') || errMsg.includes('credentials')) {
        try {
          const verifyRes = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (verifyRes.ok) {
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (!retry.error && retry.data) {
              return retry.data;
            }
          }
        } catch (_) {}
      }
      throw error;
    }
    return data;
  }

  async function signup(email, password, fullName) {
    // 1. First attempt backend pre-verified registration (bypasses Supabase email rate limits)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // Immediately log in with the new credentials
          return await login(email, password);
        }
      }
    } catch (err) {
      console.warn('Backend register endpoint error, falling back to direct Supabase signUp:', err);
    }

    // 2. Direct Supabase signUp fallback
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, timezone: 'Africa/Nairobi' } }
      });
      if (error) throw error;
      return data;
    }

    setUser({ id: 'demo-user-1', email, user_metadata: { full_name: fullName } });
    return { success: true };
  }

  function loginDirectDemo() {
    setUser({
      id: 'demo-trader-01',
      email: 'trader@firm.com',
      user_metadata: { full_name: 'Lead Macro Trader' }
    });
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, loginDirectDemo, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
