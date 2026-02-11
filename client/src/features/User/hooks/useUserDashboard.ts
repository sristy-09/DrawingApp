import { useState } from "react";
import { getData } from "../../core/context/userContext";
import type { Board } from "../types/types";
import axios from "axios";
import { useNavigate } from "react-router";

export function useUserDashboard() {
  const { user, logout } = getData();
  const navigate = useNavigate();

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
  const API_URL = import.meta.env.VITE_API_URL;

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

  return {
    user,
    boards,
    newBoard,
    setNewBoard,
    showNewBoardForm,
    setShowNewBoardForm,
    fetchBoards,
    createBoard,
    handleLogout,
    handleBoardDeleted,
  };
}
