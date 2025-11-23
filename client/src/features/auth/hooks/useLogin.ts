import { useState } from "react";
import { useNavigate } from "react-router";
import type { LoginFormType } from "../types/types";
import axios from "axios";
import { getData } from "../../../context/userContext";

export function useLogin() {
  const [myForm, setMyForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });

  const { login } = getData();

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login(myForm);
      navigate("/dashboard");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Login Failed");
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
