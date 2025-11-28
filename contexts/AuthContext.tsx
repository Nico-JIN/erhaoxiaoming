import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { LoginData, RegisterData, UserResponse } from '../services/authService';
import userService from '../services/userService';

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUserPatch: (patch: Partial<UserResponse>) => void;
  updateProfile: (data: Partial<UserResponse>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await userService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          await authService.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      await authService.login(data);
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await authService.register(data);
      // After registration, auto-login
      await login({ username: data.username, password: data.password });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const applyUserPatch = (patch: Partial<UserResponse>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };
  
  const updateProfile = async (data: Partial<UserResponse>) => {
    try {
      const updated = await userService.updateProfile(data);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        applyUserPatch,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
