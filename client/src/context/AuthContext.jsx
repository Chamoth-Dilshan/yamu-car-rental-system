import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('uprm_token');
    const storedUser = localStorage.getItem('uprm_user');

    if (!token) {
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    API.get('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('uprm_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('uprm_token');
        localStorage.removeItem('uprm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token, ...userData } = res.data;
    localStorage.setItem('uprm_token', token);
    localStorage.setItem('uprm_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (payload) => {
    const res = await API.post('/auth/register', payload);
    const { token, ...userData } = res.data;
    localStorage.setItem('uprm_token', token);
    localStorage.setItem('uprm_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const switchRole = async (role) => {
    const res = await API.put('/auth/switch-role', { role });
    const { token, ...userData } = res.data;
    const nextUser = { ...user, ...userData };
    localStorage.setItem('uprm_token', token);
    localStorage.setItem('uprm_user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const refreshMe = async () => {
    const res = await API.get('/auth/me');
    setUser(res.data);
    localStorage.setItem('uprm_user', JSON.stringify(res.data));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('uprm_token');
    localStorage.removeItem('uprm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchRole, refreshMe, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

