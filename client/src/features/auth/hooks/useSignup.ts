import { useState } from "react";
import type { FormErrors, SignUpFormType } from "../types/types";
import { useNavigate } from "react-router";
import axios from "axios";
import { signupSchema } from "../signupSchema";
import { useAppDispatch } from "../../../store/hooks";
import { clearBoardData } from "../../../store/boardSlice";

export function useSignup() {
  const [myForm, setMyForm] = useState<SignUpFormType>({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSignupData, setPendingSignupData] =
    useState<SignUpFormType | null>(null);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [errors, setErrors] = useState<FormErrors>({});

  const API_URL = import.meta.env.VITE_API_URL;

  const checkGuestData = () => {
    const guestData = localStorage.getItem("guestBoardData");
    return !!guestData && guestData !== '{"objects":[],"background":"#FFFFFF"}';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Zod validation
    const result = signupSchema.safeParse(myForm);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        username: fieldErrors.username?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      setLoading(false);
      return;
    }

    // clear previous errors
    setErrors({});

    // Check if guest has unsaved data
    if (checkGuestData()) {
      setPendingSignupData(result.data);
      setShowSaveDialog(true);
      setLoading(false);
      return;
    }

    // No guest data, proceed with normal signup
    try {
      const res = await axios.post(`${API_URL}/auth/register`, myForm);

      // Store token if provided
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      alert(res.data.message || "Registration Successful");
      navigate("/dashboard");
    } catch (error: unknown) {
      let errorMessage = "Registration failed";

      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Registration failed";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Registration error:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGuestBoard = async (boardData: {
    title: string;
    description: string;
    isPublic: boolean;
  }) => {
    if (!pendingSignupData) return;

    try {
      setLoading(true);

      // First, register the user
      const res = await axios.post(
        `${API_URL}/auth/register`,
        pendingSignupData,
      );

      // Store token if provided
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        axios.defaults.headers.common["Authorization"] =
          `Bearer ${res.data.token}`;
      }

      // Get the guest canvas data
      const guestCanvasData = localStorage.getItem("guestBoardData");

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
        },
      );

      // Clear guest data from Redux and localStorage
      dispatch(clearBoardData());

      // Navigate to the newly created board
      navigate(`/board/${response.data._id}`);
      setShowSaveDialog(false);
      setPendingSignupData(null);
    } catch (error: unknown) {
      let errorMessage = "Failed to save board";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardGuestBoard = async () => {
    if (!pendingSignupData) return;

    try {
      setLoading(true);

      // Clear guest data
      dispatch(clearBoardData());

      // Register the user
      const res = await axios.post(
        `${API_URL}/auth/register`,
        pendingSignupData,
      );

      // Store token if provided
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      alert(res.data.message || "Registration Successful");
      navigate("/dashboard");
      setShowSaveDialog(false);
      setPendingSignupData(null);
    } catch (error: unknown) {
      let errorMessage = "Registration failed";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSaveDialog = () => {
    setShowSaveDialog(false);
    setPendingSignupData(null);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear error on change
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    setMyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return {
    handleChange,
    handleSubmit,
    myForm,
    loading,
    errors,
    showSaveDialog,
    handleSaveGuestBoard,
    handleDiscardGuestBoard,
    handleCancelSaveDialog,
  };
}
