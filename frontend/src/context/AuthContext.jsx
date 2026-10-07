import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { checkKeysStatus } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fd_theme') === 'dark');

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('fd_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const loadUserProfile = async (userId, userEmail, userMeta) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        // Auto-create profile if missing
        const newProfile = {
          id: userId,
          username: userMeta?.username || userEmail.split('@')[0],
          full_name: userMeta?.full_name || userEmail.split('@')[0],
          role: userMeta?.role || 'jefe_division',
          active: true
        };

        const { data: created } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        data = created || newProfile;
      }

      setCurrentProfile(data);
      refreshKeyStatus(userId);
    } catch (err) {
      console.error('Error al cargar perfil:', err);
    }
  };

  const refreshKeyStatus = async (userId) => {
    try {
      const status = await checkKeysStatus(userId || currentUser?.id);
      setHasKeys(status.has_keys);
    } catch (e) {
      setHasKeys(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          await loadUserProfile(session.user.id, session.user.email, session.user.user_metadata);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await loadUserProfile(session.user.id, session.user.email, session.user.user_metadata);
      } else {
        setCurrentUser(null);
        setCurrentProfile(null);
        setHasKeys(false);
      }
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    setHasKeys(false);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentProfile,
      hasKeys,
      loading,
      darkMode,
      setDarkMode,
      login,
      logout,
      refreshKeyStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
