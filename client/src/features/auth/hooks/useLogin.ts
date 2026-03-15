import { useState } from "react";
import { useNavigate } from "react-router";
import type { FormErrors, LoginFormType } from "../types/types";
import axios from "axios";
import { getData } from "../../core/context/userContext";
import { loginSchema } from "../loginSchema";
import { useAppDispatch } from "@/store/hooks";
import { clearBoardData } from "@/store/boardSlice";

export function useLogin() {
  const [myForm, setMyForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<LoginFormType | null>(null);

  const { login } = getData();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_URL;

  const checkGuestData = () => {
    const guestData = localStorage.getItem('guestBoardData');
    return !!guestData && guestData !== '{"objects":[],"background":"#FFFFFF"}';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Zod validation
    const result = loginSchema.safeParse(myForm);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    // clear previous errors
    setErrors({});

    // Check if guest has unsaved data
    if (checkGuestData()) {
      setPendingLoginData(result.data);
      setShowSaveDialog(true);
      return;
    }

    // No guest data, proceed with normal login
    try {
      await login(result.data);
      navigate("/dashboard");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Login Failed");
      } else {
        alert("An unexpected error occurred");
      }
    }
  };

  const handleSaveGuestBoard = async (boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
    if (!pendingLoginData) return;

    try {
      // First, login the user
      await login(pendingLoginData);

      // Get the guest canvas data
      const guestCanvasData = localStorage.getItem('guestBoardData');

      // Create new board with guest data
      const response = await axios.post(
        `${API_URL}/board`,
        {
          title: boardData.title,
          description: boardData.description,
          isPublic: boardData.isPublic,
          canvasData: guestCanvasData,
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
      setPendingLoginData(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Failed to save board");
      } else {
        alert("An unexpected error occurred");
      }
    }
  };

  const handleDiscardGuestBoard = async () => {
    if (!pendingLoginData) return;

    try {
      // Clear guest data
      dispatch(clearBoardData());

      // Login the user
      await login(pendingLoginData);

      // Navigate to dashboard
      navigate("/dashboard");
      setShowSaveDialog(false);
      setPendingLoginData(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Login Failed");
      } else {
        alert("An unexpected error occurred");
      }
    }
  };

  const handleCancelSaveDialog = () => {
    setShowSaveDialog(false);
    setPendingLoginData(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setMyForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error on change
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  return {
    handleChange,
    handleSubmit,
    myForm,
    errors,
    showSaveDialog,
    handleSaveGuestBoard,
    handleDiscardGuestBoard,
    handleCancelSaveDialog,
  };
}
