import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { setApiAuthContext } from "./api";
import { setOfflineEncryptionContext } from "./offlineStore";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isClerkEnabled: boolean;
  isLoading: boolean;
  localLogin: (input: AuthCredentials) => Promise<AuthUser>;
  localRegister: (input: RegisterCredentials) => Promise<AuthUser>;
  localLogout: () => Promise<void>;
};

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = AuthCredentials & {
  name: string;
};

const authStorageKey = "mwananchi_auth_user";
const AuthContext = createContext<AuthContextValue | null>(null);
export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: ReactNode }) {
  if (clerkPublishableKey) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }

  return <LocalAuthProvider>{children}</LocalAuthProvider>;
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { getToken } = useClerkAuth();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const user = useMemo(() => mapClerkUser(clerkUser), [clerkUser]);

  useEffect(() => {
    if (user) void syncUser(user);
  }, [user]);

  useEffect(() => {
    setApiAuthContext({
      userId: user?.id,
      getToken,
    });
    setOfflineEncryptionContext({
      userId: user?.id,
      isClerkEnabled: true,
      getToken,
    });
  }, [getToken, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(isSignedIn && user),
      isClerkEnabled: true,
      isLoading: !isLoaded,
      localLogin: rejectClerkOwnedAction,
      localRegister: rejectClerkOwnedAction,
      localLogout: rejectClerkOwnedAction,
    }),
    [isLoaded, isSignedIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    setApiAuthContext({
      userId: user?.id,
      getToken: async () => null,
    });
    setOfflineEncryptionContext({
      userId: user?.id,
      isClerkEnabled: false,
      getToken: async () => null,
    });
  }, [user?.id]);

  const localLogin = useCallback(async ({ email }: AuthCredentials) => {
    const nextUser = buildUserFromEmail(email);
    void syncUser(nextUser);
    persistUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  const localRegister = useCallback(
    async ({ email, name }: RegisterCredentials) => {
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
    [],
  );

  const localLogout = useCallback(async () => {
    window.localStorage.removeItem(authStorageKey);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isClerkEnabled: false,
      isLoading: false,
      localLogin,
      localRegister,
      localLogout,
    }),
    [localLogin, localLogout, localRegister, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return auth;
}

function persistUser(user: AuthUser) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
}

async function syncUser(user: AuthUser) {
  try {
    await fetch(`${apiBaseUrl}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch {
    // The API server is optional during local prototype work.
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

function buildUserFromEmail(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const name =
    normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ") || "Mwananchi user";

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

async function rejectClerkOwnedAction(): Promise<never> {
  throw new Error("This auth action is handled by Clerk.");
}

function mapClerkUser(
  user: ReturnType<typeof useUser>["user"],
): AuthUser | null {
  if (!user) return null;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  return {
    id: user.id,
    name: user.fullName ?? buildUserFromEmail(email).name,
    email,
  };
}
