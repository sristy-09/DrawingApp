import axios from "axios";
import { useEffect } from "react";
import { getData } from "../../../context/userContext";
import { useNavigate } from "react-router";

function AuthSuccess() {
  const { setUser } = getData();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      console.log(params);
      const accessToken = params.get("token");
      console.log("Access Token:", accessToken);

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;
        try {
          const res = await axios.get("http://localhost:3000/auth/me", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (res.data.success) {
            setUser(res.data.user); // save user in context api store
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };
    handleAuth();
  }, [navigate]);
  return <h2>Logging In...</h2>;
}

export default AuthSuccess;
