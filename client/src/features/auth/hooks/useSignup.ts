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

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/register", myForm);
      alert(res.data.message || "Registration Successful");
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Registration Failed");
      } else {
        alert("An unexpected error occurred");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setMyForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return { handleChange, handleSubmit, myForm };
}
