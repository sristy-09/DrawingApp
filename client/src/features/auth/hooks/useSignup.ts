import { useState } from "react";
import type { FormErrors, SignUpFormType } from "../types/types";
import { useNavigate } from "react-router";
import axios from "axios";
import { signupSchema } from "../signupSchema";

export function useSignup() {
  const [myForm, setMyForm] = useState<SignUpFormType>({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [errors, setErrors] = useState<FormErrors>({});

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

    try {
      const res = await axios.post("/auth/register", myForm);

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

  return { handleChange, handleSubmit, myForm, loading, errors };
}
