import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "./pages/HomePage";
import SignUpPage from "./features/auth/components/SignUpPage";
import LoginPage from "./features/auth/components/LoginPage";
import AuthSuccess from "./features/auth/components/AuthSuccess";
import Board from "./features/board/components/Board";
import UserDashboard from "./features/User/components/UserDashboard";
import AuthRoute from "./features/core/components/ProtectedRoute";

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <AuthRoute mode="guest">
                <HomePage />
              </AuthRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthRoute mode="guest">
                <SignUpPage />
              </AuthRoute>
            }
          />
          <Route
            path="/login"
            element={
              <AuthRoute mode="guest">
                <LoginPage />
              </AuthRoute>
            }
          />
          <Route path="/auth-success" element={<AuthSuccess />} />

          <Route
            path="/board"
            element={
              <AuthRoute mode="guest">
                <Board />
              </AuthRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthRoute mode="private">
                <UserDashboard />
              </AuthRoute>
            }
          />
          <Route
            path="/board/:id"
            element={
              <AuthRoute mode="private">
                <Board />
              </AuthRoute>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
