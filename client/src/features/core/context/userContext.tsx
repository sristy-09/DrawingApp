import axios from "axios";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// 1. Type for the User object
export interface User {
  _id: string;
  email: string;
  username?: string;
  avatar?: string;
}

// 2. Type for the context value
export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// 2. Type for login credentials
export interface Credentials {
  email: string;
  password: string;
}

// 3. Create context with a default value
export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

// 4. Provider Component
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          const response = await axios.get("/auth/me");
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (credentials: Credentials): Promise<void> => {
    try {
      const response = await axios.post<{ token: string; user: User }>(
        "/auth/login",
        credentials
      );
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Axios error type
        throw new Error(error.response?.data?.message || "Login failed");
      } else {
        // Other unknown errors
        throw new Error("Login failed");
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{ user, setUser, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </UserContext.Provider>
  );
};

// 5. Custom hook to access context
export const getData = (): UserContextType => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
