// src/routes/AuthRoute.tsx
import { Navigate } from "react-router";
import { getData } from "../context/userContext";

interface AuthRouteProps {
  children: React.ReactElement;
  mode: "guest" | "private";
}

/**
 * mode="guest": only non-logged-in users can access (e.g., /, /login, /signup)
 * mode="private": only logged-in users can access (e.g., /dashboard, /board)
 */
const AuthRoute: React.FC<AuthRouteProps> = ({ children, mode }) => {
  const { isAuthenticated } = getData();

  if (mode === "guest" && isAuthenticated) {
    // Logged-in user trying to access guest-only route
    return <Navigate to="/dashboard" replace />;
  }

  if (mode === "private" && !isAuthenticated) {
    // Not logged in, trying to access private route
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthRoute;
