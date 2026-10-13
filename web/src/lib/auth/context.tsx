"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClient, authTokenStore } from "@/lib/api";
import type { LoginInput, RegisterInput, User } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "./session";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login(input: LoginInput): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Shares the singleton token store so every request sees the same access token,
 * but never hard-redirects on a failed refresh: the provider owns that decision
 * so it can avoid redirect loops on the /login route.
 */
const authApiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  tokenStore: authTokenStore,
  onUnauthenticated: () => {},
});

export interface AuthProviderProps {
  children: ReactNode;
  client?: ApiClient;
}

export function AuthProvider({
  children,
  client = authApiClient,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let active = true;

    client
      .me()
      .then((profile) => {
        if (!active) {
          return;
        }
        setUser(profile);
        setStatus("authenticated");
        setSessionCookie();
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setUser(null);
        setStatus("unauthenticated");
        clearSessionCookie();
      });

    return () => {
      active = false;
    };
  }, [client]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await client.login(input);
      setUser(result.user);
      setStatus("authenticated");
      setSessionCookie();
      return result.user;
    },
    [client],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await client.register(input);
      setUser(result.user);
      setStatus("authenticated");
      setSessionCookie();
      return result.user;
    },
    [client],
  );

  const logout = useCallback(async () => {
    try {
      await client.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      clearSessionCookie();
    }
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
