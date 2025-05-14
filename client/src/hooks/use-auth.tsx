import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: UserData; token: string }, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: UserData; token: string }, Error, InsertUser>;
};

export type UserData = {
  id: number;
  email: string;
  name: string;
  role: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Helper function to set JWT token in localStorage
const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// Helper function to clear JWT token from localStorage
const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser  // Explicitly extract the refetch function
  } = useQuery<UserData | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      
      try {
        const response = await fetch('/api/user', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Add cache-busting to make sure we don't get a cached response
          cache: 'no-store'
        });
        
        if (response.status === 401) {
          clearAuthToken();
          return null;
        }
        
        if (!response.ok) throw new Error('Failed to fetch user data');
        const userData = await response.json();
        console.log('Refreshed user data:', userData);
        return userData;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
    // Increase refetch frequency
    staleTime: 60000, // 1 minute
    refetchInterval: 60000 // Refetch every minute
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: UserData; token: string }) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (data: { user: UserData; token: string }) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearAuthToken();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error: error || null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
