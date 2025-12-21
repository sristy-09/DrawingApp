import { useState } from "react";
import type { SignUpFormType } from "../types/types";
import { useNavigate } from "react-router";
import axios from "axios";

export function useSignup() {
  const [myForm, setMyForm] = useState<SignUpFormType>({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Client-side validation
      if (!myForm.username.trim()) {
        throw new Error("Username is required");
      }
      if (!myForm.email.trim()) {
        throw new Error("Email is required");
      }
      if (!myForm.password) {
        throw new Error("Password is required");
      }
      if (myForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const res = await axios.post("/auth/register", myForm);
      
      // Store token if provided
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      alert(res.data.message || "Registration Successful");
      navigate("/");
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

      setError(errorMessage);
      console.error("Registration error:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setError(""); // Clear error when user starts typing

    setMyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return { handleChange, handleSubmit, myForm, error, loading };
}
