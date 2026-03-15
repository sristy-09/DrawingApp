import axios from "axios";
import { useEffect, useState } from "react";
import { getData } from "../../core/context/userContext";
import { useNavigate } from "react-router";
import { SaveGuestBoardDialog } from "./SaveGuestBoardDialog";
import { useAppDispatch } from "../../../store/hooks";
import { clearBoardData } from "../../../store/boardSlice";

function AuthSuccess() {
  const { setUser } = getData();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const checkGuestData = () => {
    const guestData = localStorage.getItem('guestBoardData');
    return !!guestData && guestData !== '{"objects":[],"background":"#FFFFFF"}';
  };

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        setAccessToken(token);
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
            
            // Check if guest has unsaved data
            if (checkGuestData()) {
              setShowSaveDialog(true);
            } else {
              navigate("/dashboard");
            }
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          navigate("/login");
        }
      }
    };
    handleAuth();
  }, [navigate, setUser, API_URL]);

  const handleSaveGuestBoard = async (boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
    if (!accessToken) return;

    try {
      // Get the guest canvas data
      const guestCanvasData = localStorage.getItem('guestBoardData');

      // Create new board with guest data
      const response = await axios.post(
        `${API_URL}/board`,
        {
          title: boardData.title,
          description: boardData.description,
          isPublic: boardData.isPublic,
          canvasData: guestCanvasData || "{}",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Clear guest data from Redux and localStorage
      dispatch(clearBoardData());

      // Navigate to the newly created board
      navigate(`/board/${response.data._id}`);
      setShowSaveDialog(false);
    } catch (error) {
      console.error("Failed to save board:", error);
      alert("Failed to save board");
    }
  };

  const handleDiscardGuestBoard = () => {
    // Clear guest data
    dispatch(clearBoardData());
    
    // Navigate to dashboard
    navigate("/dashboard");
    setShowSaveDialog(false);
  };

  const handleCancelSaveDialog = () => {
    setShowSaveDialog(false);
    navigate("/dashboard");
  };

  return (
    <>
      <SaveGuestBoardDialog
        open={showSaveDialog}
        onSave={handleSaveGuestBoard}
        onDiscard={handleDiscardGuestBoard}
        onCancel={handleCancelSaveDialog}
      />
      <div className="min-h-screen flex items-center justify-center">
        <h2 className="text-2xl">Logging In...</h2>
      </div>
    </>
  );
}

export default AuthSuccess;
