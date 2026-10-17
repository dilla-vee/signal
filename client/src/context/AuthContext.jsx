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

  async function fetchProfile(userId) {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
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
      setUser({ id: 'demo-user-1', email });
      return { success: true };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signup(email, password, fullName) {
    if (!supabase) {
      setUser({ id: 'demo-user-1', email });
      return { success: true };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, timezone: 'Africa/Nairobi' } }
    });
    if (error) throw error;
    return data;
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, logout, updateProfile }}>
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
