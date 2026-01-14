import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { UserProvider } from "./features/core/context/userContext.tsx";
import axios from "axios";
import { ThemeProvider } from "./features/core/context/themeProvider.tsx";

// Configure axios base URL
axios.defaults.baseURL = "http://localhost:3000";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  </StrictMode>
);
