import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, Shield, Route, Eye, EyeOff, Mail, Lock, Navigation, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { apiRegisterDriver, apiLookupUser, checkApiHealth } from "@/api/authApi";
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const [existingAccount, setExistingAccount] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupRequestRef = useRef(0);
  const { login, isAuthenticated, user, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resetExistingLookup = useCallback(() => {
    setExistingAccount(null);
    setDisplayName("");
  }, []);

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
  }, [isAuthenticated, isLoadingAuth, user, navigate, searchParams]);

  const checkExistingAccount = useCallback(async () => {
    if (mode !== "register" || !isValidEmail(email) || password.length < 4) {
      if (mode === "register" && !isValidEmail(email)) resetExistingLookup();
      return;
    }

    const requestId = ++lookupRequestRef.current;
    setLookingUp(true);
    setError("");

    try {
      const result = await apiLookupUser(email.trim().toLowerCase());
      if (requestId !== lookupRequestRef.current) return;

      if (result.exists && result.user) {
        setExistingAccount(result);
        setDisplayName(result.user.display_name || result.user.name || "");
      } else {
        setExistingAccount(null);
      }
    } catch {
      if (requestId === lookupRequestRef.current) setExistingAccount(null);
    } finally {
      if (requestId === lookupRequestRef.current) setLookingUp(false);
    }
  }, [mode, email, password, displayName, resetExistingLookup]);

  useEffect(() => {
    if (mode !== "register") return undefined;
    const timer = setTimeout(checkExistingAccount, 400);
    return () => clearTimeout(timer);
  }, [mode, email, password, checkExistingAccount]);

  const handleEmailChange = (value) => {
    setEmail(value);
    setError("");
    if (mode === "register") resetExistingLookup();
  };

  const handleModeChange = (next) => {
    setMode(next);
    setError("");
    resetExistingLookup();
  };

  const navigateAfterLogin = (loggedIn) => {
    const returnTo = searchParams.get("return");
    if (returnTo && returnTo !== "/login") navigate(returnTo, { replace: true });
    else if (loggedIn?.role === "admin") navigate("/admin", { replace: true });
    else navigate("/driver", { replace: true });
  };

  const normalizedEmail = email.trim().toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        if (existingAccount?.exists) {
          const loggedIn = await login(normalizedEmail, password);
          toast.success(`Welcome back, ${loggedIn.display_name || loggedIn.name}`);
          navigateAfterLogin(loggedIn);
          return;
        }

        if (!displayName.trim()) {
          setError("Enter your display name");
          setSubmitting(false);
          return;
        }

        try {
          await apiRegisterDriver({
            email: normalizedEmail,
            password,
            display_name: displayName.trim(),
          });
          toast.success("Account created — signing you in…");
        } catch (err) {
          if (err.status === 409) {
            const loggedIn = await login(normalizedEmail, password);
            toast.success(`Welcome back, ${loggedIn.display_name || loggedIn.name}`);
            navigateAfterLogin(loggedIn);
            return;
          }
          throw err;
        }
      }

      const loggedIn = await login(normalizedEmail, password);
      if (mode === "register") {
        toast.success("Account ready — opening your dashboard");
      }
      navigateAfterLogin(loggedIn);
    } catch (err) {
      if (existingAccount?.exists) {
        setError("Wrong password for this account. Try again or use Sign in.");
      } else {
        setError(err.message || "Sign in failed. Check email and password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fleetSummary = existingAccount?.fleet;
  const vehicleLabel = fleetSummary?.vehicles?.[0]?.vehicle_name;
  const isExistingDriver = mode === "register" && existingAccount?.exists;

  return (
    <motion.div className="min-h-screen flex">
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
            Hitech City to RGIA — live maps, trip playback, geofences, and real driver GPS data.
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

      <motion.div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gradient-to-b from-background to-muted/30 relative">
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

          <motion.div className="surface-card p-7 sm:p-8 space-y-6 shadow-xl border-border/80 ring-1 ring-black/[0.03]">
            {apiOk === false && (
              <motion.div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                API server is offline. In the project folder run{" "}
                <code className="font-mono text-xs">npm run dev</code>, then open{" "}
                <code className="font-mono text-xs">http://127.0.0.1:5173</code>.
              </motion.div>
            )}
            <motion.div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {mode === "login" ? "Sign in" : isExistingDriver ? "Welcome back" : "Driver registration"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "login"
                  ? "Admin or driver account"
                  : isExistingDriver
                    ? "Your saved profile and trips will open after you continue"
                    : "Your name will appear on the admin dashboard"}
              </p>
            </motion.div>

            <motion.div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <Button type="button" variant={mode === "login" ? "default" : "ghost"} size="sm" onClick={() => handleModeChange("login")}>
                Sign in
              </Button>
              <Button type="button" variant={mode === "register" ? "default" : "ghost"} size="sm" onClick={() => handleModeChange("register")}>
                New driver
              </Button>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <motion.div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={mode === "register" ? checkExistingAccount : undefined}
                    className="h-12 pl-10 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary/50"
                    required
                    autoComplete="email"
                  />
                </motion.div>
              </motion.div>

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
                    onBlur={mode === "register" ? checkExistingAccount : undefined}
                    className="h-12 pl-10 pr-11 rounded-xl border-border/80 bg-muted/30 focus-visible:ring-primary/25"
                    placeholder={mode === "register" && !isExistingDriver ? "Choose a password" : "Password"}
                    required
                    minLength={4}
                    autoComplete={mode === "register" && !isExistingDriver ? "new-password" : "current-password"}
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

              {mode === "register" && isExistingDriver && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 px-3 py-3 text-sm space-y-1.5"
                >
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Account found — saved data ready
                  </p>
                  <p>
                    Name: <strong>{displayName}</strong>
                    {vehicleLabel ? (
                      <>
                        {" "}
                        · Vehicle: <strong>{vehicleLabel}</strong>
                      </>
                    ) : null}
                  </p>
                  {(fleetSummary?.activeTrips > 0 || fleetSummary?.locationLogCount > 0) && (
                    <p className="text-xs text-emerald-800/90">
                      {fleetSummary.activeTrips > 0 && `${fleetSummary.activeTrips} active trip`}
                      {fleetSummary.activeTrips > 0 && fleetSummary.locationLogCount > 0 && " · "}
                      {fleetSummary.locationLogCount > 0 &&
                        `${fleetSummary.locationLogCount} GPS points saved`}
                    </p>
                  )}
                  <p className="text-xs text-emerald-800/80">
                    Continue with your password to open your driver dashboard.
                  </p>
                </motion.div>
              )}

              {mode === "register" && !isExistingDriver && (
                <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Label htmlFor="displayName">Your name (shown to admin) *</Label>
                  <motion.div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 pl-10 rounded-xl"
                      placeholder="e.g. Rahul Sharma"
                      required={!isExistingDriver}
                      disabled={lookingUp}
                    />
                  </motion.div>
                </motion.div>
              )}

              {mode === "register" && isExistingDriver && (
                <motion.div className="space-y-2">
                  <Label htmlFor="displayNameExisting">Your name (saved)</Label>
                  <motion.div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayNameExisting"
                      value={displayName}
                      readOnly
                      className="h-12 pl-10 rounded-xl bg-muted/50"
                    />
                  </motion.div>
                </motion.div>
              )}

              {(error || (authError?.type === "login_failed" && authError.message)) && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2.5">
                  {error || authError.message}
                </p>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-base shadow-md" disabled={submitting || lookingUp}>
                {submitting
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : isExistingDriver
                      ? "Open my account"
                      : "Create driver account"}
              </Button>
            </form>
          </motion.div>

          <p className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
            <span className="block font-medium text-foreground/80 mb-1">Admin login</span>
            admin@fleet.com / admin123
            <span className="block font-medium text-foreground/80 mt-3 mb-1">Drivers</span>
            Enter <strong>email</strong> and <strong>password</strong> first. If you already registered, your saved name and trips load automatically.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
