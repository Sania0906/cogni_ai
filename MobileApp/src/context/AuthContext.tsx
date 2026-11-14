import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  api,
  setAuthToken,
  getAuthToken,
  getRefreshToken,
  setOnAuthExpired,
} from "../services/api";
import { supabase } from "../services/supabase";

const AUTH_STORAGE_KEY = "@cognify_auth";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "organization" | "admin";
}

interface AuthStorageData {
  token: string;
  refreshToken?: string | null;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // In-flight promises to eliminate startup race conditions and deduplicate concurrent refreshes
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const refreshPromiseRef = useRef<Promise<User | null> | null>(null);

  // Attempt to refresh an expired session via Supabase client or API
  const attemptTokenRefresh = async (
    rToken: string | null
  ): Promise<{ token: string; refreshToken: string | null } | null> => {
    if (!rToken) return null;

    // 1. Direct Supabase client session refresh if configured
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: rToken });
        if (!error && data?.session?.access_token) {
          return {
            token: data.session.access_token,
            refreshToken: data.session.refresh_token || rToken,
          };
        }
      } catch {}
    }

    // 2. Backend refresh endpoint if available
    try {
      const res = await api.refreshToken(rToken);
      if (res?.token || res?.access_token) {
        return {
          token: res.token || res.access_token,
          refreshToken: res.refresh_token || rToken,
        };
      }
    } catch {}

    return null;
  };

  // Safely clear session and wipe stored credentials on genuine expiration
  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
    setAuthToken(null, null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  // Refresh profile from authoritative database and synchronize AsyncStorage
  const refreshUser = async (): Promise<User | null> => {
    // 1. If session restoration is still in-flight, await completion first
    if (initPromiseRef.current) {
      await initPromiseRef.current;
    }

    // 2. If user is signed out or token is missing, do not call protected endpoint
    const currentToken = getAuthToken() || token;
    if (!currentToken || !user) {
      return null;
    }

    // 3. Deduplicate concurrent refreshUser calls across screens/tabs
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const data = await api.getProfile();
        const profile = data?.data || data;
        if (profile && (profile.name || profile.full_name)) {
          const freshName = profile.name || profile.full_name;
          const freshRole = profile.role;
          let updatedUser: User | null = null;
          setUser((prev) => {
            if (!prev) return null;
            updatedUser = {
              ...prev,
              name: freshName,
              role: (freshRole as any) || prev.role,
            };
            AsyncStorage.getItem(AUTH_STORAGE_KEY)
              .then((stored) => {
                if (stored) {
                  try {
                    const parsed = JSON.parse(stored);
                    AsyncStorage.setItem(
                      AUTH_STORAGE_KEY,
                      JSON.stringify({ ...parsed, user: updatedUser })
                    );
                  } catch {}
                }
              })
              .catch(() => {});
            return updatedUser;
          });
          return updatedUser;
        }
      } catch (e: any) {
        const is401 = e?.response?.status === 401;
        if (is401) {
          const currentRefresh = getRefreshToken() || refreshToken;
          if (currentRefresh) {
            const refreshed = await attemptTokenRefresh(currentRefresh);
            if (refreshed) {
              setAuthToken(refreshed.token, refreshed.refreshToken);
              setToken(refreshed.token);
              setRefreshToken(refreshed.refreshToken);

              try {
                const retryData = await api.getProfile();
                const retryProfile = retryData?.data || retryData;
                if (retryProfile && (retryProfile.name || retryProfile.full_name)) {
                  const freshName = retryProfile.name || retryProfile.full_name;
                  const freshRole = retryProfile.role;
                  let updatedUser: User | null = null;
                  setUser((prev) => {
                    if (!prev) return null;
                    updatedUser = {
                      ...prev,
                      name: freshName,
                      role: (freshRole as any) || prev.role,
                    };
                    AsyncStorage.setItem(
                      AUTH_STORAGE_KEY,
                      JSON.stringify({
                        token: refreshed.token,
                        refreshToken: refreshed.refreshToken,
                        user: updatedUser,
                      })
                    ).catch(() => {});
                    return updatedUser;
                  });
                  return updatedUser;
                }
              } catch {}
            }
          }

          // Session is expired and cannot be refreshed, cleanly terminate session
          await clearSession();
        } else {
          console.warn("Failed to refresh user profile:", e?.message || e);
        }
      } finally {
        refreshPromiseRef.current = null;
      }
      return null;
    })();

    return refreshPromiseRef.current;
  };

  // Restore authenticated session from persistent AsyncStorage
  useEffect(() => {
    setOnAuthExpired(() => {
      clearSession();
    });

    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) {
          return;
        }

        let parsed: AuthStorageData | null = null;
        try {
          parsed = JSON.parse(stored);
        } catch {
          await clearSession();
          return;
        }

        if (!parsed?.token || !parsed?.user) {
          await clearSession();
          return;
        }

        const storedToken = parsed.token;
        const storedRefreshToken = parsed.refreshToken || (parsed as any).refresh_token || null;
        const storedUser = parsed.user;

        // Attach token to API client for verification
        setAuthToken(storedToken, storedRefreshToken);

        try {
          const freshData = await api.getProfile();
          const freshProfile = freshData?.data || freshData;
          const freshName = freshProfile?.name || freshProfile?.full_name || storedUser.name;
          const freshRole = freshProfile?.role || storedUser.role;

          const validatedUser: User = {
            ...storedUser,
            name: freshName,
            role: freshRole,
          };

          setToken(storedToken);
          setRefreshToken(storedRefreshToken);
          setUser(validatedUser);

          await AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              token: storedToken,
              refreshToken: storedRefreshToken,
              user: validatedUser,
            })
          );
        } catch (profileErr: any) {
          const is401 = profileErr?.response?.status === 401;

          if (is401) {
            // Expired or invalid token. Attempt session refresh if refresh token is available.
            if (storedRefreshToken) {
              const refreshed = await attemptTokenRefresh(storedRefreshToken);
              if (refreshed) {
                setAuthToken(refreshed.token, refreshed.refreshToken);
                setToken(refreshed.token);
                setRefreshToken(refreshed.refreshToken);

                try {
                  const retryData = await api.getProfile();
                  const retryProfile = retryData?.data || retryData;
                  const freshName =
                    retryProfile?.name || retryProfile?.full_name || storedUser.name;
                  const freshRole = retryProfile?.role || storedUser.role;

                  const validatedUser: User = {
                    ...storedUser,
                    name: freshName,
                    role: freshRole,
                  };

                  setUser(validatedUser);
                  await AsyncStorage.setItem(
                    AUTH_STORAGE_KEY,
                    JSON.stringify({
                      token: refreshed.token,
                      refreshToken: refreshed.refreshToken,
                      user: validatedUser,
                    })
                  );
                  return;
                } catch {}
              }
            }

            // If 401 and refresh cannot be completed, session is invalid -> clear cleanly
            await clearSession();
          } else {
            // Offline / network error: allow user to remain logged in using cached credentials
            setToken(storedToken);
            setRefreshToken(storedRefreshToken);
            setUser(storedUser);
          }
        }
      } catch (e) {
        console.warn("Failed to restore auth session from AsyncStorage:", e);
        await clearSession();
      } finally {
        setInitializing(false);
      }
    };

    initPromiseRef.current = restoreSession();
  }, []);

  const login = async (email: string, password: string, targetRole: string = "user") => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      const authToken = data.token || data.access_token;
      const newRefreshToken = data.refresh_token || null;
      const authenticatedUser: User = data.user;

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

      setAuthToken(authToken, newRefreshToken);
      setToken(authToken);
      setRefreshToken(newRefreshToken);
      setUser(authenticatedUser);

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: authToken,
          refreshToken: newRefreshToken,
          user: authenticatedUser,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: string = "user") => {
    setLoading(true);
    try {
      await api.signup(name, email, password, password, role);

      const loginData = await api.login(email, password);
      const authToken = loginData.token || loginData.access_token;
      const newRefreshToken = loginData.refresh_token || null;
      const authenticatedUser: User = loginData.user;

      setAuthToken(authToken, newRefreshToken);
      setToken(authToken);
      setRefreshToken(newRefreshToken);
      setUser(authenticatedUser);

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: authToken,
          refreshToken: newRefreshToken,
          user: authenticatedUser,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout().catch(() => {});
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        initializing,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
