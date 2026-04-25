import { createContext, useContext, useState, useEffect } from 'react';
import API, { setAccessToken } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to refresh the token (cookie-based)
  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const res = await API.post('/auth/refresh');
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      } catch {
        // No valid refresh token — user needs to login
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    tryRefresh();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await API.post('/auth/register', data);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
