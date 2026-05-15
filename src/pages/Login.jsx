import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Map, Shield, Route } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("admin@fleet.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user) {
      const returnTo = searchParams.get("return");
      if (returnTo && returnTo !== "/login") navigate(returnTo, { replace: true });
      else if (user.role === "admin") navigate("/admin", { replace: true });
      else navigate("/driver", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      const returnTo = searchParams.get("return");
      if (returnTo && returnTo !== "/login") navigate(returnTo, { replace: true });
      else if (loggedIn?.role === "admin") navigate("/admin", { replace: true });
      else navigate("/driver", { replace: true });
    } catch {
      setError("Invalid email. Use admin@fleet.com or driver@fleet.com");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 bg-[hsl(222,47%,9%)] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,hsl(168,76%,36%/0.25),transparent)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,hsl(168,76%,36%/0.12),transparent)] translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">FleetTrack</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight">
            Fleet visibility, simplified.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Monitor vehicles on the live map, review trip routes, and manage geofences from one professional dashboard.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-3">
              <Map className="h-4 w-4 text-primary shrink-0" />
              Real-time vehicle tracking
            </li>
            <li className="flex items-center gap-3">
              <Route className="h-4 w-4 text-primary shrink-0" />
              Full trip route playback
            </li>
            <li className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              Geofence enter & exit alerts
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/40">Fleet management demo</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Map className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">FleetTrack</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-professional"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-professional"
                placeholder="Any password (demo)"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-10 font-medium" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-center lg:text-left text-muted-foreground pt-4 border-t border-border">
            Demo accounts: <span className="font-medium text-foreground">admin@fleet.com</span> ·{" "}
            <span className="font-medium text-foreground">driver@fleet.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
