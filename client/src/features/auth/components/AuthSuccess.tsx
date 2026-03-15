import axios from "axios";
import { useEffect } from "react";
import { getData } from "../../core/context/userContext";
import { useNavigate } from "react-router";

function AuthSuccess() {
  const { setUser } = getData();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.data.success) {
            setUser(res.data.user);
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          navigate("/login");
        }
      }
    };
    handleAuth();
  }, [navigate, setUser, API_URL]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h2 className="text-2xl">Logging In...</h2>
    </div>
  );
}

export default AuthSuccess;
