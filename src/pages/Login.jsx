import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, Shield, Route, Eye, EyeOff, Mail, Lock, Navigation } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HyderabadMapIllustration from "@/components/tracking/HyderabadMapIllustration";
import { LiveBadge } from "@/components/tracking/LiveIndicator";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Login() {
  const [email, setEmail] = useState("admin@fleet.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("demo");
    setError("");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — brand + illustration */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[46%] flex-col justify-between p-10 xl:p-14 text-white relative overflow-hidden bg-[#0c1222]">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(168,76%,22%)]/40 via-transparent to-[hsl(222,47%,8%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,hsl(168,76%,42%/0.35),transparent_60%)]" />
        <HyderabadMapIllustration />

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-xl shadow-primary/30 ring-2 ring-white/10">
            <Map className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight block">FleetTrack</span>
            <span className="text-[11px] text-white/50 uppercase tracking-widest">Hyderabad Operations</span>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show" className="relative z-10 space-y-5 max-w-lg">
          <LiveBadge label="Live fleet · TS registered vehicles" className="bg-white/10 border-white/20 text-white" />
          <h1 className="text-3xl xl:text-[2.5rem] font-semibold leading-[1.15] tracking-tight">
            Track every kilometre across Hyderabad.
          </h1>
          <p className="text-white/55 text-sm leading-relaxed">
            Hitech City to RGIA — live maps, trip playback, geofences, and realistic fleet demo data built for your submission.
          </p>
          <ul className="grid gap-3 text-sm text-white/80">
            {[
              { icon: Navigation, text: "Hitech City · Gachibowli · Secunderabad routes" },
              { icon: Route, text: "Trip history with distance logs & playback" },
              { icon: Shield, text: "Geofence alerts for depots & airport" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="relative z-10 text-xs text-white/30">FleetTrack · Telangana fleet demo</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gradient-to-b from-background to-muted/30 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] relative z-10"
        >
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Map className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg block">FleetTrack</span>
              <span className="text-xs text-muted-foreground">Hyderabad fleet</span>
            </div>
          </div>

          <div className="surface-card p-7 sm:p-8 space-y-6 shadow-xl border-border/80 ring-1 ring-black/[0.03]">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground">Access your fleet command centre</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={email === "admin@fleet.com" ? "default" : "outline"}
                size="sm"
                className="h-10 text-xs font-medium"
                onClick={() => fillDemo("admin@fleet.com")}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant={email === "driver@fleet.com" ? "default" : "outline"}
                size="sm"
                className="h-10 text-xs font-medium"
                onClick={() => fillDemo("driver@fleet.com")}
              >
                Driver
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Work email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-11 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25"
                    placeholder="Any password (demo)"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-base shadow-md" disabled={submitting}>
                {submitting ? "Signing in…" : "Enter dashboard"}
              </Button>
            </form>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Demo accounts with Hyderabad fleet data pre-loaded
          </p>
        </motion.div>
      </div>
    </div>
  );
}
