"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { get, post } from "@/lib/api";
import { cookie } from "@/lib/cookie-client";

import type { AuthContextType, AuthUser } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwtPayload(token: string): { user: Partial<AuthUser>; isExpired: boolean } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    const id = parsed.id || parsed.sub;
    if (!id || typeof id !== "string") return null;
    const isExpired = typeof parsed.exp === "number" && parsed.exp * 1000 <= Date.now();
    return {
      isExpired,
      user: {
        id,
        email: parsed.email,
        role: parsed.role,
        name: parsed.name
      }
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      const storedToken = cookie.get("accessToken");
      const parsedToken = storedToken ? parseJwtPayload(storedToken) : null;

      if (!storedToken || !parsedToken || parsedToken.isExpired) {
        if (storedToken) {
          cookie.remove("accessToken");
          cookie.remove("sessionId");
        }
        await Promise.resolve();
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await get<{ data: AuthUser }>("/users/me", { skipAuthRedirect: true });
        if (isMounted && res?.data) {
          setToken(storedToken);
          setUser(res.data);
        }
      } catch {
        if (isMounted) {
          cookie.remove("accessToken");
          cookie.remove("sessionId");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (newToken: string, newUser?: AuthUser) => {
    cookie.set("accessToken", newToken);
    setToken(newToken);
    if (newUser) {
      setUser(newUser);
      setIsLoading(false);
    } else {
      const parsed = parseJwtPayload(newToken);
      if (parsed) {
        setUser(parsed.user as AuthUser);
      }
      setIsLoading(true);
      get<{ data: AuthUser }>("/users/me", { skipAuthRedirect: true })
        .then((res) => {
          if (res?.data) setUser(res.data);
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  const logout = () => {
    // Revoke the session on the server too, so the old token stops working. Fire and forget:
    // the user is logged out locally even if this call fails.
    // The header is set here because the cookie is removed before the request interceptor runs.
    if (token) {
      post("/auth/logout", {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    cookie.remove("accessToken");
    cookie.remove("sessionId");
    setToken(null);
    setUser(null);
    queryClient.clear();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
