import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest, clearStaticDemoSession } from "../api/client";
import type { AuthResponse, UserSummary } from "../types";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  loginCitizen: (email: string, password: string) => Promise<UserSummary>;
  registerCitizen: (fullName: string, email: string, phone: string, password: string) => Promise<UserSummary>;
  loginStaff: (identifier: string, password: string, byEmployeeId: boolean) => Promise<UserSummary>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("civictrack_token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest<UserSummary>("/api/auth/me")
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("civictrack_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginCitizen = async (email: string, password: string) => {
    const res = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("civictrack_token", res.access_token);
    setUser(res.user);
    return res.user;
  };

  const registerCitizen = async (fullName: string, email: string, phone: string, password: string) => {
    const res = await apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, email, phone: phone || null, password }),
    });
    localStorage.setItem("civictrack_token", res.access_token);
    setUser(res.user);
    return res.user;
  };

  const loginStaff = async (identifier: string, password: string, byEmployeeId: boolean) => {
    const body = byEmployeeId
      ? { employee_id: identifier, password }
      : { email: identifier, password };
    const res = await apiRequest<AuthResponse>("/api/officers/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem("civictrack_token", res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("civictrack_token");
    clearStaticDemoSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginCitizen, registerCitizen, loginStaff, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
