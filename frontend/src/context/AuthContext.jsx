import { createContext, useContext, useEffect, useState } from "react";
import { authApi, storageKeys } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(storageKeys.token) || "");
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    let isCancelled = false;

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsBootstrapping(false);
      return undefined;
    }

    setIsBootstrapping(true);

    authApi
      .me(token)
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        setUser(payload.data.user);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        localStorage.removeItem(storageKeys.token);
        setToken("");
        setUser(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  async function login(credentials) {
    const payload = await authApi.login(credentials);
    const nextToken = payload.data.token;
    const nextUser = payload.data.user;

    localStorage.setItem(storageKeys.token, nextToken);
    setToken(nextToken);
    setUser(nextUser);

    return nextUser;
  }

  function logout() {
    localStorage.removeItem(storageKeys.token);
    setToken("");
    setUser(null);
    setIsBootstrapping(false);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        hasToken: Boolean(token),
        isAuthenticated: Boolean(token && user),
        isBootstrapping,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
