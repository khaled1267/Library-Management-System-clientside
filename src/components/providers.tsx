'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import api from '@/lib/api';

export type LibraryUser = {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  phone?: string;
  department?: string;
  semester?: string;
  studentNumber?: string;
  createdAt?: string;
};

type Toast = { text: string; tone: 'success' | 'error' } | null;
type AuthContextValue = {
  user: LibraryUser | null;
  setUser: Dispatch<SetStateAction<LibraryUser | null>>;
  isInitializing: boolean;
  signIn: () => Promise<LibraryUser>;
  signOut: () => void;
  notify: (text: string, tone?: 'success' | 'error') => void;
};

const Auth = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(Auth);
  if (!context) throw new Error('useAuth must be used inside Providers.');
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LibraryUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const authRevision = useRef(0);

  const notify = useCallback((text: string, tone: 'success' | 'error' = 'success') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const signIn = async () => {
    const response = await api.get('/auth/me');
    authRevision.current += 1;
    setUser(response.data.user);
    return response.data.user;
  };

  const signOut = () => {
    authRevision.current += 1;
    setUser(null);
    localStorage.removeItem('library-token');
    localStorage.removeItem('library-user');
    void api.post('/auth/logout').catch(() => undefined);
  };

  useEffect(() => {
    let mounted = true;
    const revisionAtStart = authRevision.current;
    const legacyToken = localStorage.getItem('library-token');
    const request = api.get('/auth/me', legacyToken ? { headers: { Authorization: `Bearer ${legacyToken}` } } : undefined);
    request.then((response) => {
      if (mounted && authRevision.current === revisionAtStart) setUser(response.data.user);
    }).catch(() => {
      if (mounted && authRevision.current === revisionAtStart) setUser(null);
    }).finally(() => {
      localStorage.removeItem('library-token');
      localStorage.removeItem('library-user');
      if (mounted) setIsInitializing(false);
    });
    const onUnauthorized = () => setUser(null);
    window.addEventListener('library:unauthorized', onUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('library:unauthorized', onUnauthorized);
    };
  }, []);

  return <Auth.Provider value={{ user, setUser, isInitializing, signIn, signOut, notify }}>
    <MotionConfig reducedMotion="user">
      {children}
      {toast && <div className={`toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>{toast.tone === 'error' ? <AlertCircle size={17}/> : <Check size={17}/>}<span>{toast.text}</span></div>}
    </MotionConfig>
  </Auth.Provider>;
}
