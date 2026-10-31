"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { get } from "@/lib/api";
import { cookie } from "@/lib/cookie-client";

import type { AuthContextType, AuthUser } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): Partial<AuthUser> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      id: parsed.id || parsed.sub,
      email: parsed.email,
      role: parsed.role,
      name: parsed.name
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
    const storedToken = cookie.get("accessToken");

    if (storedToken) {
      setToken(storedToken);
      const decoded = decodeJwtPayload(storedToken);
      if (decoded) {
        setUser(decoded as AuthUser);
      }

      get<{ data: AuthUser }>("/user/profile")
        .then((res) => {
          if (isMounted && res?.data) {
            setUser(res.data);
          }
        })
        .catch(() => {
          if (isMounted) {
            cookie.remove("accessToken");
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

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
      const decoded = decodeJwtPayload(newToken);
      if (decoded) {
        setUser(decoded as AuthUser);
      }
      setIsLoading(true);
      get<{ data: AuthUser }>("/user/profile")
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
    cookie.remove("accessToken");
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
