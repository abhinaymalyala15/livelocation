import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, Shield, Route, Eye, EyeOff, Mail, Lock, Navigation, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { checkApiHealth } from "@/api/authApi";
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
  const [roleTab, setRoleTab] = useState("driver"); // drivers: name only — use this tab
  const [driverName, setDriverName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const { login, isAuthenticated, user, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkApiHealth().then(setApiOk).catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user && !submitting) {
      const returnTo = searchParams.get("return");
      if (returnTo && returnTo !== "/login") navigate(returnTo, { replace: true });
      else if (user.role === "admin") navigate("/admin", { replace: true });
      else navigate("/driver", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate, searchParams, submitting]);

  const navigateAfterLogin = (loggedIn) => {
    const returnTo = searchParams.get("return");
    if (returnTo && returnTo !== "/login") navigate(returnTo, { replace: true });
    else if (loggedIn?.role === "admin") navigate("/admin", { replace: true });
    else navigate("/driver", { replace: true });
  };

  const driverNameLooksLikeEmail = driverName.trim().includes("@");
  const adminFieldLooksLikeName = email.trim().length > 0 && !email.trim().includes("@");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const identifier = (roleTab === "admin" ? email : driverName).trim();
      const loggedIn = identifier.includes("@")
        ? await login(identifier.toLowerCase(), password)
        : await login(identifier, password, { asDriver: true });
      navigateAfterLogin(loggedIn);
    } catch (err) {
      const identifier = (roleTab === "admin" ? email : driverName).trim();
      setError(
        err.message ||
          (identifier.includes("@")
            ? "Invalid email or password."
            : "Invalid name or password. Check the name and password from Admin → Drivers.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (tab) => {
    if (tab === "admin" && driverName.trim()) {
      setEmail(driverName.trim());
    }
    if (tab === "driver" && email.trim()) {
      setDriverName(email.trim());
    }
    setRoleTab(tab);
    setError("");
  };

  return (
    <motion.div className="min-h-[100dvh] flex flex-col lg:flex-row app-viewport">
      <motion.div className="hidden lg:flex lg:w-[48%] xl:w-[46%] flex-col justify-between p-10 xl:p-14 text-white relative overflow-hidden bg-[#0c1222]">
        <motion.div className="absolute inset-0 bg-gradient-to-br from-[hsl(168,76%,22%)]/40 via-transparent to-[hsl(222,47%,8%)]" />
        <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,hsl(168,76%,42%/0.35),transparent_60%)]" />
        <HyderabadMapIllustration />

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative z-10 flex items-center gap-3">
          <motion.div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-xl shadow-primary/30 ring-2 ring-white/10">
            <Map className="h-6 w-6 text-white" />
          </motion.div>
          <motion.div>
            <span className="font-bold text-xl tracking-tight block">FleetTrack</span>
            <span className="text-[11px] text-white/50 uppercase tracking-widest">Hyderabad Operations</span>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show" className="relative z-10 space-y-5 max-w-lg">
          <LiveBadge label="Live fleet · TS registered vehicles" className="bg-white/10 border-white/20 text-white" />
          <h1 className="text-3xl xl:text-[2.5rem] font-semibold leading-[1.15] tracking-tight">
            Track every kilometre across Hyderabad.
          </h1>
          <p className="text-white/55 text-sm leading-relaxed">
            Admin creates driver accounts. Drivers sign in with the name and password from the admin panel.
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

        <p className="relative z-10 text-xs text-white/30">FleetTrack · Live fleet operations</p>
      </motion.div>

      <motion.div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-10 safe-top safe-bottom bg-gradient-to-b from-background to-muted/30 relative overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] relative z-10"
        >
          <motion.div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <motion.div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Map className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <motion.div>
              <span className="font-bold text-lg block">FleetTrack</span>
              <span className="text-xs text-muted-foreground">Hyderabad fleet</span>
            </motion.div>
          </motion.div>

          <motion.div className="surface-card p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6 shadow-xl border-border/80 ring-1 ring-black/[0.03]">
            {apiOk === false && (
              <motion.div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                API server is offline. Run <code className="font-mono text-xs">npm run dev</code>, then open{" "}
                <code className="font-mono text-xs">http://127.0.0.1:5173</code>.
              </motion.div>
            )}

            <motion.div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground">
                {roleTab === "driver"
                  ? "Use the name and password your admin created"
                  : "Fleet administrator account"}
              </p>
            </motion.div>

            <motion.div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <Button
                type="button"
                variant={roleTab === "driver" ? "default" : "ghost"}
                className="h-11 sm:h-10"
                onClick={() => handleTabChange("driver")}
              >
                Driver
              </Button>
              <Button
                type="button"
                variant={roleTab === "admin" ? "default" : "ghost"}
                className="h-11 sm:h-10"
                onClick={() => handleTabChange("admin")}
              >
                Admin
              </Button>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {roleTab === "driver" ? (
                <motion.div className="space-y-2">
                  <Label htmlFor="driverName" className="text-xs font-medium text-muted-foreground">
                    Your name
                  </Label>
                  <motion.div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="driverName"
                      type="text"
                      value={driverName}
                      onChange={(e) => {
                        setDriverName(e.target.value);
                        setError("");
                      }}
                      className="h-12 pl-10 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary/50"
                      placeholder="e.g. Rahul Sharma"
                      required
                      autoComplete="username"
                    />
                  </motion.div>
                  {driverNameLooksLikeEmail && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      This looks like an admin email. Use the <strong>Admin</strong> tab, or press Sign in — we will
                      use admin login automatically.
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                    Admin email
                  </Label>
                  <motion.div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className="h-12 pl-10 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary/50"
                      placeholder="admin@fleet.com"
                      required
                      autoComplete="username"
                    />
                  </motion.div>
                  {adminFieldLooksLikeName && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Driver accounts use a <strong>name</strong>, not email. Switch to the <strong>Driver</strong> tab, or
                      press Sign in — we will sign you in as a driver automatically.
                    </p>
                  )}
                </motion.div>
              )}

              <motion.div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                <motion.div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="h-12 pl-10 pr-11 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25"
                    required
                    minLength={4}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </motion.div>
              </motion.div>

              {(error || (authError?.type === "login_failed" && authError.message)) && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2.5">
                  {error || authError.message}
                </p>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-base shadow-md" disabled={submitting}>
                {submitting ? "Please wait…" : "Sign in"}
              </Button>
            </form>
          </motion.div>

          <p className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
            <span className="block font-medium text-foreground/80 mb-1">Drivers</span>
            Use the <strong>Driver</strong> tab — enter your <strong>name</strong> and password from Admin → Drivers (no @ needed).
            <span className="block font-medium text-foreground/80 mt-3 mb-1">Admin</span>
            Use the <strong>Admin</strong> tab — email <strong>admin@fleet.com</strong> / password <strong>admin123</strong>
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
