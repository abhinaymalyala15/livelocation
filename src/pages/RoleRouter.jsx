import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Loader from "../components/tracking/Loader";

export default function RoleRouter() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isLoadingAuth || !user) return;
    if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/driver", { replace: true });
    }
  }, [navigate, user, isLoadingAuth]);

  return <Loader text="Redirecting..." className="h-screen" />;
}