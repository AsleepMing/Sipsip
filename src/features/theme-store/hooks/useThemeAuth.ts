import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import {
  THEME_STORE_TOKEN_KEY,
  THEME_STORE_USERNAME_KEY,
} from "../../../shared/config/brand";

export function useThemeAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(THEME_STORE_TOKEN_KEY);
    const savedUser = localStorage.getItem(THEME_STORE_USERNAME_KEY);
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = useCallback(
    async (user: string, password: string) => {
      const result = await api.login(user, password);
      localStorage.setItem(THEME_STORE_TOKEN_KEY, result.token);
      localStorage.setItem(THEME_STORE_USERNAME_KEY, result.username);
      setToken(result.token);
      setUsername(result.username);
      return result;
    },
    []
  );

  const handleRegister = useCallback(
    async (user: string, password: string) => {
      const result = await api.register(user, password);
      localStorage.setItem(THEME_STORE_TOKEN_KEY, result.token);
      localStorage.setItem(THEME_STORE_USERNAME_KEY, result.username);
      setToken(result.token);
      setUsername(result.username);
      return result;
    },
    []
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem(THEME_STORE_TOKEN_KEY);
    localStorage.removeItem(THEME_STORE_USERNAME_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  return {
    isLoggedIn: !!token,
    username,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
