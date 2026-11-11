import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "../services/api";

const AUTH_STORAGE_KEY = "@cognify_auth";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "organization" | "admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Restore authenticated session from persistent AsyncStorage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.token && parsed?.user) {
            setAuthToken(parsed.token);
            setToken(parsed.token);
            setUser(parsed.user);
          }
        }
      } catch (e) {
        console.warn("Failed to restore auth session from AsyncStorage:", e);
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string, targetRole: string = "user") => {
    setLoading(true);
    try {
      // Authenticate via shared Express backend (which verifies against Supabase and retrieves trusted DB role)
      const data = await api.login(email, password);
      const authToken = data.token || data.access_token;
      const authenticatedUser: User = data.user;

      // Enforce role authorization if a specific role portal was targeted
      if (targetRole === "admin" && authenticatedUser.role !== "admin") {
        throw new Error("Access denied: Account does not have administrator privileges.");
      }
      if (
        targetRole === "organization" &&
        authenticatedUser.role !== "organization" &&
        (authenticatedUser.role as any) !== "recruiter"
      ) {
        throw new Error("Access denied: Account is not registered as an organization.");
      }

      setAuthToken(authToken);
      setToken(authToken);
      setUser(authenticatedUser);

      // Persist to AsyncStorage for Expo Go app restarts
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token: authToken, user: authenticatedUser })
      );
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: string = "user") => {
    setLoading(true);
    try {
      // Register through shared Express backend (confirmPassword validated in SignupScreen)
      await api.signup(name, email, password, password, role);

      // Immediately log in via backend
      const loginData = await api.login(email, password);
      const authToken = loginData.token || loginData.access_token;
      const authenticatedUser: User = loginData.user;

      setAuthToken(authToken);
      setToken(authToken);
      setUser(authenticatedUser);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token: authToken, user: authenticatedUser })
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout().catch(() => {});
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, initializing, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
