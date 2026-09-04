import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth, saveTokens, clearTokens, getAccessToken } from '../lib/api';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  phoneNumber: string;
  setPhoneNumber: (p: string) => void;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    // Check for existing session
    getAccessToken().then((token) => {
      setIsLoggedIn(!!token);
      setIsLoading(false);
    }).catch((e) => {
      console.warn("Auth check error:", e);
      setIsLoading(false);
    });
  }, []);

  const requestOtp = async (phone: string) => {
    await Auth.requestOtp(phone);
    setPhoneNumber(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const data = await Auth.verifyOtp(phone, otp);
    await saveTokens(data.access, data.refresh);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await clearTokens();
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isLoading, phoneNumber, setPhoneNumber, requestOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
