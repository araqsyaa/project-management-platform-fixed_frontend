import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../data/mockData';
import { api, setToken, storeUser, getStoredUser, clearToken, toFrontendRole } from '../api/client';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(apiUser: { id: number; name: string; email: string; role: string; avatar?: string }): User {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    email: apiUser.email,
    role: toFrontendRole(apiUser.role) as User['role'],
    avatar: apiUser.avatar,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.users()
        .then((users) => {
          // Use first user as fallback; ideally backend would have /me
          if (users.length > 0) {
            setUser(toUser(users[0]));
          }
        })
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      storeUser(res.user);
      setUser(toUser(res.user));
      return true;
    } catch {
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.register(name, email, password);
      setToken(res.token);
      storeUser(res.user);
      setUser(toUser(res.user));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
