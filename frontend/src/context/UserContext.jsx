import { createContext, useContext, useEffect, useState } from "react";

/**
 * Global User Context
 * - Stores logged-in user info
 * - Persists across refresh
 */

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // Load user from localStorage on app load
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to parse stored user", err);
      localStorage.removeItem("user");
    } finally {
      setAuthReady(true); // ✅ ALWAYS set auth ready
      setLoading(false);
    }
  }, []);

  // Login: save user globally
  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Logout: clear everything
  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("provider_token");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        loading,
        authReady,          // ✅ EXPOSE THIS
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return context;
};
