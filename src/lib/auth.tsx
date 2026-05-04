import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (input: AuthCredentials) => Promise<AuthUser>;
  register: (input: RegisterCredentials) => Promise<AuthUser>;
  logout: () => void;
};

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = AuthCredentials & {
  name: string;
};

const authStorageKey = 'mwananchi_auth_user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = window.localStorage.getItem(authStorageKey);
    if (!storedUser) return;

    try {
      setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      window.localStorage.removeItem(authStorageKey);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async ({ email }) => {
        const nextUser = buildUserFromEmail(email);
        void syncUser(nextUser);
        persistUser(nextUser);
        setUser(nextUser);
        return nextUser;
      },
      register: async ({ email, name }) => {
        const nextUser = {
          id: buildUserId(email),
          name: name.trim(),
          email: email.trim().toLowerCase(),
        };
        void syncUser(nextUser);
        persistUser(nextUser);
        setUser(nextUser);
        return nextUser;
      },
      logout: () => {
        window.localStorage.removeItem(authStorageKey);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return auth;
}

function persistUser(user: AuthUser) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
}

async function syncUser(user: AuthUser) {
  try {
    await fetch(`${apiBaseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch {
    // The API server is optional during local prototype work.
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

function buildUserFromEmail(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const name = normalizedEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Mwananchi user';

  return {
    id: buildUserId(normalizedEmail),
    name: titleCase(name),
    email: normalizedEmail,
  };
}

function buildUserId(email: string) {
  return `user-${encodeURIComponent(email.trim().toLowerCase())}`;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
