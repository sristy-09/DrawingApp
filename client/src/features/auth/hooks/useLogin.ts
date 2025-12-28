import { useState } from "react";
import { useNavigate } from "react-router";
import type { FormErrors, LoginFormType } from "../types/types";
import axios from "axios";
import { getData } from "../../core/context/userContext";
import { loginSchema } from "../loginSchema";

export function useLogin() {
  const [myForm, setMyForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const { login } = getData();

  const navigate = useNavigate();

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

  return { handleChange, handleSubmit, myForm, errors };
}
