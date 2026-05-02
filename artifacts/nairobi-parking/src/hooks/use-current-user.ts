import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import type { UserRole } from '@workspace/api-client-react';

export function useCurrentUser() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem('parkease_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserId(parsed.userId);
        setRole(parsed.role);
      } catch (e) {}
    }
  }, []);

  const login = useCallback((id: number, userRole: UserRole) => {
    localStorage.setItem('parkease_user', JSON.stringify({ userId: id, role: userRole }));
    setUserId(id);
    setRole(userRole);
    if (userRole === 'owner') {
      setLocation('/owner/dashboard');
    } else {
      setLocation('/');
    }
  }, [setLocation]);

  const logout = useCallback(() => {
    localStorage.removeItem('parkease_user');
    setUserId(null);
    setRole(null);
    setLocation('/login');
  }, [setLocation]);

  return { userId, role, login, logout, isAuthenticated: !!userId };
}
