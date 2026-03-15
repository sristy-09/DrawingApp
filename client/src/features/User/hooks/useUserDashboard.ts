import { useState, useEffect } from "react";
import { getData } from "../../core/context/userContext";
import type { Board } from "../types/types";
import axios from "axios";
import { useNavigate } from "react-router";
import { useAppDispatch } from "../../../store/hooks";
import { clearBoardData } from "../../../store/boardSlice";

export function useUserDashboard() {
  const { user, logout } = getData();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [boards, setBoards] = useState<Board[]>([]); // <- typed as Board array

  const [newBoard, setNewBoard] = useState<{
    title: string;
    description: string;
    isPublic: boolean;
  }>({
    title: "",
    description: "",
    isPublic: false,
  });

  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const checkGuestData = () => {
    const guestData = localStorage.getItem('guestBoardData');
    return !!guestData && guestData !== '{"objects":[],"background":"#FFFFFF"}';
  };

  // Check for guest data on mount
  useEffect(() => {
    if (user && checkGuestData()) {
      setShowSaveDialog(true);
    }
  }, [user]);

  const fetchBoards = async () => {
    try {
      const response = await axios.get<Board[]>(`${API_URL}/board`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBoards(response.data ?? []);
    } catch (error) {
      console.error("Failed to fetch boards:", error);
      setBoards([]);
    }
  };

  const createBoard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/board`, newBoard, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setNewBoard({ title: "", description: "", isPublic: false });
      setShowNewBoardForm(false);
      fetchBoards();
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBoardDeleted = (boardId: string) => {
    setBoards((prev) => prev.filter((b) => b._id !== boardId));
  };

  const handleSaveGuestBoard = async (boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    setShowSaveDialog(false);
  };

  const handleCancelSaveDialog = () => {
    setShowSaveDialog(false);
  };

  return {
    user,
    boards,
    newBoard,
    setNewBoard,
    showNewBoardForm,
    setShowNewBoardForm,
    showSaveDialog,
    fetchBoards,
    createBoard,
    handleLogout,
    handleBoardDeleted,
    handleSaveGuestBoard,
    handleDiscardGuestBoard,
    handleCancelSaveDialog,
  };
}
