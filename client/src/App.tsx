import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import { Aurora } from "./components/Aurora";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { useAuth } from "./store/auth";

export default function App() {
  const { user, booting, boot } = useAuth();
  useEffect(() => { void boot(); }, [boot]);

  return (
    <>
      <Aurora />
      <Toaster position="top-center" toastOptions={{ style: { background: "#1a1730", color: "#fff", border: "1px solid rgb(255 255 255 / .1)", borderRadius: "999px" } }} />
      {booting ? (
        <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-violet" size={32} aria-label="Loading" /></div>
      ) : (
        <Routes>
          <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
