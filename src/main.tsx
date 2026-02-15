import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from "./App.tsx";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
    console.error("Missing Google Client ID in .env");
} else {
    // Debugging: Log the first few characters to verify it's loaded (don't log full secret if it was one, but Client ID is public-ish)
    console.log("Google Client ID loaded:", googleClientId.substring(0, 10) + "...");
}

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId || ""}>
        <App />
    </GoogleOAuthProvider>
);